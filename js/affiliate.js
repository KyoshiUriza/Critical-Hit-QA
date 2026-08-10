/*
 * Amazon Associates link decoration.
 *
 * Book links are written into the HTML as plain, working Amazon URLs. This
 * file's only job is to append the Associates tracking ID to them and show the
 * disclosure that the tracking ID legally requires.
 *
 * Two deliberate properties:
 *
 *  1. The tag lives in ONE place. Adding it turns every book link on the site
 *     into an affiliate link; removing it turns them all back into plain links.
 *
 *  2. The tag and the disclosure are driven by the same condition, so the site
 *     cannot end up earning commission without disclosing it. That is not
 *     defensive coding for its own sake — undisclosed affiliate links violate
 *     both the Amazon Associates Operating Agreement and the FTC endorsement
 *     guides, and the penalty is account termination with forfeited earnings.
 *     Making the failure mode unreachable is cheaper than remembering.
 *
 * With no tag set, links still work and no disclosure appears, which is the
 * correct state for a site that is not monetised. That is also what a visitor
 * with JavaScript disabled gets, so it fails in the safe direction.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Paste the Amazon Associates tracking ID here to switch monetisation on.
  // It looks like "yourname-20" and comes from Amazon Associates ->
  // Account Settings -> Manage Your Tracking IDs. Nothing else needs editing.
  // ---------------------------------------------------------------------
  var ASSOCIATE_TAG = "";

  var DISCLOSURE =
    "As an Amazon Associate I earn from qualifying purchases. " +
    "Book links on this page are affiliate links — they cost you nothing extra, " +
    "and none of the recommendations were chosen because of them.";

  function tagUrl(url) {
    if (url.indexOf("tag=") !== -1) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "tag=" + encodeURIComponent(ASSOCIATE_TAG);
  }

  function decorate() {
    var links = document.querySelectorAll('a[data-affiliate="amazon"]');
    var i;

    if (!ASSOCIATE_TAG) {
      // Nothing to do. The hrefs in the HTML are already valid Amazon URLs.
      return;
    }

    for (i = 0; i < links.length; i++) {
      links[i].href = tagUrl(links[i].getAttribute("href"));
      // Google asks that monetised outbound links be marked sponsored. The
      // markup ships as "nofollow" so the value is accurate either way.
      links[i].rel = "sponsored noopener noreferrer";
    }

    var slots = document.querySelectorAll("[data-affiliate-disclosure]");
    for (i = 0; i < slots.length; i++) {
      slots[i].textContent = DISCLOSURE;
      // .hidden is the class this codebase uses to toggle visibility, not the
      // HTML attribute — the attribute loses to any rule that sets display.
      slots[i].classList.remove("hidden");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", decorate);
  } else {
    decorate();
  }
})();
