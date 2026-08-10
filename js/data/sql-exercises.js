// Dataset + exercises for the SQL Sandbox.
// The data is deliberately shaped to contain the bugs a tester would hunt:
// an orphaned order, a NULL vs empty-string pair, and a status whose count
// disagrees with what a naive query returns.
window.SQL_DB = {
  users: [
    { id: 1, email: "ada@test.example",   name: "Ada Chen",    last_login: "2026-08-09", nickname: "ada",  plan: "pro" },
    { id: 2, email: "bob@acme.com",       name: "Bob Rossi",   last_login: null,         nickname: "",     plan: "free" },
    { id: 3, email: "cy@test.example",    name: "Cy Okafor",   last_login: "2026-07-02", nickname: null,   plan: "pro" },
    { id: 4, email: "dee@acme.com",       name: "Dee Patel",   last_login: "2026-08-10", nickname: "dee",  plan: "team" },
    { id: 5, email: "eli@test.example",   name: "Eli Novak",   last_login: null,         nickname: null,   plan: "free" },
    { id: 6, email: "contest@acme.com",   name: "Fay Ito",     last_login: "2026-06-21", nickname: "fay",  plan: "pro" }
  ],
  orders: [
    { id: 1001, user_id: 1,  total: 240.00,  status: "paid",    created_at: "2026-08-01" },
    { id: 1002, user_id: 1,  total: 1180.00, status: "overdue", created_at: "2026-08-04" },
    { id: 1003, user_id: 2,  total: 95.50,   status: "paid",    created_at: "2026-08-05" },
    { id: 1004, user_id: 4,  total: 320.00,  status: "draft",   created_at: "2026-08-07" },
    { id: 1005, user_id: 4,  total: 75.25,   status: "paid",    created_at: "2026-08-08" },
    { id: 1006, user_id: 99, total: 50.00,   status: "paid",    created_at: "2026-08-09" },
    { id: 1007, user_id: 3,  total: 0.00,    status: "refunded",created_at: "2026-08-10" }
  ],
  logs: [
    { id: 1, user_id: 1, action: "login",    created_at: "2026-08-09 09:12" },
    { id: 2, user_id: 4, action: "checkout", created_at: "2026-08-10 11:02" },
    { id: 3, user_id: 1, action: "logout",   created_at: "2026-08-09 17:45" },
    { id: 4, user_id: 3, action: "refund",   created_at: "2026-08-10 08:30" },
    { id: 5, user_id: 4, action: "login",    created_at: "2026-08-10 10:55" }
  ]
};

// `check` receives the engine result and returns true when the answer is right.
// Grading is on the RESULT, not the query text, so any correct approach passes.
window.SQL_EXERCISES = [
  {
    id: "verify-write",
    title: "Verify a record exists",
    brief: "The signup form claims it created an account for ada@test.example. Prove it.",
    teaches: "The most common verification query in daily testing.",
    hint: "SELECT * FROM users WHERE email = 'ada@test.example'",
    check: function (r) {
      return r.kind === "select" && r.rows.length === 1 && r.rows[0].email === "ada@test.example";
    }
  },
  {
    id: "null-vs-empty",
    title: "NULL is not an empty string",
    brief: "Find the users who have NEVER logged in. Exactly two rows — be careful which operator you use.",
    teaches: "IS NULL vs = '' — the distinction that produces real defects.",
    hint: "SELECT * FROM users WHERE last_login IS NULL",
    check: function (r) {
      if (r.kind !== "select" || r.rows.length !== 2) return false;
      var ids = r.rows.map(function (x) { return x.id; }).sort();
      return ids[0] === 2 && ids[1] === 5;
    }
  },
  {
    id: "join-related",
    title: "Follow a record across tables",
    brief: "List the order ids belonging to Ada. Join orders to users.",
    teaches: "Joining to verify a workflow wrote to more than one table.",
    hint: "SELECT o.id FROM orders o JOIN users u ON o.user_id = u.id WHERE u.email = 'ada@test.example'",
    check: function (r) {
      if (r.kind !== "select" || r.rows.length !== 2) return false;
      var vals = r.rows.map(function (row) {
        return row["o.id"] !== undefined ? row["o.id"] : row.id;
      }).sort();
      return vals[0] === 1001 && vals[1] === 1002;
    }
  },
  {
    id: "group-count",
    title: "Validate a dashboard aggregate",
    brief: "The dashboard shows a breakdown by order status. Produce the same counts.",
    teaches: "GROUP BY — how you prove a dashboard number is wrong.",
    hint: "SELECT status, COUNT(*) FROM orders GROUP BY status",
    check: function (r) {
      if (r.kind !== "select" || r.rows.length !== 4) return false;
      var paid = r.rows.filter(function (x) { return x.status === "paid"; })[0];
      if (!paid) return false;
      var count = paid["COUNT(*)"] !== undefined ? paid["COUNT(*)"] : paid.total;
      return Number(count) === 4;
    }
  },
  {
    id: "newest-row",
    title: "Find what your test just created",
    brief: "Return the three most recent log entries, newest first.",
    teaches: "ORDER BY … DESC LIMIT n — the verification workhorse.",
    hint: "SELECT * FROM logs ORDER BY created_at DESC LIMIT 3",
    check: function (r) {
      return r.kind === "select" && r.rows.length === 3 && r.rows[0].id === 2;
    }
  },
  {
    id: "orphan-hunt",
    title: "Find the orphaned order",
    brief: "One order references a user that doesn't exist — a real data-integrity bug. Find it with a LEFT JOIN.",
    teaches: "LEFT JOIN + IS NULL: the highest-value join for a tester.",
    hint: "SELECT o.id FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE u.id IS NULL",
    check: function (r) {
      if (r.kind !== "select" || r.rows.length !== 1) return false;
      var row = r.rows[0];
      var id = row["o.id"] !== undefined ? row["o.id"] : row.id;
      return id === 1006;
    }
  },
  {
    id: "safe-cleanup",
    title: "Scope a cleanup safely",
    brief: "Select the test accounts you'd delete. Use the reserved @test.example domain — and note that a naive '%test%' would also match contest@acme.com, a real user.",
    teaches: "Why the SELECT-first rule exists, and why LIKE patterns need care.",
    hint: "SELECT * FROM users WHERE email LIKE '%@test.example'",
    check: function (r) {
      if (r.kind !== "select" || r.rows.length !== 3) return false;
      return r.rows.every(function (x) { return String(x.email).indexOf("@test.example") > -1; });
    }
  },
  {
    id: "duplicates",
    title: "Find duplicates",
    brief: "Which plans have more than one user on them? Return the plan and its count.",
    teaches: "GROUP BY … HAVING — filtering groups rather than rows.",
    hint: "SELECT plan, COUNT(*) FROM users GROUP BY plan HAVING COUNT(*) > 1",
    check: function (r) {
      if (r.kind !== "select" || r.rows.length !== 2) return false;
      var plans = r.rows.map(function (x) { return x.plan; }).sort();
      return plans[0] === "free" && plans[1] === "pro";
    }
  }
];
