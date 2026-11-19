/* Amali's Trivia Game: landing page behaviour.
   Everything bespoke lives here. The scroll engine (scrollcraft.js) is untouched;
   it handles the entrance and wipe devices, this file handles the rest:
   hero depth, the live round (the page's one signature move), and two small demos. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // ------------------------------------------------------------------ engine --
  try {
    if (!window.ScrollCraft) throw new Error('engine missing');
    window.ScrollCraft.mount(document.body);
  } catch (err) {
    // Never leave content hidden if the engine cannot run.
    console.warn('Scroll engine unavailable, showing the page without it.', err);
    $$('[data-sc-in], [data-sc-stagger] > *').forEach(function (el) { el.classList.add('sc-in'); });
    $$('[data-sc-reveal]').forEach(function (el) { el.style.clipPath = 'none'; });
  }

  // -------------------------------------------------------- 1 · hero depth --
  // Confetti on three planes (far, mid, near), generated from a fixed seed so the
  // composition is the same on every visit.
  var COLORS = ['#FFC531', '#E11D48', '#2563EB', '#10B981', '#F8F4FF'];
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function scatter(host, count, min, max, rand) {
    if (!host) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var shape = rand();
      var size = min + rand() * (max - min);
      var bar = shape >= 0.38 && shape < 0.72;
      var el = document.createElement('i');
      el.className = 'pf-c' + (shape < 0.38 ? ' pf-c--dot' : '');
      el.style.left = (rand() * 100).toFixed(1) + '%';
      el.style.top = (rand() * 100).toFixed(1) + '%';
      el.style.width = size.toFixed(1) + 'px';
      el.style.height = (bar ? size * 2.6 : size).toFixed(1) + 'px';
      el.style.background = COLORS[Math.floor(rand() * COLORS.length)];
      el.style.transform = 'rotate(' + Math.floor(rand() * 360) + 'deg)';
      frag.appendChild(el);
    }
    host.appendChild(frag);
  }
  scatter($('[data-confetti="far"]'), 70, 5, 10, rng(11));
  scatter($('[data-confetti="mid"]'), 26, 10, 18, rng(23));
  scatter($('[data-confetti="near"]'), 9, 30, 52, rng(37));

  // Pointer response: every plane moves by its own amount (--k), eased, only while the
  // pointer is over the hero. Additive: touch and keyboard visitors get the full composition.
  var hero = $('#top');
  if (hero && finePointer && !reduce) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var tick = function () {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      hero.style.setProperty('--px', cx.toFixed(3));
      hero.style.setProperty('--py', cy.toFixed(3));
      raf = (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(tick) : 0;
    };
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * -2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -2;
      if (!raf) raf = requestAnimationFrame(tick);
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  }

  // -------------------------------------------------------------- 4 · the round --
  // A real question from the game (server/src/data/questions.ts, round 1, question 3),
  // raced against three SAMPLE players. The scoring rule is the game's own
  // (server/src/GameManager.ts, calculatePoints): points = (players - order + 1) x 125,
  // where order counts correct answers only. The scoreboard lives in the page's header,
  // drops in when the round starts, and keeps the visitor's score for the rest of the page.
  var N = 4;                      // players in the sample game
  var SECONDS = 30;               // the game's time limit per question
  var CORRECT = 'B';
  var ANSWER_NAMES = { A: 'Indian Ocean', B: 'The Pacific Ocean', C: 'Arctic Ocean', D: 'Atlantic Ocean' };
  var points = function (order) { return (N - order + 1) * 125; };
  var ordinal = function (n) { return ['', '1st', '2nd', '3rd', '4th'][n] || n + 'th'; };

  var PLAYERS = [
    { id: 'you',  name: 'You',  av: '🦁', pts: 0 },
    { id: 'mia',  name: 'Mia',  av: '🦊', pts: 0 },
    { id: 'dev',  name: 'Dev',  av: '🐻', pts: 0 },
    { id: 'nana', name: 'Nana', av: '🐯', pts: 0 }
  ];
  // When each sample player answers, and what they pick.
  var BOTS = [{ id: 'mia', at: 4.2, pick: 'B' }, { id: 'dev', at: 9, pick: 'A' }, { id: 'nana', at: 15.5, pick: 'B' }];

  var board = $('#board'), chipsEl = $('#boardChips'), fuse = $('#fuse'), clockEl = $('.pf-clock');
  var clockNum = $('#clock'), resultEl = $('#result'), youLine = $('#youLine');
  var answerBtns = $$('#answers .pf-ans'), roundEl = $('#round'), barsEl = $('.pf-bars');
  var chipEls = {};
  var CLOCK_HTML = clockEl ? clockEl.innerHTML : '';

  var state = { started: false, ended: false, order: 0, pick: null, youOrder: 0, youGain: 0, answered: 0, t0: 0, raf: 0, timers: [], inView: false };

  function buildChips() {
    chipsEl.textContent = '';
    PLAYERS.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'pf-chip' + (p.id === 'you' ? ' is-you' : '');
      li.innerHTML = '<span class="pf-chip__av"></span><span class="pf-chip__name"></span><span class="pf-chip__pts">0</span>';
      li.children[0].textContent = p.av; li.children[1].textContent = p.name;
      chipEls[p.id] = li; chipsEl.appendChild(li);
    });
  }

  function tween(el, from, to) {
    if (reduce || from === to) { el.textContent = to; return; }
    var t0 = performance.now();
    (function step(now) {
      var k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // Re-sort the board by score. The chips slide to their new places (FLIP: transform only).
  function renderBoard(animate) {
    var sorted = PLAYERS.slice().sort(function (a, b) { return b.pts - a.pts || PLAYERS.indexOf(a) - PLAYERS.indexOf(b); });
    var move = animate && !reduce;
    var first = {};
    if (move) sorted.forEach(function (p) { first[p.id] = chipEls[p.id].getBoundingClientRect().left; });
    sorted.forEach(function (p) {
      var el = chipEls[p.id], pts = el.querySelector('.pf-chip__pts');
      tween(pts, parseInt(pts.textContent, 10) || 0, p.pts);
      chipsEl.appendChild(el);
    });
    if (move) sorted.forEach(function (p) {
      var el = chipEls[p.id], dx = first[p.id] - el.getBoundingClientRect().left;
      if (Math.abs(dx) < 1) return;
      el.style.transition = 'none';
      el.style.transform = 'translate3d(' + dx + 'px,0,0)';
      el.getBoundingClientRect();
      el.style.transition = 'transform 460ms cubic-bezier(0.32, 0.72, 0, 1)';
      el.style.transform = '';
    });
  }

  function say(text) { resultEl.textContent = text; }

  function playerAnswered(id, pick) {
    var p = PLAYERS.filter(function (x) { return x.id === id; })[0];
    state.answered += 1;
    if (pick === CORRECT) {
      state.order += 1;                       // order counts correct answers only, as in the game
      var gain = points(state.order);
      p.pts += gain;
      if (id === 'you') { state.youOrder = state.order; state.youGain = gain; }
    }
    renderBoard(true);
    if (state.answered === N) finish();       // the question ends early once everyone has answered
  }

  function frame(now) {
    var left = Math.max(0, SECONDS - (now - state.t0) / 1000);
    fuse.style.transform = 'scaleX(' + (left / SECONDS).toFixed(4) + ')';
    fuse.classList.toggle('is-low', left < 8);
    clockNum.textContent = Math.ceil(left);
    if (left <= 0) { finish(); return; }
    state.raf = requestAnimationFrame(frame);
  }

  function start() {
    if (state.started) return;
    state.started = true;
    state.t0 = performance.now();
    board.classList.add('is-on');
    state.raf = requestAnimationFrame(frame);
    BOTS.forEach(function (b) {
      state.timers.push(setTimeout(function () { if (!state.ended) playerAnswered(b.id, b.pick); }, b.at * 1000));
    });
  }

  function finish() {
    if (state.ended) return;
    state.ended = true;
    cancelAnimationFrame(state.raf);
    state.timers.forEach(clearTimeout);
    answerBtns.forEach(function (b) {
      b.disabled = true;
      var opt = b.getAttribute('data-opt');
      b.classList.toggle('is-correct', opt === CORRECT);
      b.classList.toggle('is-dim', opt !== CORRECT && opt !== state.pick);
    });
    if (clockEl) clockEl.textContent = 'Question over';
    var name = ANSWER_NAMES[CORRECT];
    if (state.youOrder) {
      say('Correct! You were ' + ordinal(state.youOrder) + ' to answer right, so ' + (N - state.youOrder + 1) + ' × 125 = ' + state.youGain + ' points.');
    } else if (state.pick) {
      say('Not this time. ' + name + ' was right, so no points.');
    } else {
      say('Time is up. ' + name + ' was the answer.');
    }
    // Carry the result into the next section.
    if (youLine) {
      youLine.hidden = false;
      youLine.textContent = state.youOrder
        ? 'You were ' + ordinal(state.youOrder) + ' to answer right a moment ago: ' + (N - state.youOrder + 1) + ' × 125 = ' + state.youGain + ' points.'
        : 'You did not score on the sample question. Wrong or missing answers earn nothing.';
    }
    $$('li', barsEl).forEach(function (li, i) { li.classList.toggle('is-you', state.youOrder === i + 1); });
    var again = $('#again'); if (again) again.hidden = false;
  }

  function youAnswer(opt) {
    if (state.ended || state.pick || !ANSWER_NAMES[opt]) return;
    start();
    state.pick = opt;
    answerBtns.forEach(function (b) {
      var mine = b.getAttribute('data-opt') === opt;
      b.disabled = true;
      b.classList.toggle('is-picked', mine);
      b.classList.toggle('is-dim', !mine);
    });
    say('Locked in. Now the sample players answer…');
    playerAnswered('you', opt);
  }

  function reset() {
    cancelAnimationFrame(state.raf); state.timers.forEach(clearTimeout);
    state = { started: false, ended: false, order: 0, pick: null, youOrder: 0, youGain: 0, answered: 0, t0: 0, raf: 0, timers: [], inView: state.inView };
    PLAYERS.forEach(function (p) { p.pts = 0; });
    renderBoard(false);
    answerBtns.forEach(function (b) { b.disabled = false; b.classList.remove('is-picked', 'is-dim', 'is-correct'); });
    if (clockEl) clockEl.innerHTML = CLOCK_HTML;
    clockNum = $('#clock'); clockNum.textContent = SECONDS;
    fuse.style.transform = 'scaleX(1)'; fuse.classList.remove('is-low');
    say('Tap an answer before the sample players do.');
    if (youLine) youLine.hidden = true;
    $$('li', barsEl).forEach(function (li) { li.classList.remove('is-you'); });
    var again = $('#again'); if (again) again.hidden = true;
    start();
  }

  if (board && chipsEl && fuse && roundEl && answerBtns.length) {
    buildChips();
    answerBtns.forEach(function (b) { b.addEventListener('click', function () { youAnswer(b.getAttribute('data-opt')); }); });
    var again = $('#again'); if (again) again.addEventListener('click', reset);

    // Press A, B, C or D while the question is on screen.
    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || !state.inView) return;
      var tag = (e.target && e.target.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      var opt = (e.key || '').toUpperCase();
      if (ANSWER_NAMES[opt]) youAnswer(opt);
    });

    if ('IntersectionObserver' in window) {
      // The round begins when the question is properly on screen.
      var startIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting && en.intersectionRatio >= 0.6) { start(); startIO.disconnect(); } });
      }, { threshold: [0.6] });
      startIO.observe($('.pf-q__in'));
      new IntersectionObserver(function (entries) { state.inView = entries[0].isIntersecting; }, { threshold: [0.25] }).observe(roundEl);
    } else { state.inView = true; start(); }
  }

  // ---------------------------------------------------------- 6 · Game Master --
  // The game's own rule, playable: one +100 or -100 per player per round, never below zero.
  var gmScore = $('#gmScore'), gmMinus = $('#gmMinus'), gmPlus = $('#gmPlus'), gmHint = $('#gmHint'), gmNext = $('#gmNext');
  if (gmScore && gmMinus && gmPlus) {
    var gm = { pts: 250, used: false };
    var adjust = function (delta) {
      if (gm.used) return;
      var from = gm.pts;
      gm.pts = Math.max(0, gm.pts + delta);
      gm.used = true;
      tween(gmScore, from, gm.pts);
      gmMinus.disabled = gmPlus.disabled = true;
      gmHint.textContent = delta > 0
        ? 'Dev just received 100 bonus points. That is their one adjustment this round.'
        : 'Dev just lost 100 points. That is their one adjustment this round.';
      gmNext.hidden = false;
    };
    gmMinus.addEventListener('click', function () { adjust(-100); });
    gmPlus.addEventListener('click', function () { adjust(100); });
    gmNext.addEventListener('click', function () {
      gm.used = false; gmMinus.disabled = gmPlus.disabled = false; gmNext.hidden = true;
      gmHint.textContent = 'A new round. Dev can be adjusted once again.';
    });
  }

  // ------------------------------------------------------------- 9 · rejoin --
  var seat = $('#seat'), seatState = $('#seatState');
  if (seat && seatState) {
    var seatSet = function (s, text) { seat.setAttribute('data-state', s); seatState.textContent = text; };
    var runSeat = function () {
      if (reduce) { seatSet('in', 'Back in. Same seat, same score.'); return; }
      [[1500, 'lost', 'Connection lost'], [3000, 'retry', 'Reconnecting…'], [4300, 'in', 'Back in. Same seat, same score.']]
        .forEach(function (s) { setTimeout(function () { seatSet(s[1], s[2]); }, s[0]); });
    };
    if ('IntersectionObserver' in window) {
      var seatIO = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { runSeat(); seatIO.disconnect(); }
      }, { threshold: 0.6 });
      seatIO.observe(seat);
    } else { seatSet('in', 'Back in. Same seat, same score.'); }
  }
})();
