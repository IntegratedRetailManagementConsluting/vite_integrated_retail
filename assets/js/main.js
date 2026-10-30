// © 2026 Integrated Retail Management Consulting Pte. Ltd. All rights reserved.
// Proprietary and confidential — unauthorised copying or redistribution of
// this script, in whole or in part, is prohibited.
//
// Expose global mobile nav toggler for instant click handling
var lastNavToggleTime = 0;
window.toggleMobileNav = function (force) {
  var now = Date.now();
  if (typeof force !== 'boolean' && now - lastNavToggleTime < 250) {
    return;
  }
  lastNavToggleTime = now;

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
    // Form submission (with captcha) is handled in the "Website forms" block at the end of this file.
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

/* ==========================================================================
   Website forms: contact page, "Book a Consultation" pop-up, White Paper
   pop-up and footer newsletter. They post JSON to /api/contact
   (functions/api/contact.js) and are protected by Cloudflare Turnstile.

   TURNSTILE: paste the public SITE KEY below. While it is empty the captcha
   is switched off (the server only checks the token once TURNSTILE_SECRET_KEY
   is set in the Cloudflare Pages settings), so it is safe to deploy first.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function () {
  var TURNSTILE_SITE_KEY = '';   // e.g. '0x4AAAAAAA...'  (public key, not the secret)

  var TS_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  var tsLoading = null;

  function loadTurnstile(cb) {
    if (window.turnstile) { cb(); return; }
    if (!tsLoading) {
      tsLoading = [];
      var s = document.createElement('script');
      s.src = TS_SRC; s.async = true; s.defer = true;
      document.head.appendChild(s);
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        if (window.turnstile) {
          clearInterval(timer);
          var q = tsLoading; tsLoading = null; q.forEach(function (f) { f(); });
        } else if (tries > 100) { clearInterval(timer); tsLoading = null; }
      }, 100);
    }
    tsLoading.push(cb);
  }

  function showError(form, msg) {
    var el = form.querySelector('.form-error');
    if (!el) {
      el = document.createElement('div');
      el.className = 'form-error';
      el.setAttribute('role', 'alert');
      el.style.cssText = 'color:#b91c1c;font-size:0.9rem;margin-top:10px;line-height:1.4;';
      var btn = form.querySelector('button[type="submit"]');
      if (btn && btn.parentNode) btn.parentNode.insertBefore(el, btn.nextSibling); else form.appendChild(el);
    }
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  // One Turnstile widget per form. "interaction-only" means visitors see nothing
  // unless Cloudflare is not sure they are human.
  function getCaptcha(form) {
    if (!TURNSTILE_SITE_KEY) return null;
    if (form._ircap) return form._ircap;
    var cap = { token: '', id: null, rendering: false, waiting: null };
    var slot = document.createElement('div');
    slot.className = 'ir-turnstile';
    slot.style.cssText = 'width:100%;margin-top:8px;';
    var btn = form.querySelector('button[type="submit"]');
    if (btn && btn.parentNode) btn.parentNode.insertBefore(slot, btn); else form.appendChild(slot);
    cap.render = function () {
      if (cap.id !== null || cap.rendering) return;
      cap.rendering = true;
      loadTurnstile(function () {
        cap.id = window.turnstile.render(slot, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: 'interaction-only',
          callback: function (t) { cap.token = t; if (cap.waiting) { var w = cap.waiting; cap.waiting = null; w(); } },
          'expired-callback': function () { cap.token = ''; },
          'error-callback': function () { cap.token = ''; }
        });
      });
    };
    cap.reset = function () {
      cap.token = '';
      if (cap.id !== null && window.turnstile) window.turnstile.reset(cap.id);
    };
    form.addEventListener('focusin', cap.render, { once: true });
    form._ircap = cap;
    return cap;
  }

  // Calls go(token) as soon as a captcha token is available (or straight away if captcha is off).
  function withCaptcha(form, go, fail) {
    var cap = getCaptcha(form);
    if (!cap) { go(''); return; }
    if (cap.token) { go(cap.token); return; }
    cap.render();
    var done = false;
    cap.waiting = function () { if (!done) { done = true; go(cap.token); } };
    setTimeout(function () {
      if (!done) { done = true; cap.waiting = null; fail(); }
    }, 15000);
  }

  function serializeForm(form) {
    var data = {};
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.type === 'checkbox' || el.type === 'radio' && !el.checked) return;
      var key = el.name;
      if (!key) {
        var field = el.closest('.field');
        var label = field ? field.querySelector('label') : null;
        if (label) {
          var txt = label.textContent.replace(/\*/g, '').trim().toLowerCase();
          if (txt.indexOf('name') !== -1) key = 'name';
          else if (txt.indexOf('email') !== -1) key = 'email';
          else if (txt.indexOf('contact') !== -1 || txt.indexOf('number') !== -1 || txt.indexOf('phone') !== -1) key = 'phone';
          else if (txt.indexOf('country') !== -1) key = 'country';
          else if (txt.indexOf('interested') !== -1) key = 'interest';
          else if (txt.indexOf('store') !== -1) key = 'stores';
          else if (txt.indexOf('industry') !== -1) key = 'industry';
          else if (txt.indexOf('message') !== -1) key = 'message';
          else key = txt;
        }
      }
      if (key) data[key] = el.value;
    });
    return data;
  }

  var GENERIC_ERROR = 'Sorry, we could not send your request. Please try again, or email connect@integratedretail.com.';

  // Shared sender: payload (object), form (for button + error text), ok() on success.
  function post(form, payload, busyText, ok) {
    var btn = form.querySelector('button[type="submit"]');
    var orig = btn ? btn.textContent : '';
    function idle() { if (btn) { btn.disabled = false; btn.textContent = orig; } }
    showError(form, '');
    if (btn) { btn.disabled = true; btn.textContent = busyText; }
    withCaptcha(form, function (token) {
      if (token) payload.cf_turnstile_token = token;
      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; });
      }).then(function (r) {
        var cap = form._ircap; if (cap) cap.reset();
        idle();
        if (r.ok) ok(); else showError(form, (r.body && r.body.error) || GENERIC_ERROR);
      }).catch(function (err) {
        console.error('Form submission error:', err);
        var cap = form._ircap; if (cap) cap.reset();
        idle();
        showError(form, GENERIC_ERROR);
      });
    }, function () {
      idle();
      showError(form, 'We could not verify that you are human. Please refresh the page and try again.');
    });
  }

  function sendForm(form, source, ok) {
    var payload = serializeForm(form);
    if (form.dataset && form.dataset.formId) payload.form_id = parseInt(form.dataset.formId, 10);
    payload.source = source || window.location.pathname;
    post(form, payload, 'Submitting...', ok);
  }

  // "Book a Consultation" pop-up (open/close logic lives further up in this file)
  var bookForm = document.getElementById('bookModalForm');
  var bookSuccess = document.getElementById('bookModalSuccess');
  if (bookForm) {
    bookForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sendForm(bookForm, 'Book Modal (' + window.location.pathname + ')', function () {
        bookForm.hidden = true;
        if (bookSuccess) bookSuccess.hidden = false;
      });
    });
  }

  // Contact page form
  var contactForm = document.getElementById('contactPageForm');
  var contactSuccess = document.getElementById('contactSuccess');
  var contactReset = document.getElementById('contactResetBtn');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      sendForm(contactForm, 'Contact Page', function () {
        contactForm.hidden = true;
        if (contactSuccess) contactSuccess.hidden = false;
      });
    });
    if (contactReset) {
      contactReset.addEventListener('click', function () {
        contactForm.hidden = false;
        contactForm.reset();
        showError(contactForm, '');
        if (contactSuccess) contactSuccess.hidden = true;
      });
    }
  }

  // White Paper pop-up (Cegid Retail, Gravity Form 91)
  var wpOverlay = document.getElementById('whitepaperModalOverlay');
  if (wpOverlay) {
    var wpForm = document.getElementById('whitepaperModalForm');
    var wpSuccess = document.getElementById('whitepaperModalSuccess');
    var wpClose = document.getElementById('whitepaperModalClose');
    var wpDone = document.getElementById('whitepaperModalDone');
    var openWp = function () { wpOverlay.classList.add('open'); document.body.classList.add('modal-open'); };
    var closeWp = function () {
      wpOverlay.classList.remove('open');
      document.body.classList.remove('modal-open');
      if (wpForm) { wpForm.hidden = false; wpForm.reset(); showError(wpForm, ''); }
      if (wpSuccess) wpSuccess.hidden = true;
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest('.btn-whitepaper, a[href="#whitepaper"]');
      if (!a) return;
      e.preventDefault();
      openWp();
    });
    if (wpClose) wpClose.addEventListener('click', closeWp);
    if (wpDone) wpDone.addEventListener('click', closeWp);
    wpOverlay.addEventListener('click', function (e) { if (e.target === wpOverlay) closeWp(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && wpOverlay.classList.contains('open')) closeWp(); });
    if (wpForm) {
      wpForm.addEventListener('submit', function (e) {
        e.preventDefault();
        sendForm(wpForm, 'Cegid White Paper Request', function () {
          wpForm.hidden = true;
          if (wpSuccess) wpSuccess.hidden = false;
        });
      });
    }
  }

  // Footer newsletter (Gravity Form 100)
  var nlForm = document.getElementById('footerNewsletterForm');
  var nlSuccess = document.getElementById('footerNewsletterSuccess');
  if (nlForm) {
    nlForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = document.getElementById('footerNewsletterEmail');
      var consent = document.getElementById('footerNewsletterConsent');
      if (!email || !email.value || (consent && !consent.checked)) return;
      post(nlForm, {
        form_id: 100,
        email: email.value.trim(),
        name: email.value.split('@')[0],
        source: 'Newsletter Footer (' + window.location.pathname + ')'
      }, 'Subscribing...', function () {
        nlForm.hidden = true;
        if (nlSuccess) nlSuccess.hidden = false;
      });
    });
  }
});
