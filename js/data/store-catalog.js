/*
 * Northwind Outfitters catalog.
 *
 * The first four entries are the original practice SKUs — widget, gadget,
 * gizmo, doohickey — at their original prices. They are load-bearing: the
 * regression suite adds Widget twice and Gadget once and asserts a $45.00
 * subtotal, and a learner's own tests may do the same. Their ids and prices
 * do not change.
 *
 * Everything after them exists to make the store behave like a store. Ten
 * products across three categories is enough for filtering, sorting, an
 * out-of-stock path, a sale price and an empty result set — all of which are
 * ordinary test surface that four bare buttons could not provide.
 */
window.STORE_CATALOGUE = [
  { id: "widget", name: "Widget", price: 10.00, category: "Hardware", rating: 4.2, reviews: 128, stock: 42 },
  { id: "gadget", name: "Gadget", price: 25.00, category: "Hardware", rating: 4.6, reviews: 341, stock: 17 },
  { id: "gizmo", name: "Gizmo", price: 5.99, category: "Hardware", rating: 3.4, reviews: 56, stock: 8, badge: "low" },
  { id: "doohickey", name: "Doohickey", price: 99.99, category: "Hardware", rating: 4.9, reviews: 12, stock: 3, badge: "low" },

  { id: "shell-jacket", name: "Trail Shell Jacket", price: 128.00, was: 160.00, category: "Apparel", rating: 4.7, reviews: 892, stock: 25, badge: "sale" },
  { id: "base-layer", name: "Merino Base Layer", price: 44.50, category: "Apparel", rating: 4.4, reviews: 415, stock: 60 },
  { id: "trail-cap", name: "Trail Cap", price: 22.00, category: "Apparel", rating: 4.0, reviews: 73, stock: 0 },

  { id: "dry-bag", name: "Dry Bag, 20L", price: 29.00, category: "Packs", rating: 4.5, reviews: 210, stock: 31 },
  { id: "day-pack", name: "Ridgeline Day Pack", price: 89.00, category: "Packs", rating: 4.8, reviews: 1204, stock: 12, badge: "new" },
  { id: "hip-belt", name: "Hip Belt Pouch", price: 18.50, was: 24.00, category: "Packs", rating: 3.9, reviews: 44, stock: 5, badge: "sale" }
];

window.STORE_COUPONS = {
  SAVE10: { pct: 0.10, label: "SAVE10 (10% off)" },
  HALFOFF: { pct: 0.50, label: "HALFOFF (50% off)" }
};
