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
  // Amazon Associates tracking ID. Empty string switches monetisation off.
  // From Associates -> Account Settings -> Manage Your Tracking IDs.
  // ---------------------------------------------------------------------
  var ASSOCIATE_TAG = "kyoshiuriza-20";

  // SiteStripe stamps a linkId onto each link it generates. It is per-link and
  // exists for Amazon's own reporting — it groups clicks by which link they
  // came from. It does NOT carry the commission; `tag` does that alone.
  //
  // So a book with no entry here still earns normally. What it loses is the
  // ability to tell that click apart from the others in the Associates
  // dashboard. Reusing one book's linkId on another would be worse than
  // omitting it: the earnings would still be right, but the reporting would
  // quietly attribute them to the wrong title.
  //
  // To fill one in: open the product on Amazon while signed in to Associates,
  // use SiteStripe -> Text, and copy the linkId out of the generated URL.
  var LINK_IDS = {
    "0321601912": "c1375273cd69e6676b80a898435c9a0f"  // Continuous Delivery
    // "0471081124": "",  // Lessons Learned in Software Testing
    // "1937785025": "",  // Explore It!
    // "0321534468": "",  // Agile Testing
    // "0321967054": "",  // More Agile Testing
    // "0131495054": ""   // xUnit Test Patterns
  };

  var DISCLOSURE =
    "As an Amazon Associate I earn from qualifying purchases. " +
    "Book links on this page are affiliate links — they cost you nothing extra, " +
    "and none of the recommendations were chosen because of them.";

  function asinOf(url) {
    var m = url.match(/\/dp\/([A-Z0-9]{10})/);
    return m ? m[1] : null;
  }

  // Rebuilds the SiteStripe parameter set rather than storing six near-identical
  // long URLs in the markup. Same result, one place to change it.
  //
  // Note SiteStripe emits gaOptInStatus twice in its copied URLs. A repeated
  // query parameter has no meaning beyond the first, so it appears once here.
  function tagUrl(url) {
    if (url.indexOf("tag=") !== -1) return url;

    var asin = asinOf(url);
    var params = [
      "gaOptInStatus=true",
      "linkCode=ll2",
      "tag=" + encodeURIComponent(ASSOCIATE_TAG)
    ];
    if (asin && LINK_IDS[asin]) params.push("linkId=" + encodeURIComponent(LINK_IDS[asin]));
    params.push("language=en_US");
    params.push("ref_=as_li_ss_tl");

    return url + (url.indexOf("?") === -1 ? "?" : "&") + params.join("&");
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
