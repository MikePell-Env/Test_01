/* Envisioner, Inc. — envisionerinc.com */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  /* Split the headline into words so they can rise in sequence. */
  var head = document.querySelector('[data-split]');
  if (head) {
    /* The word named by data-pulse gets an inner span of its own: the outer
       one is already spoken for by the entrance animation. */
    var pulseWord = (head.getAttribute('data-pulse') || '').toLowerCase();
    var words = head.textContent.split(/(\s+)/);
    head.textContent = '';
    var i = 0;
    words.forEach(function (word) {
      if (!word.trim()) { head.appendChild(document.createTextNode(word)); return; }
      var span = document.createElement('span');
      span.className = 'w';
      span.style.setProperty('--d', (0.18 + i * 0.075).toFixed(3) + 's');

      if (pulseWord && word.toLowerCase().replace(/[^a-z0-9]/g, '') === pulseWord) {
        var inner = document.createElement('span');
        inner.className = 'pulse';
        inner.textContent = word;
        span.appendChild(inner);
      } else {
        span.textContent = word;
      }

      head.appendChild(span);
      i++;
    });
  }

  /* Light the word at the moment the scan band crosses it.
   *
   * The band's top runs from -30vh to 105vh across the cycle and it stands
   * 26vh tall, so its centre sits at (-17 + 135p)vh for progress p. Solving
   * that for the word's own offset gives the progress to aim at. Both are CSS
   * animations of the same duration on one document timeline, so aligning
   * them is just a matter of shifting one start time.
   */
  function syncPulseToScan(scanAnim, pulseAnim) {
    var hero = document.querySelector('.hero');
    var word = document.querySelector('.wordmark .pulse');
    if (!hero || !word || scanAnim.startTime === null) return;

    var rect = word.getBoundingClientRect();
    var offset = rect.top - hero.getBoundingClientRect().top + rect.height / 2;
    var progress = ((offset / window.innerHeight) * 100 + 17) / 135;

    /* The keyframes peak at the halfway mark. */
    pulseAnim.startTime = scanAnim.startTime + (progress - 0.5) * 9000;
  }

  var scanEl = document.querySelector('.hero__scan');
  var pulseEl = document.querySelector('.wordmark .pulse');
  if (!reduced && scanEl && pulseEl && scanEl.getAnimations) {
    var scanAnim = scanEl.getAnimations()[0];
    var pulseAnim = pulseEl.getAnimations()[0];
    if (scanAnim && pulseAnim) {
      Promise.all([scanAnim.ready, pulseAnim.ready])
        .then(function () {
          syncPulseToScan(scanAnim, pulseAnim);
          var t;
          window.addEventListener('resize', function () {
            clearTimeout(t);
            t = setTimeout(function () { syncPulseToScan(scanAnim, pulseAnim); }, 180);
          });
        })
        .catch(function () { /* unsynced but still running */ });
    }
  }

  /* Sections fade up as they enter the viewport. */
  if ('IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.triad li, .signup__inner');
    Array.prototype.forEach.call(targets, function (el, n) {
      el.classList.add('reveal');
      el.style.transitionDelay = (n % 3) * 0.09 + 's';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  /* The hero image drifts slightly with the pointer. */
  var heroImg = document.getElementById('heroImg');
  if (heroImg && !reduced && window.matchMedia('(pointer: fine)').matches) {
    var pending = false, mx = 0, my = 0;
    window.addEventListener('mousemove', function (e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        heroImg.style.transform =
          'scale(1.06) translate3d(' + (mx * -14).toFixed(2) + 'px,' + (my * -10).toFixed(2) + 'px,0)';
        pending = false;
      });
    }, { passive: true });
  }

  /* Signup. Validates here; needs an endpoint wired before it can deliver. */
  var form = document.getElementById('signupForm');
  var err = document.getElementById('formError');
  if (form && err) {
    var email = form.querySelector('input[name="email"]');

    function clearError() {
      err.hidden = true;
      err.textContent = '';
    }
    email.addEventListener('input', clearError);

    function fail(message) {
      err.textContent = message;
      err.hidden = false;
      email.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = email.value.trim();
      if (!value) return fail('Enter your email address.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        return fail('That email address does not look right.');
      }
      clearError();

      var btn = form.querySelector('.btn');
      var label = btn.querySelector('span');
      btn.disabled = true;
      label.textContent = 'Sending';

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'fetch' }
      })
        .then(function (res) {
          return res.json().catch(function () {
            throw new Error('bad response');
          });
        })
        .then(function (data) {
          if (!data.ok) throw new Error(data.message || 'failed');
          /* Everything that asked for the signup goes away; only the reply stays. */
          form.querySelector('.form__row').hidden = true;
          form.querySelector('.form__note').hidden = true;
          btn.hidden = true;
          var ok = document.createElement('p');
          ok.className = 'form__ok';
          ok.setAttribute('role', 'status');
          ok.textContent = data.message;
          form.insertBefore(ok, form.firstChild);
        })
        .catch(function (error) {
          btn.disabled = false;
          label.textContent = 'Send';
          fail(
            error && error.message && error.message !== 'bad response' && error.message !== 'failed'
              ? error.message
              : 'That did not go through. Try again, or email hello@envisionerinc.com.'
          );
        });
    });
  }
})();
