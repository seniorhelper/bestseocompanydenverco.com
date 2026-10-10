/* bestseocompanydenverco.com: email assembled at runtime (keeps it away from scrapers)
   and the About-page contact form sent through FormSubmit AJAX with honeypot + timing check. */
(function () {
  'use strict';
  var AT = String.fromCharCode(64);

  /* email shown to people, never present in the HTML source */
  var spans = document.querySelectorAll('.eml-t[data-u][data-d]');
  for (var i = 0; i < spans.length; i++) {
    var s = spans[i], m = s.getAttribute('data-u') + AT + s.getAttribute('data-d');
    var a = document.createElement('a');
    a.href = 'mai' + 'lto:' + m;
    a.textContent = m;
    s.textContent = '';
    s.appendChild(a);
  }

  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var btn = form.querySelector('[type="submit"]');
  var t0 = Date.now(), touched = false, busy = false;
  ['pointerdown', 'keydown', 'touchstart', 'focusin'].forEach(function (ev) {
    form.addEventListener(ev, function () { touched = true; }, { passive: true });
  });
  function say(t) { if (status) { status.hidden = false; status.textContent = t; } }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var hp = form.querySelector('[name="_honey"]');
    if (hp && hp.value) { form.reset(); say('Thanks, your message was sent.'); return; }
    if (!touched || Date.now() - t0 < 3500) { say('One moment, then press Send again.'); return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }

    var fd = new FormData(form);
    fd.delete('_honey');
    fd.delete('_next');
    fd.set('page', location.pathname);
    busy = true;
    if (btn) btn.disabled = true;
    say('Sending...');

    var to = 'info' + AT + 'eyetoad' + '.com';
    fetch('https://formsubmit.co/ajax/' + to, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j || {} }; });
      })
      .then(function (x) {
        if (x.ok && String(x.j.success) === 'true') {
          form.reset();
          say('Thanks, your message was sent. Eye To Ad Media will reply by email.');
        } else {
          say('We could not confirm that went through. Please call 1-800-481-8638.');
        }
      })
      .catch(function () { say('That did not send. Please call 1-800-481-8638.'); })
      .then(function () { busy = false; if (btn) btn.disabled = false; });
  });
})();
