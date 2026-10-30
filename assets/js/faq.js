/**
 * assets/js/faq.js
 *
 * Dynamic loader, filter, and accordion interaction for Frequently Asked Questions.
 * Renders static items instantly, then seamlessly hydrates with live WordPress
 * Ultimate FAQ (ufaq) posts via /api/faq.
 */
(function () {
  var faqList = document.getElementById("faqList");
  var searchInput = document.getElementById("faqSearchInput");
  var searchClear = document.getElementById("faqSearchClear");
  var catContainer = document.getElementById("faqCategories");
  var emptyMsg = document.getElementById("faqEmpty");
  var activeCat = "all";

  var BADGE_CONFIG = {
    general: { text: "IR", color: "var(--navy-700)" },
    footfallcam: { text: "FC", color: "#c4181f" },
    cegid: { text: "CG", color: "#e8590c" },
    retailpro: { text: "RP", color: "#0ea5e9" },
  };

  function initInteractive() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".faq-item"));
    var sections = Array.prototype.slice.call(document.querySelectorAll(".faq-section-title"));
    var catButtons = Array.prototype.slice.call(document.querySelectorAll(".faq-cat-btn"));

    function applyFilters() {
      var query = (searchInput ? searchInput.value || "" : "").trim().toLowerCase();
      if (searchClear) searchClear.classList.toggle("is-visible", query.length > 0);

      var visibleCount = 0;
      items.forEach(function (item) {
        var matchesCat = activeCat === "all" || item.getAttribute("data-cat") === activeCat;
        var searchAttr = (item.getAttribute("data-search") || "").toLowerCase();
        var matchesQuery = !query || searchAttr.indexOf(query) !== -1;
        var show = matchesCat && matchesQuery;
        item.hidden = !show;
        if (show) visibleCount++;
      });

      sections.forEach(function (heading) {
        var section = heading.getAttribute("data-section");
        var anyVisible = items.some(function (item) {
          return item.getAttribute("data-cat") === section && !item.hidden;
        });
        heading.hidden = !anyVisible;
      });

      if (emptyMsg) emptyMsg.classList.toggle("is-visible", visibleCount === 0);
    }

    if (searchInput) {
      searchInput.oninput = applyFilters;
    }
    if (searchClear) {
      searchClear.onclick = function () {
        searchInput.value = "";
        searchInput.focus();
        applyFilters();
      };
    }

    catButtons.forEach(function (btn) {
      btn.onclick = function () {
        catButtons.forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        activeCat = btn.getAttribute("data-cat");
        applyFilters();
      };
    });

    document.querySelectorAll(".faq-q").forEach(function (btn) {
      btn.onclick = function () {
        var item = btn.parentElement;
        var answer = item.querySelector(".faq-a");
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        item.classList.toggle("is-open", !open);
        if (answer) {
          answer.style.maxHeight = open ? "0px" : (answer.scrollHeight + "px");
        }
      };
    });

    applyFilters();
  }

  // Bind initial static items immediately
  initInteractive();

  // Dynamically fetch from WordPress via /api/faq
  fetch("/api/faq")
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || data.source !== "wordpress" || !data.items || !data.items.length) {
        return; // Stay on static content if not yet populated in WP
      }

      // 1. Re-render category tabs
      if (catContainer && data.categories && data.categories.length) {
        var tabsHtml = data.categories.map(function (c) {
          var isActive = c.slug === activeCat ? " is-active" : "";
          return '<button type="button" class="faq-cat-btn' + isActive + '" data-cat="' + c.slug + '">' +
            escapeHtml(c.name) + ' <span class="faq-cat-count">(' + c.count + ')</span></button>';
        }).join("");
        catContainer.innerHTML = tabsHtml;
      }

      // 2. Group items by category
      var grouped = {};
      data.items.forEach(function (item) {
        var cat = item.category || "general";
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });

      // 3. Render questions list
      var listHtml = "";
      Object.keys(grouped).forEach(function (catKey) {
        var groupItems = grouped[catKey];
        var catTitle = groupItems[0].category_name || catKey.toUpperCase();
        var badge = BADGE_CONFIG[catKey] || { text: catTitle.substring(0, 2).toUpperCase(), color: "var(--navy-700)" };

        listHtml += '<h2 class="faq-section-title" data-section="' + catKey + '">' +
          '<span class="faq-section-badge" style="background:' + badge.color + ';">' + badge.text + '</span>' +
          escapeHtml(catTitle) + ' <span class="faq-section-count">&middot; ' + groupItems.length + ' questions</span></h2>';

        groupItems.forEach(function (item) {
          var cleanSearch = (item.question + " " + item.answer.replace(/<[^>]+>/g, " ")).toLowerCase().replace(/\s+/g, " ");
          listHtml += '<div class="faq-item" data-cat="' + catKey + '" data-search="' + escapeHtml(cleanSearch) + '">' +
            '<button type="button" class="faq-q" aria-expanded="false">' +
            '<span>' + item.question + '</span>' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" class="faq-caret"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '</button>' +
            '<div class="faq-a">' + item.answer + '</div>' +
            '</div>';
        });
      });

      if (faqList) {
        faqList.innerHTML = listHtml;
        initInteractive();
      }
    })
    .catch(function (err) {
      console.warn("Could not load dynamic FAQs, using static fallback:", err);
    });

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
