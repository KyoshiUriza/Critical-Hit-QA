/*
 * Northwind Outfitters storefront — shared by the clean and the buggy build.
 *
 * One implementation, two builds. The buggy page sets window.STORE_DEFECTS
 * before loading this file and gets the same storefront with specific rules
 * broken. That matters more than it sounds: when the two builds are separate
 * copies they drift, and a learner comparing them ends up comparing layout
 * instead of behaviour. Here the ONLY difference between the builds is the
 * list of defect ids.
 *
 * Everything is built with createElement/textContent. Product names, prices
 * and coupon codes are data, and a site that teaches testing should not be
 * interpolating data into innerHTML.
 *
 * Every data-testid the original four-button version exposed still exists
 * here on the equivalent control; tests/testid-contract.spec.js enforces it.
 */
(function () {
  "use strict";

  var TAX_RATE = 0.08;
  var SHIPPING = 5.99;
  var FREE_SHIP_MIN = 50;

  var PRODUCTS = window.STORE_CATALOGUE || [];
  var COUPONS = window.STORE_COUPONS || {};
  var DEFECTS = window.STORE_DEFECTS || {};

  function broken(id) { return DEFECTS[id] === true; }
  function found(id) { if (window.Detector) window.Detector.trigger(id); }

  var cart = {};
  var coupon = null;
  var filters = { category: "All", inStockOnly: false, sort: "featured", query: "" };
  var step = "basket";

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function tid(node, id) { node.setAttribute("data-testid", id); return node; }
  function byId(id) { return document.getElementById(id); }

  function money(n) { return "$" + n.toFixed(2); }

  // DEFECT (money-rounding): the line total, and only the line total, skips
  // the formatter — so 3 x $5.99 renders as $17.970000000000002 while every
  // other figure on the page is clean. Scoped deliberately: "some money is
  // formatted and some is not" is the realistic version and it is much harder
  // to spot than a page where every number is wrong.
  function lineMoney(n) {
    return broken("money-rounding") ? "$" + n : "$" + n.toFixed(2);
  }

  // ── Catalogue ───────────────────────────────────────────────────────
  function visibleProducts() {
    var out = PRODUCTS.filter(function (p) {
      if (filters.category !== "All" && p.category !== filters.category) return false;
      if (filters.inStockOnly && p.stock === 0) return false;
      if (filters.query && p.name.toLowerCase().indexOf(filters.query.toLowerCase()) === -1) return false;
      return true;
    });
    if (filters.sort === "price-asc") out.sort(function (a, b) { return a.price - b.price; });
    else if (filters.sort === "price-desc") out.sort(function (a, b) { return b.price - a.price; });
    else if (filters.sort === "rating") out.sort(function (a, b) { return b.rating - a.rating; });
    return out;
  }

  function productCard(p) {
    var card = el("article", "prod-card");
    tid(card, "product-" + p.id);

    if (p.badge) {
      card.appendChild(el("span", "app-badge app-badge-" + p.badge,
        p.badge === "sale" ? "SALE" : p.badge === "new" ? "NEW" : "LOW STOCK"));
    }

    card.appendChild(window.AppShell.productArt(p.id, p.name));

    var info = el("div", "prod-info");
    info.appendChild(tid(el("h4", "prod-title", p.name), "product-name-" + p.id));
    info.appendChild(el("div", "prod-meta", p.category));
    info.appendChild(window.AppShell.rating(p.rating, p.reviews));

    var price = el("div", "prod-price");
    price.appendChild(tid(el("span", null, "$" + p.price.toFixed(2)), "price-" + p.id));
    if (p.was) {
      var was = el("span", "prod-was", "$" + p.was.toFixed(2));
      was.setAttribute("aria-label", "was $" + p.was.toFixed(2));
      price.appendChild(was);
    }
    info.appendChild(price);
    info.appendChild(tid(el("div", "prod-meta",
      p.stock === 0 ? "Out of stock" : p.stock + " in stock"), "stock-" + p.id));
    card.appendChild(info);

    var actions = el("div", "prod-actions");
    var add = el("button", "btn btn-primary btn-sm", p.stock === 0 ? "Out of stock" : "Add to basket");
    add.type = "button";
    add.setAttribute("data-add", p.id);
    if (p.stock === 0) add.disabled = true;
    tid(add, "add-" + p.id);
    actions.appendChild(add);
    card.appendChild(actions);
    return card;
  }

  function renderProducts() {
    var grid = byId("product-grid");
    grid.textContent = "";
    var list = visibleProducts();

    var count = byId("result-count");
    if (count) count.textContent = list.length + " of " + PRODUCTS.length + " products";

    if (!list.length) {
      var empty = el("div", "app-empty");
      tid(empty, "no-results");
      empty.appendChild(el("h4", null, "Nothing matches those filters"));
      empty.appendChild(el("p", null, "Try widening the category or clearing the search."));
      grid.appendChild(empty);
      return;
    }
    list.forEach(function (p) { grid.appendChild(productCard(p)); });
  }

  // ── Totals ──────────────────────────────────────────────────────────
  function totals() {
    var items = Object.keys(cart).map(function (k) { return cart[k]; });
    var subtotal = items.reduce(function (n, it) { return n + it.product.price * it.qty; }, 0);
    var discount = coupon ? subtotal * COUPONS[coupon].pct : 0;
    var afterDiscount = subtotal - discount;

    // DEFECT (tax-basis): tax on the raw subtotal, so the customer is taxed
    // on money they were never charged.
    var tax = (broken("tax-basis") ? subtotal : afterDiscount) * TAX_RATE;

    // DEFECT (shipping-basis): free shipping earned on the pre-discount
    // figure, so an order that does not qualify still ships free.
    var shipBase = broken("shipping-basis") ? subtotal : afterDiscount;
    var shipping = shipBase >= FREE_SHIP_MIN ? 0 : SHIPPING;

    var total = afterDiscount + tax + shipping;

    if (discount > 0 && broken("tax-basis")) found("tax-basis");
    if (broken("shipping-basis") && subtotal >= FREE_SHIP_MIN && afterDiscount < FREE_SHIP_MIN) {
      found("shipping-basis");
    }
    // Detect the condition the user can actually see: the unformatted value
    // renders differently from the formatted one. An epsilon was tried first
    // and was wrong — 5 x $5.99 leaves a residue of about 5e-13, comfortably
    // under any threshold worth writing, yet it renders as
    // 29.950000000000003 and is glaringly visible.
    if (broken("money-rounding") && items.some(function (it) {
      var line = it.product.price * it.qty;
      return String(line) !== line.toFixed(2);
    })) {
      found("money-rounding");
    }

    return { items: items, subtotal: subtotal, discount: discount, tax: tax, shipping: shipping, total: total };
  }

  // ── Basket ──────────────────────────────────────────────────────────
  function lineItem(it) {
    var row = el("div", "line-item");
    tid(row, "cart-line-" + it.product.id);

    var art = window.AppShell.productArt(it.product.id, it.product.name);
    art.setAttribute("class", "line-item-media");
    row.appendChild(art);

    var mid = el("div");
    mid.appendChild(el("strong", null, it.product.name));
    mid.appendChild(el("div", "prod-meta", "$" + it.product.price.toFixed(2) + " each"));

    var stepper = el("div", "qty-stepper");
    var dec = el("button", null, "−");
    dec.type = "button";
    dec.setAttribute("aria-label", "Decrease quantity of " + it.product.name);
    dec.setAttribute("data-qty", "dec");
    dec.setAttribute("data-id", it.product.id);
    tid(dec, "dec-" + it.product.id);

    var out = document.createElement("output");
    out.textContent = String(it.qty);
    tid(out, "qty-" + it.product.id);

    var inc = el("button", null, "+");
    inc.type = "button";
    inc.setAttribute("aria-label", "Increase quantity of " + it.product.name);
    inc.setAttribute("data-qty", "inc");
    inc.setAttribute("data-id", it.product.id);
    tid(inc, "inc-" + it.product.id);

    stepper.append(dec, out, inc);
    mid.appendChild(stepper);
    row.appendChild(mid);

    var right = el("div");
    right.style.textAlign = "right";
    right.appendChild(tid(el("strong", "num", lineMoney(it.product.price * it.qty)),
      "line-" + it.product.id));
    var rm = el("button", "btn btn-ghost btn-sm", "Remove");
    rm.type = "button";
    rm.setAttribute("data-remove", it.product.id);
    rm.setAttribute("aria-label", "Remove " + it.product.name + " from basket");
    tid(rm, "remove-" + it.product.id);
    right.appendChild(rm);
    row.appendChild(right);
    return row;
  }

  function orderLine(label, valueNode, cls) {
    var row = el("div", cls || "order-line");
    row.appendChild(el("span", null, label));
    row.appendChild(valueNode);
    return row;
  }

  function renderCart() {
    var box = byId("cart-summary");
    box.textContent = "";
    var t = totals();

    window.AppShell.setCartCount(t.items.reduce(function (n, it) { return n + it.qty; }, 0));

    if (!t.items.length) {
      var empty = el("div", "app-empty");
      empty.appendChild(el("h4", null, "Your basket is empty"));
      empty.appendChild(tid(el("p", null, "Add something from the catalogue above."), "empty-cart"));
      box.appendChild(empty);
      return;
    }

    t.items.forEach(function (it) { box.appendChild(lineItem(it)); });

    var summary = el("div", "order-summary");
    summary.style.marginTop = "var(--sp-4)";
    summary.appendChild(orderLine("Subtotal", tid(el("span", "num", money(t.subtotal)), "subtotal")));
    if (coupon) {
      summary.appendChild(orderLine("Discount (" + COUPONS[coupon].label + ")",
        tid(el("span", "num", "−" + money(t.discount)), "discount")));
    }
    summary.appendChild(orderLine("Tax (8%)", tid(el("span", "num", money(t.tax)), "tax")));
    summary.appendChild(orderLine("Shipping",
      tid(el("span", "num", t.shipping === 0 ? "FREE" : money(t.shipping)), "shipping")));
    summary.appendChild(orderLine("Total",
      tid(el("span", "num", money(t.total)), "total"), "order-line order-line-total"));
    box.appendChild(summary);
  }

  // ── Checkout flow ───────────────────────────────────────────────────
  var STEPS = [
    { id: "basket", label: "Basket" },
    { id: "delivery", label: "Delivery" },
    { id: "payment", label: "Payment" },
    { id: "done", label: "Confirmation" }
  ];

  function showStep() {
    var ol = byId("checkout-steps");
    var current = 0;
    STEPS.forEach(function (s, i) { if (s.id === step) current = i; });

    if (ol) {
      ol.textContent = "";
      STEPS.forEach(function (s, i) {
        var li = el("li", "app-step");
        tid(li, "step-" + s.id);
        if (i === current) li.setAttribute("aria-current", "step");
        if (i < current) li.setAttribute("data-done", "true");
        li.appendChild(el("span", "app-step-num", i < current ? "✓" : String(i + 1)));
        li.appendChild(el("span", null, s.label));
        ol.appendChild(li);
      });
    }
    STEPS.forEach(function (s) {
      var pane = byId("pane-" + s.id);
      if (pane) pane.hidden = s.id !== step;
    });
  }

  function goTo(next) { step = next; showStep(); }

  function placeOrder() {
    var t = totals();
    var wasEmpty = t.items.length === 0;
    var hadCoupon = !!coupon;
    var ref = "NW-" + (100000 + t.items.length * 7919 + Math.round(t.total * 100));

    var box = byId("confirmation");
    box.textContent = "";
    box.appendChild(el("h3", null, "Order placed"));
    box.appendChild(tid(el("p", null, "Reference " + ref), "order-ref"));
    box.appendChild(tid(el("p", "prod-meta",
      t.items.length + " line(s), " + money(t.total) + " charged."), "order-total-line"));

    // The legacy result node. Its testid predates the multi-step flow and both
    // this suite and a learner's own tests use it, so it keeps its wording.
    var result = byId("checkout-result");
    result.className = "form-success";
    result.style.display = "block";
    result.textContent = "Order placed (simulated). Thank you!";

    cart = {};
    byId("coupon").value = "";

    // DEFECT (coupon-persists): the input is cleared and the applied discount
    // is not, so the next order silently reuses it.
    if (!broken("coupon-persists")) coupon = null;

    var cm = byId("coupon-msg");
    cm.className = "form-error";
    cm.style.display = "";
    // Regression: this banner used to survive checkout, so the next order
    // looked like it still carried a discount.
    if (!broken("coupon-persists")) cm.textContent = "";

    renderCart();
    goTo("done");
    window.AppShell.toast("Order " + ref + " confirmed", "success");

    if (wasEmpty) found("empty-checkout");
    if (hadCoupon && coupon) found("coupon-persists");
  }

  // ── Wiring ──────────────────────────────────────────────────────────
  function init() {
    var cats = ["All"].concat(PRODUCTS.map(function (p) { return p.category; })
      .filter(function (c, i, a) { return a.indexOf(c) === i; }));
    var catBox = byId("category-filters");
    if (catBox) {
      cats.forEach(function (c) {
        var label = el("label");
        var r = document.createElement("input");
        r.type = "radio"; r.name = "category"; r.value = c;
        if (c === "All") r.checked = true;
        tid(r, "filter-" + c.toLowerCase());
        r.addEventListener("change", function () { filters.category = c; renderProducts(); });
        label.append(r, document.createTextNode(" " + c));
        catBox.appendChild(label);
      });
    }

    var stockBox = byId("in-stock-only");
    if (stockBox) {
      stockBox.addEventListener("change", function () {
        filters.inStockOnly = stockBox.checked;
        renderProducts();
      });
    }

    var sort = byId("sort-by");
    if (sort) sort.addEventListener("change", function () { filters.sort = sort.value; renderProducts(); });

    var search = document.querySelector('[data-testid="app-search"]');
    if (search) {
      search.addEventListener("input", function () {
        filters.query = search.value.trim();
        renderProducts();
      });
    }

    byId("product-grid").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-add]");
      if (!btn) return;
      var id = btn.getAttribute("data-add");
      var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
      if (!p || p.stock === 0) return;
      if (!cart[id]) cart[id] = { product: p, qty: 0 };
      cart[id].qty += 1;
      renderCart();
      window.AppShell.toast(p.name + " added to your basket");
    });

    byId("cart-summary").addEventListener("click", function (e) {
      var target = e.target.closest("[data-remove],[data-qty]");
      if (!target) return;
      var removeId = target.getAttribute("data-remove");
      if (removeId) { delete cart[removeId]; renderCart(); return; }
      var qty = target.getAttribute("data-qty");
      var id = target.getAttribute("data-id");
      if (!qty || !id || !cart[id]) return;

      if (qty === "inc") {
        cart[id].qty += 1;
      } else {
        cart[id].qty -= 1;
        // DEFECT (negative-qty): the line stays in the basket at zero or below
        // instead of being removed.
        if (broken("negative-qty")) {
          if (cart[id].qty < 1) found("negative-qty");
        } else if (cart[id].qty <= 0) {
          delete cart[id];
        }
      }
      renderCart();
    });

    byId("apply-coupon").addEventListener("click", function () {
      // DEFECT (coupon-case): no normalisation, so a valid code in the wrong
      // case is rejected as invalid.
      var typed = byId("coupon").value.trim();
      var raw = broken("coupon-case") ? typed : typed.toUpperCase();
      var msg = byId("coupon-msg");

      if (!raw) {
        coupon = null;
        msg.textContent = "Coupon cleared.";
        msg.className = "form-error visible";
      } else if (raw === "EXPIRED" || raw.toUpperCase() === "EXPIRED") {
        coupon = null;
        msg.textContent = "This coupon has expired.";
        msg.className = "form-error visible";
      } else if (broken("coupon-case") && !COUPONS[raw] && COUPONS[raw.toUpperCase()]) {
        found("coupon-case");
        coupon = null;
        msg.textContent = "Invalid coupon code.";
        msg.className = "form-error visible";
      } else if (COUPONS[raw]) {
        coupon = raw;
        msg.textContent = "Applied " + COUPONS[raw].label + ".";
        msg.className = "form-success";
        msg.style.display = "block";
      } else {
        coupon = null;
        msg.textContent = "Invalid coupon code.";
        msg.className = "form-error visible";
      }
      renderCart();
    });

    // "Checkout" means what it means in every real store: go to checkout.
    // Placing the order is the button at the end of the flow.
    byId("checkout-btn").addEventListener("click", function () {
      var result = byId("checkout-result");
      // DEFECT (empty-checkout): no guard, so an empty basket enters checkout
      // and can be ordered.
      if (!Object.keys(cart).length && !broken("empty-checkout")) {
        result.className = "form-error visible";
        result.textContent = "Cart is empty. Add something first.";
        return;
      }
      result.className = "";
      result.textContent = "";
      goTo("delivery");
    });

    byId("to-payment").addEventListener("click", function () {
      var missing = ["ship-name", "ship-address", "ship-postcode"].filter(function (id) {
        return !byId(id).value.trim();
      });
      var err = byId("delivery-error");
      if (missing.length) {
        err.className = "form-error visible";
        err.textContent = "Fill in every delivery field before continuing.";
        return;
      }
      err.className = "form-error";
      err.textContent = "";
      goTo("payment");
    });

    byId("back-to-basket").addEventListener("click", function () { goTo("basket"); });
    byId("back-to-delivery").addEventListener("click", function () { goTo("delivery"); });
    byId("keep-shopping").addEventListener("click", function () { goTo("basket"); });

    byId("place-order").addEventListener("click", function () {
      var err = byId("payment-error");
      var num = byId("card-number").value.replace(/\s+/g, "");
      if (!/^\d{12,19}$/.test(num)) {
        err.className = "form-error visible";
        err.textContent = "Enter a card number between 12 and 19 digits.";
        return;
      }
      err.className = "form-error";
      err.textContent = "";
      placeOrder();
    });

    renderProducts();
    renderCart();
    showStep();
  }

  window.Store = {
    state: function () { return { cart: cart, coupon: coupon, step: step }; },
    totals: totals
  };

  document.addEventListener("DOMContentLoaded", init);
})();
