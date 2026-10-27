// Lightweight client-side site search. Matches page titles/sections in window.__SITE_SEARCH_INDEX
// against the query substring — no server round-trip, works the same on every static page.
(function () {
  function init() {
    var toggle = document.getElementById("navSearchToggle");
    var panel = document.getElementById("navSearchPanel");
    var input = document.getElementById("navSearchInput");
    var closeBtn = document.getElementById("navSearchClose");
    var results = document.getElementById("navSearchResults");
    if (!toggle || !panel || !input || !results) return;

    var prefix = window.__SITE_ROOT_PREFIX || "";
    var index = window.__SITE_SEARCH_INDEX || [];

    function open() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      setTimeout(function () { input.focus(); }, 10);
    }
    function close() {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
    function render(query) {
      results.innerHTML = "";
      var q = query.trim().toLowerCase();
      if (!q) {
        var hint = document.createElement("div");
        hint.className = "nav-search-hint";
        hint.textContent = "Start typing to search the whole site — products, industries, services and resources.";
        results.appendChild(hint);
        return;
      }
      var matches = index.filter(function (item) {
        return item.t.toLowerCase().indexOf(q) !== -1 || item.s.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 12);
      if (!matches.length) {
        var empty = document.createElement("div");
        empty.className = "nav-search-empty";
        empty.textContent = 'No pages match "' + query + '".';
        results.appendChild(empty);
        return;
      }
      matches.forEach(function (item) {
        var a = document.createElement("a");
        a.className = "nav-search-result";
        a.href = prefix + item.u;
        var sec = document.createElement("div");
        sec.className = "nsr-section";
        sec.textContent = item.s;
        var title = document.createElement("div");
        title.className = "nsr-title";
        title.textContent = item.t;
        a.appendChild(sec);
        a.appendChild(title);
        results.appendChild(a);
      });
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (panel.hidden) { open(); render(input.value); } else { close(); }
    });
    if (closeBtn) closeBtn.addEventListener("click", close);
    input.addEventListener("input", function () { render(input.value); });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== toggle) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    render("");
  }
  if (document.readyState === "complete" || document.readyState === "interactive") { setTimeout(init, 0); }
  else { document.addEventListener("DOMContentLoaded", init); }
})();
