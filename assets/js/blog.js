// © 2026 Integrated Retail Management Consulting Pte. Ltd. All rights reserved.
// Dynamic Blog / Resources Loader for WordPress REST API via Cloudflare Pages Function.

(function () {
  'use strict';

  var blogGrid = document.getElementById('blogGrid');
  if (!blogGrid) return;

  var loadMoreWrap = document.getElementById('loadMoreWrap');
  var loadMoreBtn = document.getElementById('loadMoreBtn');
  var loadMoreStatus = document.getElementById('loadMoreStatus');
  var filterTabs = document.querySelectorAll('.filter-tabs button');

  var state = {
    page: 1,
    perPage: 9,
    totalPages: 1,
    totalPosts: 0,
    loading: false,
    activeFilter: 'all',
    lang: localStorage.getItem('ir_lang') || 'en',
    loadedPosts: [],
  };

  function decodeHtml(html) {
    if (!html) return '';
    var txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  function stripHtml(html) {
    if (!html) return '';
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function renderSkeletons(count) {
    var html = '';
    for (var i = 0; i < count; i++) {
      html += [
        '<div class="skeleton-card skeleton-item reveal-child" data-type="blog">',
        '  <div class="skeleton-shimmer skeleton-thumb"></div>',
        '  <div class="skeleton-shimmer skeleton-meta"></div>',
        '  <div class="skeleton-shimmer skeleton-title"></div>',
        '  <div class="skeleton-shimmer skeleton-title-2"></div>',
        '  <div class="skeleton-shimmer skeleton-text"></div>',
        '  <div class="skeleton-shimmer skeleton-text-last"></div>',
        '</div>',
      ].join('\n');
    }
    return html;
  }

  function createPostCard(post) {
    var rawTitle = decodeHtml(post.title || '');
    var cleanExcerpt = stripHtml(decodeHtml(post.excerpt || ''));
    if (cleanExcerpt.length > 150) {
      cleanExcerpt = cleanExcerpt.substring(0, 147) + '...';
    }

    var primaryCat = (post.categories && post.categories[0] && post.categories[0].name) || 'Retail Insights';
    var isThai = post.categories && post.categories.some(function (c) { return c.slug === 'th'; });
    var isIndo = post.categories && post.categories.some(function (c) { return c.slug === 'id'; });
    var langBadge = isThai ? '<span class="badge-tag badge-lang">🇹🇭 TH</span>' : isIndo ? '<span class="badge-tag badge-lang">🇮🇩 ID</span>' : '';

    var dateStr = formatDate(post.date);
    var targetUrl = 'post.html?slug=' + encodeURIComponent(post.slug);

    var thumbHtml;
    if (post.featured_image) {
      thumbHtml = [
        '<div class="thumb has-photo">',
        '  <img src="' + post.featured_image + '" alt="' + (post.featured_image_alt || rawTitle).replace(/"/g, '&quot;') + '" loading="lazy">',
        '</div>',
      ].join('');
    } else {
      thumbHtml = [
        '<div class="thumb" style="background: linear-gradient(135deg, #102a4a, #c4181f);">',
        '  <span class="thumb-icon">',
        '    <svg viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="2">',
        '      <rect x="6" y="10" width="36" height="28" rx="3"/>',
        '      <path d="M6 18h36M18 26h12M18 32h8"/>',
        '    </svg>',
        '  </span>',
        '</div>',
      ].join('');
    }

    var card = document.createElement('a');
    card.href = targetUrl;
    card.className = 'post-card card reveal-child';
    card.setAttribute('data-type', 'blog');

    card.innerHTML = [
      thumbHtml,
      '<div class="badge-group">',
      '  <span class="badge-tag">' + primaryCat + '</span>',
      langBadge,
      dateStr ? '  <span class="post-date">' + dateStr + '</span>' : '',
      '</div>',
      '<h3>' + rawTitle + '</h3>',
      '<p class="post-excerpt">' + cleanExcerpt + '</p>',
      '<span class="card-link">Read article &rarr;</span>',
    ].join('\n');

    return card;
  }

  function applyFilter(filter) {
    state.activeFilter = filter;
    var allCards = blogGrid.querySelectorAll('[data-type]');
    allCards.forEach(function (card) {
      var type = card.getAttribute('data-type');
      if (filter === 'all' || type === filter) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });

    if (loadMoreWrap) {
      if (filter === 'event') {
        loadMoreWrap.style.display = 'none';
      } else {
        loadMoreWrap.style.display = state.page < state.totalPages ? 'flex' : 'none';
      }
    }
  }

  async function fetchPosts(page) {
    if (state.loading) return;
    state.loading = true;

    if (loadMoreBtn) {
      loadMoreBtn.classList.add('loading');
      loadMoreBtn.innerHTML = '<span class="btn-spinner"></span> Loading articles...';
    }

    // On first page, inject skeletons if not already present
    if (page === 1) {
      var skeletons = document.createElement('div');
      skeletons.id = 'blogSkeletons';
      skeletons.style.display = 'contents';
      skeletons.innerHTML = renderSkeletons(6);
      blogGrid.prepend(skeletons);
    }

    try {
      var langParam = state.lang ? '&lang=' + encodeURIComponent(state.lang) : '';
      var res = await fetch('/api/posts?page=' + page + '&per_page=' + state.perPage + langParam);
      if (!res.ok) {
        throw new Error('Server returned HTTP ' + res.status);
      }
      var data = await res.json();

      // Remove skeletons on first page
      var skeletonsEl = document.getElementById('blogSkeletons');
      if (skeletonsEl) skeletonsEl.remove();

      state.totalPages = data.totalPages || 1;
      state.totalPosts = data.total || 0;
      state.page = page;

      var posts = data.posts || [];
      state.loadedPosts = state.loadedPosts.concat(posts);

      // Find where to insert (before event cards, or append)
      var firstEventCard = blogGrid.querySelector('[data-type="event"]');

      posts.forEach(function (post) {
        var card = createPostCard(post);
        if (firstEventCard) {
          blogGrid.insertBefore(card, firstEventCard);
        } else {
          blogGrid.appendChild(card);
        }
      });

      // Update status
      if (loadMoreStatus) {
        loadMoreStatus.textContent =
          'Showing ' + state.loadedPosts.length + ' of ' + state.totalPosts + ' articles';
      }

      // Re-apply filter
      applyFilter(state.activeFilter);

      // Toggle load more button visibility
      if (loadMoreWrap) {
        if (state.page >= state.totalPages) {
          loadMoreWrap.innerHTML =
            '<p class="load-more-status">All ' + state.totalPosts + ' articles loaded.</p>';
        } else {
          loadMoreWrap.style.display = 'flex';
          if (loadMoreBtn) {
            loadMoreBtn.classList.remove('loading');
            loadMoreBtn.innerHTML = 'Load More Articles &darr;';
          }
        }
      }
    } catch (err) {
      console.error('Failed to load blog posts:', err);
      var skeletonsEl = document.getElementById('blogSkeletons');
      if (skeletonsEl) skeletonsEl.remove();

      if (loadMoreWrap && page === 1) {
        loadMoreWrap.innerHTML = [
          '<div style="text-align:center;padding:20px;">',
          '  <p style="color:var(--slate-500);margin-bottom:12px;">Unable to fetch latest live articles at this moment.</p>',
          '  <button type="button" class="btn btn-outline" id="retryPostsBtn">Retry Loading</button>',
          '</div>',
        ].join('');
        var retryBtn = document.getElementById('retryPostsBtn');
        if (retryBtn) {
          retryBtn.addEventListener('click', function () {
            location.reload();
          });
        }
      } else if (loadMoreBtn) {
        loadMoreBtn.classList.remove('loading');
        loadMoreBtn.innerHTML = 'Retry Load More &darr;';
      }
    } finally {
      state.loading = false;
    }
  }

  // Bind filter tabs
  filterTabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterTabs.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter') || 'all';
      applyFilter(filter);
    });
  });

  // Bind Load More button
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      if (state.page < state.totalPages) {
        fetchPosts(state.page + 1);
      }
    });
  }

  // Listen for language changes from navbar
  document.querySelectorAll('.lang-option').forEach(function (el) {
    el.addEventListener('click', function () {
      var newLang = el.getAttribute('data-lang') || 'en';
      if (newLang !== state.lang) {
        state.lang = newLang;
        state.page = 1;
        state.loadedPosts = [];
        // Remove existing dynamic blog cards
        var existingCards = blogGrid.querySelectorAll('.post-card[data-type="blog"]');
        existingCards.forEach(function (card) { card.remove(); });
        fetchPosts(1);
      }
    });
  });

  // Initial fetch
  fetchPosts(1);
})();
