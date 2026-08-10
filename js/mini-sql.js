// A deliberately small SQL engine for the subset a QA engineer actually uses.
//
// Why hand-rolled: the site ships zero runtime dependencies, so pulling in
// sql.js (a ~1MB WASM build, loaded from a CDN) would break both the offline
// guarantee and the CSP. This covers SELECT / JOIN / WHERE / GROUP BY /
// ORDER BY / LIMIT / aggregates / DELETE — enough for every exercise here, and
// it fails loudly on anything outside that subset rather than pretending.
(function () {
  "use strict";

  function err(msg) { throw new Error(msg); }

  // ── Tokenizer ────────────────────────────────────────────────────────────
  function tokenize(sql) {
    var tokens = [];
    var re = /\s*(--[^\n]*|'(?:[^']|'')*'|>=|<=|!=|<>|[(),*=<>.;]|[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+)/g;
    var m;
    while ((m = re.exec(sql)) !== null) {
      var t = m[1];
      if (t.indexOf("--") === 0) continue;   // comment
      if (t === ";") continue;
      tokens.push(t);
    }
    return tokens;
  }

  function isString(t) { return typeof t === "string" && t.charAt(0) === "'"; }
  function unquote(t) { return t.slice(1, -1).replace(/''/g, "'"); }
  function isNumber(t) { return /^\d+(\.\d+)?$/.test(t); }

  // ── Parser ───────────────────────────────────────────────────────────────
  function Parser(tokens) {
    this.t = tokens;
    this.i = 0;
  }
  Parser.prototype.peek = function (n) { return this.t[this.i + (n || 0)]; };
  Parser.prototype.next = function () { return this.t[this.i++]; };
  Parser.prototype.isKw = function (kw, n) {
    var t = this.peek(n);
    return t && t.toUpperCase() === kw;
  };
  Parser.prototype.expectKw = function (kw) {
    if (!this.isKw(kw)) err("Expected " + kw + " but found " + (this.peek() || "end of query"));
    return this.next();
  };

  // column reference: name | table.name
  Parser.prototype.parseRef = function () {
    var a = this.next();
    if (this.peek() === ".") {
      this.next();
      return { table: a, column: this.next() };
    }
    return { table: null, column: a };
  };

  var AGGS = ["COUNT", "SUM", "AVG", "MIN", "MAX"];

  Parser.prototype.parseSelectItem = function () {
    var t = this.peek();
    if (t === "*") { this.next(); return { kind: "star" }; }

    var up = (t || "").toUpperCase();
    if (AGGS.indexOf(up) > -1 && this.peek(1) === "(") {
      this.next(); this.next(); // name, (
      var arg;
      if (this.peek() === "*") { this.next(); arg = { star: true }; }
      else arg = this.parseRef();
      if (this.peek() !== ")") err("Missing ) after " + up + "(");
      this.next();
      var item = { kind: "agg", fn: up, arg: arg, alias: null };
      if (this.isKw("AS")) { this.next(); item.alias = this.next(); }
      else if (this.peek() && /^[A-Za-z_]/.test(this.peek()) && !this.isReservedNext()) item.alias = this.next();
      return item;
    }

    var ref = this.parseRef();
    var col = { kind: "col", ref: ref, alias: null };
    if (this.isKw("AS")) { this.next(); col.alias = this.next(); }
    else if (this.peek() && /^[A-Za-z_]/.test(this.peek()) && !this.isReservedNext()) col.alias = this.next();
    return col;
  };

  var RESERVED = ["FROM","WHERE","GROUP","ORDER","LIMIT","JOIN","LEFT","INNER","RIGHT","ON","AND","OR","BY","AS","HAVING","DESC","ASC","IS","NOT","NULL","LIKE"];
  Parser.prototype.isReservedNext = function () {
    var t = this.peek();
    return !t || RESERVED.indexOf(t.toUpperCase()) > -1;
  };

  // ── Expression parsing (WHERE / ON) ──────────────────────────────────────
  Parser.prototype.parseOperand = function () {
    var t = this.peek();
    if (isString(t)) { this.next(); return { kind: "lit", value: unquote(t) }; }
    if (isNumber(t)) { this.next(); return { kind: "lit", value: parseFloat(t) }; }
    if (t && t.toUpperCase() === "NULL") { this.next(); return { kind: "lit", value: null }; }

    // HAVING operates on aggregated rows, so COUNT(*) etc. are valid operands.
    // They resolve against the aggregate's own output label.
    var up = (t || "").toUpperCase();
    if (AGGS.indexOf(up) > -1 && this.peek(1) === "(") {
      this.next(); this.next();
      var inner = this.peek() === "*" ? (this.next(), "*") : this.parseRef().column;
      if (this.peek() !== ")") err("Missing ) after " + up + "(");
      this.next();
      return { kind: "ref", ref: { table: null, column: up + "(" + inner + ")" } };
    }

    return { kind: "ref", ref: this.parseRef() };
  };

  Parser.prototype.parseCondition = function () {
    if (this.peek() === "(") {
      this.next();
      var inner = this.parseExpr();
      if (this.peek() !== ")") err("Missing closing )");
      this.next();
      return inner;
    }
    var left = this.parseOperand();

    if (this.isKw("IS")) {
      this.next();
      var negated = false;
      if (this.isKw("NOT")) { this.next(); negated = true; }
      this.expectKw("NULL");
      return { kind: "isnull", left: left, negated: negated };
    }
    if (this.isKw("NOT") && this.isKw("LIKE", 1)) {
      this.next(); this.next();
      return { kind: "like", left: left, right: this.parseOperand(), negated: true };
    }
    if (this.isKw("LIKE")) {
      this.next();
      return { kind: "like", left: left, right: this.parseOperand(), negated: false };
    }

    var op = this.next();
    if (["=", "!=", "<>", "<", ">", "<=", ">="].indexOf(op) === -1) {
      err("Unsupported operator: " + op);
    }
    return { kind: "cmp", op: op === "<>" ? "!=" : op, left: left, right: this.parseOperand() };
  };

  Parser.prototype.parseExpr = function () {
    var node = this.parseCondition();
    while (this.isKw("AND") || this.isKw("OR")) {
      var op = this.next().toUpperCase();
      var right = this.parseCondition();
      node = { kind: "logic", op: op, left: node, right: right };
    }
    return node;
  };

  Parser.prototype.parseSelect = function () {
    this.expectKw("SELECT");
    var items = [this.parseSelectItem()];
    while (this.peek() === ",") { this.next(); items.push(this.parseSelectItem()); }

    this.expectKw("FROM");
    var from = { table: this.next(), alias: null };
    if (this.peek() && !this.isReservedNext()) from.alias = this.next();

    var joins = [];
    while (this.isKw("JOIN") || this.isKw("INNER") || this.isKw("LEFT") || this.isKw("RIGHT")) {
      var type = "INNER";
      if (this.isKw("LEFT")) { this.next(); type = "LEFT"; if (this.isKw("OUTER")) this.next(); }
      else if (this.isKw("RIGHT")) { this.next(); type = "RIGHT"; if (this.isKw("OUTER")) this.next(); }
      else if (this.isKw("INNER")) { this.next(); }
      this.expectKw("JOIN");
      var jt = { type: type, table: this.next(), alias: null, on: null };
      if (this.peek() && !this.isReservedNext()) jt.alias = this.next();
      this.expectKw("ON");
      jt.on = this.parseExpr();
      joins.push(jt);
    }

    var where = null;
    if (this.isKw("WHERE")) { this.next(); where = this.parseExpr(); }

    var groupBy = [];
    if (this.isKw("GROUP")) {
      this.next(); this.expectKw("BY");
      groupBy.push(this.parseRef());
      while (this.peek() === ",") { this.next(); groupBy.push(this.parseRef()); }
    }

    var having = null;
    if (this.isKw("HAVING")) { this.next(); having = this.parseExpr(); }

    var orderBy = [];
    if (this.isKw("ORDER")) {
      this.next(); this.expectKw("BY");
      do {
        if (this.peek() === ",") this.next();
        var oref = this.parseRef();
        var dir = "ASC";
        if (this.isKw("DESC")) { this.next(); dir = "DESC"; }
        else if (this.isKw("ASC")) { this.next(); }
        orderBy.push({ ref: oref, dir: dir });
      } while (this.peek() === ",");
    }

    var limit = null;
    if (this.isKw("LIMIT")) { this.next(); limit = parseInt(this.next(), 10); }

    return { type: "select", items: items, from: from, joins: joins, where: where,
             groupBy: groupBy, having: having, orderBy: orderBy, limit: limit };
  };

  Parser.prototype.parseDelete = function () {
    this.expectKw("DELETE");
    this.expectKw("FROM");
    var table = this.next();
    var where = null;
    if (this.isKw("WHERE")) { this.next(); where = this.parseExpr(); }
    return { type: "delete", table: table, where: where };
  };

  function parse(sql) {
    var p = new Parser(tokenize(sql));
    if (!p.peek()) err("Empty query.");
    var up = p.peek().toUpperCase();
    if (up === "SELECT") return p.parseSelect();
    if (up === "DELETE") return p.parseDelete();
    err("Only SELECT and DELETE are supported here. Found: " + p.peek());
  }

  // ── Evaluation ───────────────────────────────────────────────────────────
  function resolve(row, ref) {
    var key = ref.table ? ref.table + "." + ref.column : ref.column;
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    if (!ref.table) {
      // unqualified: find a unique suffix match
      var hits = Object.keys(row).filter(function (k) {
        return k === ref.column || k.split(".").pop() === ref.column;
      });
      if (hits.length === 1) return row[hits[0]];
      if (hits.length > 1) err("Column '" + ref.column + "' is ambiguous — qualify it with a table name.");
    }
    err("Unknown column: " + key);
  }

  function likeToRegex(pattern) {
    var escaped = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("^" + escaped.replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
  }

  function evalOperand(row, node) {
    return node.kind === "lit" ? node.value : resolve(row, node.ref);
  }

  function evalExpr(row, node) {
    if (!node) return true;
    switch (node.kind) {
      case "logic": {
        var l = evalExpr(row, node.left);
        return node.op === "AND" ? (l && evalExpr(row, node.right)) : (l || evalExpr(row, node.right));
      }
      case "isnull": {
        var v = evalOperand(row, node.left);
        var isNull = v === null || v === undefined;
        return node.negated ? !isNull : isNull;
      }
      case "like": {
        var s = evalOperand(row, node.left);
        if (s === null || s === undefined) return false;
        var res = likeToRegex(evalOperand(row, node.right)).test(String(s));
        return node.negated ? !res : res;
      }
      case "cmp": {
        var a = evalOperand(row, node.left);
        var b = evalOperand(row, node.right);
        // SQL three-valued logic: any comparison with NULL is false.
        if (a === null || a === undefined || b === null || b === undefined) return false;
        switch (node.op) {
          case "=":  return a === b;
          case "!=": return a !== b;
          case "<":  return a < b;
          case ">":  return a > b;
          case "<=": return a <= b;
          case ">=": return a >= b;
        }
        return false;
      }
    }
    return false;
  }

  function qualify(rows, table, alias) {
    var name = alias || table;
    return rows.map(function (r) {
      var out = {};
      Object.keys(r).forEach(function (k) {
        out[name + "." + k] = r[k];
        out[k] = r[k];      // also expose unqualified for convenience
      });
      return out;
    });
  }

  function aggValue(fn, rows, arg) {
    if (fn === "COUNT") {
      if (arg.star) return rows.length;
      return rows.filter(function (r) {
        var v = resolve(r, arg);
        return v !== null && v !== undefined;
      }).length;
    }
    var nums = rows.map(function (r) { return resolve(r, arg); })
                   .filter(function (v) { return v !== null && v !== undefined; })
                   .map(Number);
    if (!nums.length) return null;
    switch (fn) {
      case "SUM": return nums.reduce(function (a, b) { return a + b; }, 0);
      case "AVG": return Math.round((nums.reduce(function (a, b) { return a + b; }, 0) / nums.length) * 100) / 100;
      case "MIN": return Math.min.apply(null, nums);
      case "MAX": return Math.max.apply(null, nums);
    }
    return null;
  }

  function itemLabel(item) {
    if (item.alias) return item.alias;
    if (item.kind === "agg") return item.fn + "(" + (item.arg.star ? "*" : item.arg.column) + ")";
    return item.ref.table ? item.ref.table + "." + item.ref.column : item.ref.column;
  }

  function run(db, sql) {
    var ast = parse(sql);

    if (ast.type === "delete") {
      var t = db[ast.table];
      if (!t) err("Unknown table: " + ast.table);
      var before = t.length;
      var kept = t.filter(function (r) { return !evalExpr(r, ast.where); });
      var deleted = before - kept.length;
      return { kind: "delete", table: ast.table, deleted: deleted, remaining: kept,
               warning: ast.where ? null : "No WHERE clause — this would empty the entire table." };
    }

    var base = db[ast.from.table];
    if (!base) err("Unknown table: " + ast.from.table);
    var rows = qualify(base, ast.from.table, ast.from.alias);

    ast.joins.forEach(function (j) {
      var right = db[j.table];
      if (!right) err("Unknown table: " + j.table);
      var rq = qualify(right, j.table, j.alias);
      var out = [];
      rows.forEach(function (l) {
        var matched = false;
        rq.forEach(function (r) {
          var merged = {};
          Object.keys(l).forEach(function (k) { merged[k] = l[k]; });
          Object.keys(r).forEach(function (k) { merged[k] = r[k]; });
          if (evalExpr(merged, j.on)) { out.push(merged); matched = true; }
        });
        if (!matched && j.type === "LEFT") {
          var nulled = {};
          Object.keys(l).forEach(function (k) { nulled[k] = l[k]; });
          if (rq[0]) Object.keys(rq[0]).forEach(function (k) { nulled[k] = null; });
          out.push(nulled);
        }
      });
      rows = out;
    });

    if (ast.where) rows = rows.filter(function (r) { return evalExpr(r, ast.where); });

    var columns, records;

    if (ast.groupBy.length) {
      var buckets = {};
      rows.forEach(function (r) {
        var key = ast.groupBy.map(function (g) { return String(resolve(r, g)); }).join(" ");
        (buckets[key] = buckets[key] || []).push(r);
      });
      columns = ast.items.map(itemLabel);
      records = Object.keys(buckets).map(function (k) {
        var group = buckets[k];
        var out = {};
        ast.items.forEach(function (item) {
          if (item.kind === "agg") out[itemLabel(item)] = aggValue(item.fn, group, item.arg);
          else if (item.kind === "star") err("SELECT * is not valid with GROUP BY.");
          else out[itemLabel(item)] = resolve(group[0], item.ref);
        });
        out.__group = group;
        return out;
      });
      if (ast.having) {
        records = records.filter(function (rec) {
          // HAVING can reference an aggregate the SELECT list omitted, so
          // compute those on the fly against the group's rows.
          var scope = {};
          Object.keys(rec).forEach(function (k) { if (k !== "__group") scope[k] = rec[k]; });
          // Only COUNT takes a star argument; SUM(*) and friends are not valid SQL.
          if (!("COUNT(*)" in scope)) scope["COUNT(*)"] = rec.__group.length;
          Object.keys(rec.__group[0] || {}).forEach(function (col) {
            if (col.indexOf(".") > -1) return;
            AGGS.forEach(function (fn) {
              var label = fn + "(" + col + ")";
              if (!(label in scope)) {
                try { scope[label] = aggValue(fn, rec.__group, { table: null, column: col }); } catch (_) {}
              }
            });
          });
          return evalExpr(scope, ast.having);
        });
      }
      records.forEach(function (r) { delete r.__group; });
    } else if (ast.items.some(function (i) { return i.kind === "agg"; })) {
      columns = ast.items.map(itemLabel);
      var one = {};
      ast.items.forEach(function (item) {
        one[itemLabel(item)] = item.kind === "agg" ? aggValue(item.fn, rows, item.arg) : resolve(rows[0] || {}, item.ref);
      });
      records = [one];
    } else if (ast.items.length === 1 && ast.items[0].kind === "star") {
      columns = rows.length
        ? Object.keys(rows[0]).filter(function (k) { return k.indexOf(".") === -1; })
        : Object.keys(base[0] || {});
      records = rows.map(function (r) {
        var o = {};
        columns.forEach(function (c) { o[c] = r[c]; });
        return o;
      });
    } else {
      columns = ast.items.map(itemLabel);
      records = rows.map(function (r) {
        var o = {};
        ast.items.forEach(function (item) { o[itemLabel(item)] = resolve(r, item.ref); });
        return o;
      });
    }

    if (ast.orderBy.length) {
      records.sort(function (a, b) {
        for (var i = 0; i < ast.orderBy.length; i++) {
          var o = ast.orderBy[i];
          var key = o.ref.table ? o.ref.table + "." + o.ref.column : o.ref.column;
          var av = Object.prototype.hasOwnProperty.call(a, key) ? a[key] : a[o.ref.column];
          var bv = Object.prototype.hasOwnProperty.call(b, key) ? b[key] : b[o.ref.column];
          if (av === bv) continue;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          var cmp = av < bv ? -1 : 1;
          return o.dir === "DESC" ? -cmp : cmp;
        }
        return 0;
      });
    }

    if (ast.limit !== null && !isNaN(ast.limit)) records = records.slice(0, ast.limit);

    return { kind: "select", columns: columns, rows: records };
  }

  window.MiniSQL = { run: run, parse: parse };
})();
