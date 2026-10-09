/* Scorecard: vanilla JS, localStorage only. No network. */
(function () {
  'use strict';
  var KEYS = ['ownership', 'reporting', 'gbp', 'ai', 'technical', 'content', 'contract', 'pricing', 'proof', 'communication'];
  var LABELS = {
    ownership: 'Ownership of the work',
    reporting: 'Reporting on calls and leads',
    gbp: 'Google Business Profile / map pack',
    ai: 'AI-search readiness',
    technical: 'Technical depth',
    content: 'Content ownership and QC',
    contract: 'Contract terms',
    pricing: 'Pricing transparency',
    proof: 'Local proof',
    communication: 'Communication cadence'
  };
  var STORE = 'bscd-scorecard-v1';
  var form = document.getElementById('sc-form');
  if (!form) return;

  var state = load();
  var slot = state.active || 0;

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) { var s = JSON.parse(raw); if (s && s.slots && s.slots.length === 3) return s; }
    } catch (e) { /* storage unavailable: run in memory */ }
    return { active: 0, slots: [blank(), blank(), blank()] };
  }
  function blank() { return { name: '', date: '', scores: {}, notes: {} }; }
  function save() {
    state.active = slot;
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function readForm() {
    var s = state.slots[slot];
    s.name = form.elements.agency.value.trim();
    s.date = form.elements.date.value;
    KEYS.forEach(function (k) {
      var checked = form.querySelector('input[name="' + k + '"]:checked');
      if (checked) s.scores[k] = parseInt(checked.value, 10); else delete s.scores[k];
      var n = form.elements['n-' + k].value.trim();
      if (n) s.notes[k] = n; else delete s.notes[k];
    });
  }

  function writeForm() {
    var s = state.slots[slot];
    form.elements.agency.value = s.name || '';
    form.elements.date.value = s.date || '';
    KEYS.forEach(function (k) {
      var radios = form.querySelectorAll('input[name="' + k + '"]');
      for (var i = 0; i < radios.length; i++) radios[i].checked = (s.scores[k] !== undefined && parseInt(radios[i].value, 10) === s.scores[k]);
      form.elements['n-' + k].value = s.notes[k] || '';
    });
  }

  function total(s) {
    var t = 0; KEYS.forEach(function (k) { if (s.scores[k] !== undefined) t += s.scores[k]; }); return t;
  }
  function scoredCount(s) { return KEYS.filter(function (k) { return s.scores[k] !== undefined; }).length; }
  function verdict(t, n) {
    if (n === 0) return 'Score at least one criterion to see a verdict.';
    var band = t >= 40 ? 'Strong candidate' : t >= 30 ? 'Workable with conditions' : t >= 20 ? 'Risky' : 'Walk away';
    var partial = n < 10 ? ' (' + n + ' of 10 scored; provisional)' : '';
    return band + partial;
  }
  function hardStops(s) {
    var stops = [];
    if (s.scores.ownership === 0) stops.push('ownership of the work');
    if (s.scores.contract === 0) stops.push('contract terms');
    return stops;
  }

  function renderTotal() {
    var s = state.slots[slot];
    var t = total(s), n = scoredCount(s);
    document.getElementById('sc-score').textContent = t;
    document.getElementById('sc-bar').style.width = (t * 2) + '%';
    document.getElementById('sc-verdict').textContent = verdict(t, n);
    var stops = hardStops(s);
    document.getElementById('sc-flag').textContent = stops.length ? 'Disqualifying zero on: ' + stops.join(' and ') + '. Treat as a hard stop regardless of total.' : '';
  }

  function renderTabs() {
    var tabs = document.querySelectorAll('.sc-tabs [role="tab"]');
    for (var i = 0; i < tabs.length; i++) {
      var s = state.slots[i];
      var label = s.name ? s.name : 'Agency ' + (i + 1);
      var n = scoredCount(s);
      tabs[i].textContent = label + (n ? ' (' + total(s) + ')' : '');
      tabs[i].setAttribute('aria-selected', i === slot ? 'true' : 'false');
    }
  }

  function renderCompare() {
    var tbody = document.querySelector('#sc-compare tbody');
    if (!tbody) return;
    var rows = '';
    var heads = document.querySelectorAll('#sc-compare thead th');
    for (var h = 1; h < heads.length; h++) {
      var sl = state.slots[h - 1];
      heads[h].textContent = sl.name || ('Agency ' + h);
    }
    KEYS.forEach(function (k) {
      var vals = state.slots.map(function (s) { return s.scores[k]; });
      var defined = vals.filter(function (v) { return v !== undefined; });
      var max = defined.length > 1 ? Math.max.apply(null, defined) : null;
      rows += '<tr><th scope="row">' + LABELS[k] + '</th>';
      vals.forEach(function (v) {
        var cls = (max !== null && v === max && defined.length > 1) ? ' class="best"' : '';
        rows += '<td' + cls + '>' + (v === undefined ? '–' : v) + '</td>';
      });
      rows += '</tr>';
    });
    var totals = state.slots.map(total);
    var scored = state.slots.map(scoredCount);
    var anyScored = scored.filter(function (n) { return n > 0; }).length;
    var tmax = anyScored > 1 ? Math.max.apply(null, totals.filter(function (t, i) { return scored[i] > 0; })) : null;
    rows += '<tr><th scope="row">Total / 50</th>';
    totals.forEach(function (t, i) {
      var cls = (tmax !== null && t === tmax && scored[i] > 0) ? ' class="best"' : '';
      rows += '<td' + cls + '><strong>' + (scored[i] ? t : '–') + '</strong></td>';
    });
    rows += '</tr><tr><th scope="row">Verdict</th>';
    state.slots.forEach(function (s) {
      var n = scoredCount(s);
      var stops = hardStops(s);
      rows += '<td>' + (n ? verdict(total(s), n) + (stops.length ? ' — hard stop' : '') : '–') + '</td>';
    });
    rows += '</tr>';
    tbody.innerHTML = rows;
  }

  function exportText() {
    var lines = ['SEO agency scorecard — bestseocompanydenverco.com', 'Exported ' + new Date().toISOString().slice(0, 10), ''];
    state.slots.forEach(function (s, i) {
      if (!scoredCount(s) && !s.name) return;
      lines.push('== ' + (s.name || 'Agency ' + (i + 1)) + (s.date ? ' (' + s.date + ')' : '') + ' ==');
      KEYS.forEach(function (k) {
        var v = s.scores[k] === undefined ? '-' : s.scores[k];
        lines.push('  ' + v + '/5  ' + LABELS[k] + (s.notes[k] ? ' — ' + s.notes[k] : ''));
      });
      var stops = hardStops(s);
      lines.push('  TOTAL ' + total(s) + '/50 — ' + verdict(total(s), scoredCount(s)) + (stops.length ? ' — HARD STOP: ' + stops.join(', ') : ''));
      lines.push('');
    });
    if (lines.length === 3) lines.push('(nothing scored yet)');
    return lines.join('\n');
  }

  function renderAll() { renderTotal(); renderTabs(); renderCompare(); }

  // Events
  form.addEventListener('input', function () { readForm(); save(); renderAll(); });
  form.addEventListener('change', function () { readForm(); save(); renderAll(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); readForm(); save(); renderAll(); });

  var tabs = document.querySelectorAll('.sc-tabs [role="tab"]');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function (e) {
      readForm(); save();
      slot = parseInt(e.currentTarget.getAttribute('data-slot'), 10);
      writeForm(); save(); renderAll();
    });
  }
  document.getElementById('sc-save').addEventListener('click', function () {
    readForm(); save(); renderAll();
    var btn = document.getElementById('sc-save');
    var orig = btn.innerHTML; btn.textContent = 'Saved';
    setTimeout(function () { btn.innerHTML = orig; }, 1200);
  });
  document.getElementById('sc-clear').addEventListener('click', function () {
    if (!confirm('Clear scores and notes for this agency slot?')) return;
    state.slots[slot] = blank(); writeForm(); save(); renderAll();
  });
  document.getElementById('sc-reset').addEventListener('click', function () {
    if (!confirm('Remove all three agencies from this browser?')) return;
    state = { active: 0, slots: [blank(), blank(), blank()] }; slot = 0;
    writeForm(); save(); renderAll();
    document.getElementById('sc-out').value = '';
  });
  document.getElementById('sc-export').addEventListener('click', function () {
    readForm(); save();
    var out = document.getElementById('sc-out');
    out.value = exportText();
    out.focus(); out.select();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out.value).then(function () {
        var b = document.getElementById('sc-export'); var o = b.innerHTML; b.textContent = 'Copied to clipboard';
        setTimeout(function () { b.innerHTML = o; }, 1500);
      }, function () { /* selection is enough */ });
    }
  });
  document.getElementById('sc-download').addEventListener('click', function () {
    readForm(); save();
    var text = exportText();
    document.getElementById('sc-out').value = text;
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'seo-agency-scorecard.txt';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  });

  writeForm();
  renderAll();
})();
