// © 2026 Integrated Retail Management Consulting Pte. Ltd. All rights reserved.
// Proprietary and confidential — unauthorised copying or redistribution of
// this script, in whole or in part, is prohibited.
//
// Expose global mobile nav toggler for instant click handling
window.toggleMobileNav = function (force) {
  var toggle = document.querySelector('.nav-toggle') || document.getElementById('navToggle');
  var searchToggle = document.getElementById('navSearchToggle');
  var searchPanel = document.getElementById('navSearchPanel');
  var shouldOpen = typeof force === 'boolean' ? force : !document.body.classList.contains('nav-open');

  if (shouldOpen) {
    document.body.classList.add('nav-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    if (searchPanel && !searchPanel.hidden) {
      searchPanel.hidden = true;
      if (searchToggle) searchToggle.setAttribute('aria-expanded', 'false');
    }
  } else {
    document.body.classList.remove('nav-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
};

// Mobile nav toggle + dropdown handling for touch/small screens
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var mainNav = document.getElementById('mainNav') || document.querySelector('.main-nav');
  var searchToggle = document.getElementById('navSearchToggle');

  if (toggle) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      window.toggleMobileNav();
    });
  }

  if (searchToggle) {
    searchToggle.addEventListener('click', function () {
      window.toggleMobileNav(false);
    });
  }

  // Close nav on Escape key
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && document.body.classList.contains('nav-open')) {
      window.toggleMobileNav(false);
    }
  });

  // Close mobile nav when window is resized past mobile breakpoint
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1024 && document.body.classList.contains('nav-open')) {
      window.toggleMobileNav(false);
    }
  });

  // Accordion toggle for dropdowns in mobile view
  document.querySelectorAll('.nav-item.has-dropdown > a').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        e.stopPropagation();
        var parentItem = this.parentElement;
        var wasOpen = parentItem.classList.contains('open');

        // Close other open sibling dropdowns for a clean accordion experience
        var siblings = parentItem.parentElement.querySelectorAll('.nav-item.has-dropdown.open');
        siblings.forEach(function (sibling) {
          if (sibling !== parentItem) {
            sibling.classList.remove('open');
          }
        });

        parentItem.classList.toggle('open', !wasOpen);
      }
    });
  });

  // Close mobile nav when clicking on direct links inside the nav (not dropdown togglers)
  if (mainNav) {
    mainNav.querySelectorAll('a').forEach(function (link) {
      if (!link.parentElement.classList.contains('has-dropdown') || link.parentElement.tagName.toLowerCase() !== 'li' || link.closest('.dropdown')) {
        link.addEventListener('click', function () {
          if (window.innerWidth <= 1024 && !this.classList.contains('lang-switcher-trigger')) {
            window.toggleMobileNav(false);
          }
        });
      }
    });
  }

  // Simple filter tabs on resources page
  var tabs = document.querySelectorAll('.filter-tabs button');
  var cards = document.querySelectorAll('[data-type]');
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var type = btn.getAttribute('data-filter');
      cards.forEach(function (card) {
        if (type === 'all' || card.getAttribute('data-type') === type) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Book-a-consultation modal: any primary CTA link that points to the
  // Contact page ("Book a Consultation", "Book a Free Consultation", "Book
  // Your Free Demo", etc.) opens this modal in place, instead of navigating
  // away to the Contact page.
  var bookOverlay = document.getElementById('bookModalOverlay');
  if (bookOverlay) {
    var bookForm = document.getElementById('bookModalForm');
    var bookSuccess = document.getElementById('bookModalSuccess');
    var bookClose = document.getElementById('bookModalClose');
    var bookDone = document.getElementById('bookModalDone');

    var openBookModal = function () {
      bookOverlay.classList.add('open');
      document.body.classList.add('modal-open');
    };
    var closeBookModal = function () {
      bookOverlay.classList.remove('open');
      document.body.classList.remove('modal-open');
      if (bookForm) { bookForm.hidden = false; bookForm.reset(); }
      if (bookSuccess) { bookSuccess.hidden = true; }
    };

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a.btn.btn-primary');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (/contact\/index\.html(#.*)?$/.test(href)) {
        e.preventDefault();
        openBookModal();
      }
    });

    if (bookClose) bookClose.addEventListener('click', closeBookModal);
    if (bookDone) bookDone.addEventListener('click', closeBookModal);
    bookOverlay.addEventListener('click', function (e) {
      if (e.target === bookOverlay) closeBookModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bookOverlay.classList.contains('open')) closeBookModal();
    });
    if (bookForm) {
      bookForm.addEventListener('submit', function (e) {
        e.preventDefault();
        bookForm.hidden = true;
        if (bookSuccess) bookSuccess.hidden = false;
      });
    }
  }

  // Scroll-reveal: fade/slide in sections and cards as they enter the viewport
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealTargets = document.querySelectorAll('.reveal, .reveal-stagger, .reveal-img');
  if (revealTargets.length) {
    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach(function (el) { el.classList.add('in-view'); });
    } else {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.01, rootMargin: '200px 0px 200px 0px' });
      revealTargets.forEach(function (el) { revealObserver.observe(el); });

      // Safety net: IntersectionObserver can miss a target when the scroll position
      // jumps instantly (e.g. anchor links, "End" key, very fast flicks) without an
      // intermediate frame to observe. A direct check on scroll/resize/load guarantees
      // nothing stays permanently hidden.
      var forceRevealVisible = function () {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        document.querySelectorAll('.reveal:not(.in-view), .reveal-stagger:not(.in-view), .reveal-img:not(.in-view)').forEach(function (el) {
          var rect = el.getBoundingClientRect();
          // Reveal anything at or above the viewport's bottom edge (in view OR already
          // scrolled past) — only elements still fully below the fold stay hidden.
          if (rect.top < vh + 200) {
            el.classList.add('in-view');
            revealObserver.unobserve(el);
          }
        });
      };
      var forceRevealTimer = null;
      var scheduleForceReveal = function () {
        if (forceRevealTimer) return;
        forceRevealTimer = setTimeout(function () { forceRevealTimer = null; forceRevealVisible(); }, 120);
      };
      window.addEventListener('scroll', scheduleForceReveal, { passive: true });
      window.addEventListener('resize', scheduleForceReveal, { passive: true });
      window.addEventListener('load', forceRevealVisible);
      setTimeout(forceRevealVisible, 400);
    }
  }

  // Animated count-up for stat numbers marked with data-count-to
  var counters = document.querySelectorAll('[data-count-to]');
  if (counters.length) {
    var animateCount = function (el) {
      var target = parseFloat(el.getAttribute('data-count-to'));
      var prefix = el.getAttribute('data-count-prefix') || '';
      var suffix = el.getAttribute('data-count-suffix') || '';
      var decimals = el.getAttribute('data-count-decimals') ? parseInt(el.getAttribute('data-count-decimals'), 10) : 0;
      if (prefersReducedMotion) {
        el.textContent = prefix + target.toLocaleString() + suffix;
        return;
      }
      var duration = 1400;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = target * eased;
        el.textContent = prefix + (decimals ? value.toFixed(decimals) : Math.round(value)).toLocaleString() + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = prefix + target.toLocaleString() + suffix;
        }
      }
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCount);
    } else {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countObserver.observe(el); });
    }
  }

  // Sitewide support chat widget: front-end quick-reply assistant (no backend —
  // canned responses only, so we never imply a live agent is on the other end).
  var chatWidget = document.querySelector('.chat-widget');
  if (chatWidget) {
    var chatBtn = document.getElementById('chatWidgetBtn');
    var chatClose = document.getElementById('chatWidgetClose');
    var chatBody = document.getElementById('chatWidgetBody');
    var chatForm = document.getElementById('chatWidgetForm');
    var chatInput = document.getElementById('chatWidgetInput');

    var CANNED_REPLIES = [
      { match: /demo/i, reply: "Happy to set that up. Please use the “Book a Consultation” button at the top of the page, or share your email and our team will reach out to schedule a demo." },
      { match: /product|platform|prism|cegid|footfallcam|globriq|warewiser|ioptimo|iposit|retaillium/i, reply: "We work with Cegid Retail, Retail Pro Prism, FootfallCam, iPosit, iOptimo, Warewiser, Retaillium and Globriq — you can find each on our Products page, or tell me a bit about what you're trying to solve and I can point you to the right one." },
      { match: /support|account|existing|issue|problem|help/i, reply: "Sorry to hear you're running into something. For existing-customer support, please share your company name and a short description of the issue, and our support team will follow up by email." },
      { match: /price|cost|quote/i, reply: "Pricing depends on store count and which platforms you need — the fastest way to get a real number is to book a short call with our team." },
    ];
    var DEFAULT_REPLY = "Thanks for reaching out — I've passed this to our team and someone will follow up by email shortly.";

    var addMessage = function (text, who) {
      var div = document.createElement('div');
      div.className = 'chat-msg ' + who;
      div.textContent = text;
      chatBody.appendChild(div);
      chatBody.scrollTop = chatBody.scrollHeight;
    };

    var botReplyTo = function (text) {
      var reply = DEFAULT_REPLY;
      for (var i = 0; i < CANNED_REPLIES.length; i++) {
        if (CANNED_REPLIES[i].match.test(text)) { reply = CANNED_REPLIES[i].reply; break; }
      }
      window.setTimeout(function () { addMessage(reply, 'bot'); }, 500);
    };

    var openChat = function () { chatWidget.classList.add('open'); };
    var toggleChat = function () { chatWidget.classList.toggle('open'); };

    if (chatBtn) chatBtn.addEventListener('click', toggleChat);
    if (chatClose) chatClose.addEventListener('click', function () { chatWidget.classList.remove('open'); });

    document.querySelectorAll('.chat-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var text = chip.getAttribute('data-reply') || chip.textContent;
        addMessage(text, 'user');
        botReplyTo(text);
        var replies = document.querySelector('.chat-quick-replies');
        if (replies) replies.remove();
      });
    });

    if (chatForm) {
      chatForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = (chatInput.value || '').trim();
        if (!text) return;
        addMessage(text, 'user');
        botReplyTo(text);
        chatInput.value = '';
      });
    }

    // Support agent links from screenshots reference: any element with
    // data-open-chat opens the widget directly (e.g. a "Chat with us" link).
    document.querySelectorAll('[data-open-chat]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); openChat(); });
    });
  }

  // Subtle 3D tilt-on-hover: gives product mockups, diagram visuals and the
  // animated hub/context diagrams a sense of depth as the cursor moves over
  // them, instead of sitting perfectly flat. Skipped entirely on touch
  // devices (no hover) and when the user prefers reduced motion.
  if (!prefersReducedMotion && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    var tiltTargets = document.querySelectorAll('.mockup-card, .visual-card, .hero-art.tech-hub-wrap, .page-hero.with-art .tech-hub, .context-row .tech-hub');
    tiltTargets.forEach(function (el) {
      var maxTilt = 7;
      el.addEventListener('mouseenter', function () { el.classList.add('tilt-hover'); });
      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        var rotateY = (px - 0.5) * maxTilt * 2;
        var rotateX = (0.5 - py) * maxTilt * 2;
        el.style.transform = 'perspective(1000px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) scale3d(1.02,1.02,1.02)';
      });
      el.addEventListener('mouseleave', function () {
        el.classList.remove('tilt-hover');
        el.style.transform = '';
      });
    });
  }

  // Paginated brand-logo carousel (Clients page): dot navigation between pages
  document.querySelectorAll('.brand-carousel').forEach(function (carousel) {
    var pages = carousel.querySelectorAll('.brand-grid-page');
    var dots = carousel.querySelectorAll('.brand-carousel-dots button');
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var target = dot.getAttribute('data-page');
        pages.forEach(function (p) {
          var isTarget = p.getAttribute('data-page') === target;
          p.classList.toggle('active', isTarget);
          // Pages start hidden (display:none), so the scroll-reveal observer never
          // sees them intersect the viewport — force their logos visible immediately
          // the first time a page is switched to, instead of relying on the observer.
          if (isTarget) { p.classList.add('in-view'); }
        });
        dots.forEach(function (d) {
          var isActive = d === dot;
          d.classList.toggle('active', isActive);
          d.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
      });
    });
  });
});
