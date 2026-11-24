/*
 * Deal Room: a short training game for sellers. A notebook lists customer deals; each deal
 * opens its own room for one round: read the account, pitch or pass, pick an opener, handle
 * the pushback, bring proof, and run a FluffyJaws task. Every answer links to a play or a
 * piece of collateral, and the notebook keeps the top 3 takeaways of each deal.
 *
 * Block content (key | value rows):
 *   source | link to the data spreadsheet (default: "<page path>-data")
 *
 * The spreadsheet has these sheets (column names are case-insensitive):
 *   deals:      id | level | company | industry | room | signals | arr | call | call why
 *               | won | lost | takeaways
 *               room: boardroom, factory, cafe, shop, clinic, lobby, bank or video.
 *               call: pitch or pass. signals and takeaways: one per line.
 *   steps:      deal | step | who | question | answer | wrong | why | link | hint
 *               step: opener, pushback, proof or research (a FluffyJaws task).
 *               opener and proof answers are play or collateral ids or names.
 *               wrong: other options, separated by ";".
 *               research: with "wrong" the player picks an answer; without it the player
 *               types one, and "answer" lists the accepted keywords separated by ",".
 *               An empty question means "write your own prompt" (the hint guides it);
 *               [square brackets] in a question are blanks the player fills in.
 *               Research rows before the first other step run before "pitch or pass".
 *   plays:      id | name | summary | url
 *   collateral: id | name | kind | url
 *   texts:      key | text   (overrides the UI copy below)
 */

import buildScene from './scenes.js';

const TEXTS = {
  'notebook.title': 'My deals',
  'notebook.intro': 'Pick a deal. Pitch it or pass on it, and win the room.',
  'notebook.pipeline': 'Pipeline',
  'notebook.streak': 'Streak',
  'notebook.locked': 'Finish the deals above to unlock these.',
  'notebook.reset': 'Start a new notebook',
  'notebook.reset.confirm': 'Erase all results and start a new notebook?',
  'notebook.empty': 'No deals yet. Add rows to the deals sheet.',
  'notebook.replay': 'Replay',
  'level.1': 'Easy fits',
  'level.2': 'Mixed signals',
  'level.3': 'Competitive',
  'level.4': 'Buying committee',
  'level.5': 'Three audiences',
  'level.label': 'Level {level}',
  'mark.won': 'won {arr}',
  'mark.passed': 'good pass',
  'mark.stalled': 'stalled',
  'mark.lost': 'lost',
  'room.back': '← Notebook',
  'room.stake': '{arr} ARR on the table',
  'room.paused': 'Clock paused',
  'room.overtime': 'Over time',
  'brief.title': 'The account',
  'call.question': 'Pitch or pass?',
  'call.pitch': 'Pitch',
  'call.pass': 'Pass',
  'call.right.pitch': 'There’s a real deal here.',
  'call.right.pass': 'Not a deal for now.',
  'call.wrong.pitch': 'This one wasn’t ready to buy.',
  'call.wrong.pass': 'You walked away from a real deal.',
  'step.opener': 'Pick your opener',
  'step.pushback': 'Handle the pushback',
  'step.proof': 'Bring proof',
  'step.research': 'FluffyJaws task',
  'step.says': '{who} says',
  'step.for': 'Talking to: {who}',
  'answer.right': 'Right call',
  'answer.wrong': 'Not quite',
  'answer.why': 'Why:',
  'answer.continue': 'Continue',
  'answer.was': 'The answer: {answer}',
  'fj.full': 'Copy this prompt, run it in FluffyJaws and bring the answer back.',
  'fj.blanks': 'Fill in the blanks, copy the prompt and run it in FluffyJaws.',
  'fj.own': 'Write your own prompt and run it in FluffyJaws.',
  'fj.own.placeholder': 'Your prompt…',
  'fj.copy': 'Copy prompt',
  'fj.copied': 'Copied',
  'fj.open': 'Open FluffyJaws ↗',
  'fj.answer': 'What did FluffyJaws say?',
  'fj.answer.placeholder': 'Type the answer',
  'fj.check': 'Check',
  'fj.skip': 'Skip',
  'fluffyjaws.url': '',
  'outcome.masthead': 'The Deal Wire',
  'outcome.won': 'Won',
  'outcome.passed': 'Smart pass',
  'outcome.stalled': 'Stalled',
  'outcome.lost': 'Lost',
  'headline.won': '{company} signs with Adobe',
  'headline.passed': 'Seller passes on {company}, frees up the quarter',
  'headline.stalled': '{company} talks drag on with no decision',
  'headline.lost': '{company} goes with another vendor',
  'outcome.arr': '+{arr} to your pipeline',
  'outcome.fast': 'Includes a {bonus} fast-close bonus',
  'outcome.noarr': 'No pipeline added this time',
  'outcome.passarr': 'No pipeline, but your quarter is free for real deals',
  'outcome.used': 'Plays and collateral from this deal',
  'outcome.back': 'Back to the notebook',
  'outcome.allright': 'Every call landed.',
};

const STORE = 'deal-room-v1';
const ROUND_SECONDS = 90;
const FAST_BONUS = 0.1;
const STALLED_SHARE = 0;
const RANK = {
  won: 3, passed: 3, stalled: 1, lost: 0,
};

/* ---------- helpers ---------- */

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === null || v === undefined || v === false) return;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  });
  el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

/** Replaces an element's children, skipping empty values (replaceChildren prints "null"). */
const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter((k) => k || k === 0));

const SVGNS = 'http://www.w3.org/2000/svg';
function svgMark(paths, cls) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 40 32');
  svg.setAttribute('class', `dr-mark ${cls}`);
  svg.setAttribute('aria-hidden', 'true');
  paths.forEach((d) => {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('pathLength', '1');
    svg.append(p);
  });
  return svg;
}

const MARKS = {
  won: ['M5 17 C9 20 12 24 14 27 C19 17 26 9 36 3'],
  passed: ['M20 4 C8 4 4 12 5 18 C6 26 16 30 24 28 C34 25 37 14 31 8 C28 5 24 4 18 5',
    'M12 17 C14 19 16 21 17 23 C21 16 25 12 30 9'],
  stalled: ['M5 18 C10 10 15 10 20 16 C25 22 30 22 35 13'],
  lost: ['M8 5 C16 13 24 21 33 28', 'M33 5 C25 12 16 20 7 28'],
};

const norm = (t) => String(t ?? '').trim();
const lower = (row) => Object.fromEntries(
  Object.entries(row || {}).map(([k, v]) => [k.trim().toLowerCase(), norm(v)]),
);
const slug = (t) => norm(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lines = (t) => {
  const byLine = norm(t).split(/\r?\n/).map(norm).filter(Boolean);
  return byLine.length === 1 && byLine[0].includes(';')
    ? byLine[0].split(';').map(norm).filter(Boolean) : byLine;
};
const list = (t) => norm(t).split(/[;\n]/).map(norm).filter(Boolean);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function parseMoney(text) {
  const m = norm(text).replace(/,/g, '').match(/([\d.]+)\s*([km])?/i);
  if (!m) return 0;
  const mult = { k: 1e3, m: 1e6 }[(m[2] || '').toLowerCase()] || 1;
  return Math.round(parseFloat(m[1]) * mult) || 0;
}

function money(n) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n}`;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- data ---------- */

async function loadSheets(path) {
  try {
    const url = path.endsWith('.json') ? path : `${path}.json`;
    const resp = await fetch(url);
    if (!resp.ok) return {};
    const json = await resp.json();
    if (Array.isArray(json[':names'])) {
      return Object.fromEntries(json[':names'].map((name) => [
        name.toLowerCase(), (json[name]?.data || []).map(lower),
      ]));
    }
    return { deals: (json.data || []).map(lower) };
  } catch (e) {
    return {};
  }
}

const STEP_ALIASES = {
  opener: 'opener',
  play: 'opener',
  pushback: 'pushback',
  objection: 'pushback',
  proof: 'proof',
  collateral: 'proof',
  research: 'research',
  fluffyjaws: 'research',
  prompt: 'research',
};

function buildModel(sheets) {
  const index = (rows, kind) => {
    const map = new Map();
    (rows || []).forEach((r) => {
      const item = {
        kind, id: r.id || slug(r.name), name: r.name || r.id, summary: r.summary || '', label: r.kind || '', url: r.url || '',
      };
      if (!item.name) return;
      map.set(item.id.toLowerCase(), item);
      map.set(item.name.toLowerCase(), item);
    });
    return map;
  };
  const plays = index(sheets.plays, 'play');
  const collateral = index(sheets.collateral, 'collateral');
  const resolve = (ref) => {
    const key = norm(ref).toLowerCase();
    if (!key) return null;
    if (plays.has(key)) return plays.get(key);
    if (collateral.has(key)) return collateral.get(key);
    if (/^(https?:)?\//.test(key)) return { kind: 'link', name: ref, url: ref };
    return null;
  };

  const stepsByDeal = new Map();
  (sheets.steps || []).forEach((r) => {
    const type = STEP_ALIASES[(r.step || '').toLowerCase()];
    const dealId = (r.deal || '').toLowerCase();
    if (!type || !dealId) return;
    const step = {
      type, who: r.who, question: r.question, why: r.why, hint: r.hint, link: resolve(r.link),
    };
    if (type === 'research') {
      const wrong = list(r.wrong);
      step.mode = 'full';
      if (!step.question) step.mode = 'own';
      else if (/\[[^\]]+\]/.test(step.question)) step.mode = 'blanks';
      if (wrong.length) {
        step.check = 'choice';
        step.options = [{ text: r.answer, right: true }, ...wrong.map((t) => ({ text: t }))];
      } else {
        step.check = 'keyword';
        step.keywords = r.answer.split(',').map(norm).filter(Boolean);
      }
      step.answerText = step.check === 'choice' ? r.answer : step.keywords[0] || '';
    } else {
      const toOption = (t, right) => {
        const ref = type === 'pushback' ? null : resolve(t);
        return {
          text: ref ? ref.name : t, ref, right,
        };
      };
      step.options = [toOption(r.answer, true), ...list(r.wrong).map((t) => toOption(t, false))]
        .filter((o) => o.text);
      if (!step.options.some((o) => o.right)) return;
      step.answerText = step.options[0].text;
    }
    if (!stepsByDeal.has(dealId)) stepsByDeal.set(dealId, []);
    stepsByDeal.get(dealId).push(step);
  });

  const seen = new Set();
  const deals = (sheets.deals || []).filter((r) => r.company).map((r) => {
    let id = slug(r.id || r.company);
    while (seen.has(id)) id += '-x';
    seen.add(id);
    const all = stepsByDeal.get((r.id || '').toLowerCase()) || stepsByDeal.get(id) || [];
    const firstOther = all.findIndex((st) => st.type !== 'research');
    const pre = firstOther < 0 ? all : all.slice(0, firstOther);
    const steps = firstOther < 0 ? [] : all.slice(firstOther);
    const level = Math.min(Math.max(parseInt(r.level, 10) || 1, 1), 9);
    return {
      id,
      level,
      company: r.company,
      industry: r.industry,
      room: (r.room || 'boardroom').toLowerCase(),
      signals: lines(r.signals).slice(0, 4),
      arr: parseMoney(r.arr),
      call: /pass/i.test(r.call) ? 'pass' : 'pitch',
      callWhy: r['call why'] || r.why || '',
      won: r.won,
      lost: r.lost,
      takeaways: lines(r.takeaways).slice(0, 3),
      pre,
      steps,
    };
  });
  const texts = Object.fromEntries((sheets.texts || [])
    .map((r) => [r.key, r.text]).filter(([k, v]) => k && v));
  return { deals, texts };
}

/* ---------- progress ---------- */

function storeKey() {
  return `${STORE}:${window.location.pathname}`;
}

function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(storeKey()));
    if (data && typeof data === 'object') {
      return {
        results: {}, streak: 0, best: 0, ...data,
      };
    }
  } catch (e) {
    // corrupted or unavailable storage
  }
  return { results: {}, streak: 0, best: 0 };
}

function saveProgress(progress) {
  try {
    localStorage.setItem(storeKey(), JSON.stringify(progress));
  } catch (e) {
    // storage unavailable: progress lives only in memory
  }
}

/* ---------- block ---------- */

function readConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = slug(cells[0]?.textContent);
    const cell = cells[1] || cells[0];
    const link = cell?.querySelector('a');
    if (key) config[key] = link ? link.getAttribute('href') : norm(cell?.textContent);
  });
  return config;
}

export default async function decorate(block) {
  const config = readConfig(block);
  const pagePath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '/index');
  const source = (config.source || config.data || `${pagePath}-data`).replace(/\.html$/, '');
  block.replaceChildren(h('p', { class: 'dr-loading' }, 'Opening the notebook…'));

  const model = buildModel(await loadSheets(source));
  const T = (key, vars = {}) => {
    const t = key in model.texts ? model.texts[key] : TEXTS[key];
    return String(t ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  };
  const progress = loadProgress();
  const view = {};

  const pipeline = () => Object.values(progress.results).reduce((sum, r) => sum + (r.arr || 0), 0);
  const tally = (n) => {
    const wrap = h('span', { class: 'dr-tally', 'aria-label': String(n) });
    const groups = Math.floor(n / 5);
    for (let g = 0; g < groups; g += 1) wrap.append(h('span', { class: 'dr-tally-five' }));
    if (n % 5) wrap.append(h('span', { class: `dr-tally-rest dr-tally-${n % 5}` }));
    if (!n) wrap.append('–');
    return wrap;
  };

  /* ----- notebook ----- */

  view.notebook = (justDone) => {
    const levels = [...new Set(model.deals.map((d) => d.level))].sort((a, b) => a - b);
    const page = h('div', { class: 'dr-page' });
    page.append(h(
      'div',
      { class: 'dr-page-head' },
      h('div', {}, h('h1', { class: 'dr-hand dr-title' }, T('notebook.title')), h('p', { class: 'dr-intro' }, T('notebook.intro'))),
      h(
        'dl',
        { class: 'dr-stats' },
        h('div', {}, h('dt', {}, T('notebook.pipeline')), h('dd', { class: 'dr-hand' }, money(pipeline()))),
        h('div', {}, h('dt', {}, T('notebook.streak')), h('dd', {}, tally(progress.streak))),
      ),
    ));
    if (!model.deals.length) page.append(h('p', { class: 'dr-hand' }, T('notebook.empty')));

    let unlocked = true;
    levels.forEach((level) => {
      const deals = model.deals.filter((d) => d.level === level);
      const section = h('section', { class: `dr-level${unlocked ? '' : ' is-locked'}` });
      section.append(h(
        'h2',
        { class: 'dr-level-name' },
        h('span', {}, T('level.label', { level })),
        ` · ${T(`level.${level}`)}`,
      ));
      if (!unlocked) section.append(h('p', { class: 'dr-hand dr-locked-note' }, T('notebook.locked')));
      const ul = h('ul', { class: 'dr-deals' });
      deals.forEach((deal) => {
        const result = progress.results[deal.id];
        const fresh = justDone === deal.id && !reducedMotion();
        const li = h('li', { class: `dr-deal${result ? ` is-${result.outcome}` : ''}${fresh ? ' is-fresh' : ''}` });
        const mark = result
          ? svgMark(MARKS[result.outcome] || MARKS.won, `dr-mark-${result.outcome}`)
          : h('span', { class: 'dr-box', 'aria-hidden': 'true' });
        const label = result
          ? T(`mark.${result.outcome}`, { arr: money(result.arr || 0) }) : money(deal.arr);
        li.append(h(
          'button',
          {
            class: 'dr-deal-line',
            type: 'button',
            disabled: !unlocked,
            onclick: () => view.room(deal),
            'aria-label': `${deal.company}, ${deal.industry}. ${label}${result ? `. ${T('notebook.replay')}` : ''}`,
          },
          mark,
          h('span', { class: 'dr-hand dr-deal-name' }, deal.company),
          h('span', { class: 'dr-deal-meta' }, deal.industry),
          h('span', { class: 'dr-hand dr-deal-note' }, label),
        ));
        if (result && deal.takeaways.length) {
          li.append(h('ol', { class: 'dr-hand dr-takeaways' }, deal.takeaways.map((t, i) => h('li', { style: `--i:${i}` }, t))));
        }
        ul.append(li);
      });
      section.append(ul);
      page.append(section);
      if (deals.some((d) => !progress.results[d.id])) unlocked = false;
    });

    if (Object.keys(progress.results).length) {
      page.append(h('button', {
        class: 'dr-reset',
        type: 'button',
        onclick: () => {
          // eslint-disable-next-line no-alert
          if (!window.confirm(T('notebook.reset.confirm'))) return;
          progress.results = {};
          progress.streak = 0;
          saveProgress(progress);
          view.notebook();
        },
      }, T('notebook.reset')));
    }

    block.replaceChildren(h('div', { class: 'dr-notebook' }, h('div', { class: 'dr-binding', 'aria-hidden': 'true' }), page));
    const focus = justDone && block.querySelector('.is-fresh .dr-deal-line, .dr-deal-line');
    if (focus) {
      focus.focus({ preventScroll: true });
      focus.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    } else {
      block.scrollIntoView({ block: 'start' });
    }
  };

  /* ----- room ----- */

  view.room = (deal) => {
    const speakers = [...new Set([...deal.pre, ...deal.steps].map((st) => st.who).filter(Boolean))];
    const scene = buildScene(deal.room, Math.max(speakers.length, 1));
    const seq = [...deal.pre, { type: 'call' }, ...deal.steps];
    const round = {
      i: 0, misses: [], used: [], timeLeft: ROUND_SECONDS, paused: false, done: false,
    };

    const back = h('button', {
      class: 'dr-back',
      type: 'button',
      // eslint-disable-next-line no-use-before-define
      onclick: () => finishEarly(),
    }, T('room.back'));
    const timerBar = h('span', { class: 'dr-timer-fill' });
    const timerLabel = h('span', { class: 'dr-timer-label' });
    const dots = h('ol', { class: 'dr-dots', 'aria-hidden': 'true' }, seq.map(() => h('li')));
    const card = h('div', { class: 'dr-card', 'aria-live': 'polite' });
    const room = h(
      'div',
      { class: `dr-room dr-room-${deal.room}` },
      h(
        'div',
        { class: 'dr-topbar' },
        back,
        h('div', { class: 'dr-plaque' }, h('strong', {}, deal.company), h('span', {}, deal.industry)),
        h('div', { class: 'dr-stake' }, T('room.stake', { arr: money(deal.arr) })),
        h('div', { class: 'dr-timer', role: 'timer' }, timerBar, timerLabel),
        dots,
      ),
      h('div', { class: 'dr-stage' }, scene.svg),
      card,
    );

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      if (!round.paused && !round.done) {
        round.timeLeft = Math.max(0, round.timeLeft - (now - last) / 1000);
      }
      last = now;
      timerBar.style.setProperty('--left', String(round.timeLeft / ROUND_SECONDS));
      let label = `${Math.ceil(round.timeLeft)}s`;
      if (round.paused) label = T('room.paused');
      else if (round.timeLeft <= 0) label = T('room.overtime');
      timerLabel.textContent = label;
      room.classList.toggle('is-paused', round.paused);
      room.classList.toggle('is-overtime', round.timeLeft <= 0);
    };
    const timer = setInterval(tick, 250);
    function stopTimer() {
      round.done = true;
      clearInterval(timer);
      tick();
    }
    function finishEarly() {
      stopTimer();
      view.notebook();
    }

    const setDots = () => [...dots.children].forEach((li, k) => {
      li.className = k < round.i ? 'is-done' : '';
      if (k === round.i) li.className = 'is-current';
      if (round.misses.includes(k)) li.className += ' is-miss';
    });

    const remember = (ref) => {
      const known = round.used.some((u) => u.url === ref?.url && u.name === ref?.name);
      if (ref && !known) round.used.push(ref);
    };

    const linkChip = (ref) => (ref && ref.url ? h('a', {
      class: `dr-chip dr-chip-${ref.kind}`, href: ref.url, target: '_blank', rel: 'noopener',
    }, ref.name) : null);

    /** Records an answer, then shows the why and a continue button. */
    const settle = (right, why, ref, onNext, extra) => {
      if (right) {
        progress.streak += 1;
        progress.best = Math.max(progress.best, progress.streak);
      } else {
        progress.streak = 0;
        round.misses.push(round.i);
      }
      saveProgress(progress);
      setDots();
      remember(ref);
      const next = h('button', { class: 'dr-primary', type: 'button', onclick: onNext }, T('answer.continue'));
      card.append(h(
        'div',
        { class: `dr-feedback ${right ? 'is-right' : 'is-wrong'}` },
        h('p', { class: 'dr-feedback-head' }, right ? T('answer.right') : T('answer.wrong')),
        extra || null,
        why ? h('p', {}, h('strong', {}, `${T('answer.why')} `), why) : null,
        linkChip(ref),
        next,
      ));
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    };

    const options = (opts, onPick) => {
      const grid = h('div', { class: 'dr-options' });
      shuffle(opts).forEach((o) => {
        const btn = h(
          'button',
          {
            class: `dr-option${o.ref ? ` dr-option-${o.ref.kind}` : ''}`,
            type: 'button',
            onclick: () => {
              [...grid.children].forEach((b) => { b.disabled = true; });
              btn.classList.add('is-picked');
              grid.querySelector('.is-answer')?.classList.add('is-revealed');
              onPick(o);
            },
          },
          o.ref?.label ? h('span', { class: 'dr-option-kind' }, o.ref.label) : null,
          h('span', { class: 'dr-option-text' }, o.text),
          o.ref?.summary ? h('span', { class: 'dr-option-summary' }, o.ref.summary) : null,
        );
        if (o.right) btn.classList.add('is-answer');
        grid.append(btn);
      });
      return grid;
    };

    const heading = (kicker, who, says) => h(
      'div',
      { class: 'dr-step-head' },
      h('p', { class: 'dr-kicker' }, kicker),
      who ? h('p', { class: 'dr-who' }, T(says ? 'step.says' : 'step.for', { who })) : null,
    );

    const brief = () => h(
      'div',
      { class: 'dr-brief' },
      h('p', { class: 'dr-kicker' }, T('brief.title')),
      h('ul', {}, deal.signals.map((sig) => h('li', {}, sig))),
    );

    const advance = () => {
      round.i += 1;
      // eslint-disable-next-line no-use-before-define
      showStep();
    };

    const showCall = () => {
      scene.speak(-1);
      const pick = (choice) => {
        const right = choice === deal.call;
        [...card.querySelectorAll('.dr-call button')].forEach((b) => { b.disabled = true; });
        card.querySelector(`.dr-call-${choice}`).classList.add('is-picked', right ? 'is-right' : 'is-wrong');
        const headKey = right ? `call.right.${deal.call}` : `call.wrong.${choice}`;
        let outcome = null;
        if (right && deal.call === 'pass') outcome = 'passed';
        else if (!right) outcome = choice === 'pitch' ? 'stalled' : 'lost';
        settle(right, deal.callWhy, null, () => {
          // eslint-disable-next-line no-use-before-define
          if (outcome) finish(outcome, deal.callWhy);
          else advance();
        }, h('p', { class: 'dr-feedback-sub' }, T(headKey)));
      };
      fill(
        card,
        brief(),
        h('h2', { class: 'dr-question' }, T('call.question')),
        h(
          'div',
          { class: 'dr-call' },
          h('button', { class: 'dr-call-pitch', type: 'button', onclick: () => pick('pitch') }, T('call.pitch')),
          h('button', { class: 'dr-call-pass', type: 'button', onclick: () => pick('pass') }, T('call.pass')),
        ),
      );
      card.querySelector('.dr-call-pitch').focus({ preventScroll: true });
    };

    const showChoice = (step) => {
      scene.speak(step.who ? speakers.indexOf(step.who) : -1);
      fill(
        card,
        heading(T(`step.${step.type}`), step.who, step.type === 'pushback'),
        step.type === 'pushback'
          ? h('blockquote', { class: 'dr-quote' }, step.question)
          : h('h2', { class: 'dr-question' }, step.question || T(`step.${step.type}`)),
        options(step.options, (o) => {
          const answer = step.options.find((x) => x.right);
          remember(answer.ref);
          settle(o.right, step.why, step.link || answer.ref, advance);
        }),
      );
      card.querySelector('.dr-option')?.focus({ preventScroll: true });
    };

    const matches = (input, keywords) => {
      const text = norm(input).toLowerCase();
      if (!text) return false;
      return keywords.some((kw) => {
        const k = kw.toLowerCase();
        if (/^[\d.]+$/.test(k)) return (text.match(/[\d.]+/g) || []).some((n) => parseFloat(n) === parseFloat(k));
        const esc = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|[^a-z0-9])${esc}($|[^a-z0-9])`).test(text);
      });
    };

    const showResearch = (step) => {
      round.paused = true;
      tick();
      scene.speak(-1);
      const promptBox = h('div', { class: 'dr-prompt' });
      let compose;
      if (step.mode === 'own') {
        const area = h('textarea', { rows: 3, placeholder: T('fj.own.placeholder'), 'aria-label': T('fj.own.placeholder') });
        promptBox.append(area);
        compose = () => area.value;
      } else if (step.mode === 'blanks') {
        const parts = step.question.split(/(\[[^\]]+\])/);
        const p = h('p', {});
        const fields = [];
        parts.forEach((part) => {
          const m = part.match(/^\[([^\]]+)\]$/);
          if (m) {
            const input = h('input', {
              type: 'text', placeholder: m[1], 'aria-label': m[1], size: Math.max(m[1].length, 6),
            });
            fields.push(input);
            p.append(input);
          } else if (part) p.append(part);
        });
        promptBox.append(p);
        compose = () => {
          let k = 0;
          return parts.map((part) => {
            if (!/^\[[^\]]+\]$/.test(part)) return part;
            const v = norm(fields[k].value) || part.slice(1, -1);
            k += 1;
            return v;
          }).join('');
        };
      } else {
        promptBox.append(h('p', {}, step.question));
        compose = () => step.question;
      }
      const copy = h('button', {
        class: 'dr-secondary',
        type: 'button',
        onclick: async () => {
          try {
            await navigator.clipboard.writeText(compose());
            copy.textContent = T('fj.copied');
            setTimeout(() => { copy.textContent = T('fj.copy'); }, 1600);
          } catch (e) {
            copy.textContent = '⚠';
          }
        },
      }, T('fj.copy'));
      const fjUrl = T('fluffyjaws.url');
      const tools = h(
        'div',
        { class: 'dr-prompt-tools' },
        copy,
        fjUrl && fjUrl !== 'fluffyjaws.url' ? h('a', {
          class: 'dr-secondary', href: fjUrl, target: '_blank', rel: 'noopener',
        }, T('fj.open')) : null,
      );

      const resume = () => {
        round.paused = false;
        last = performance.now();
        advance();
      };
      let answerArea;
      if (step.check === 'choice') {
        answerArea = options(step.options, (o) => settle(o.right, step.why, step.link, resume));
      } else {
        const input = h('input', { type: 'text', placeholder: T('fj.answer.placeholder'), 'aria-label': T('fj.answer') });
        const form = h('form', { class: 'dr-answer' }, input);
        const lock = () => [...form.elements].forEach((el) => { el.disabled = true; });
        form.append(
          h('button', { class: 'dr-primary', type: 'submit' }, T('fj.check')),
          h('button', {
            class: 'dr-link',
            type: 'button',
            onclick: () => {
              lock();
              settle(false, step.why, step.link, resume, h('p', { class: 'dr-feedback-sub' }, T('answer.was', { answer: step.answerText })));
            },
          }, T('fj.skip')),
        );
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          if (!norm(input.value)) return;
          lock();
          const right = matches(input.value, step.keywords);
          settle(right, step.why, step.link, resume, right ? null : h('p', { class: 'dr-feedback-sub' }, T('answer.was', { answer: step.answerText })));
        });
        answerArea = form;
      }

      fill(
        card,
        round.i < deal.pre.length ? brief() : null,
        heading(T('step.research')),
        h('p', { class: 'dr-fj-lead' }, T(`fj.${step.mode}`)),
        step.hint ? h('p', { class: 'dr-hint' }, step.hint) : null,
        promptBox,
        tools,
        h('p', { class: 'dr-question dr-question-small' }, T('fj.answer')),
        answerArea,
      );
      (promptBox.querySelector('input, textarea') || copy).focus({ preventScroll: true });
    };

    function showStep() {
      setDots();
      if (room.getBoundingClientRect().top < -40) room.scrollIntoView({ block: 'start' });
      if (round.i >= seq.length) {
        // eslint-disable-next-line no-use-before-define
        finish(null);
        return;
      }
      const step = seq[round.i];
      if (step.type === 'call') showCall();
      else if (step.type === 'research') showResearch(step);
      else showChoice(step);
    }

    function finish(forced, forcedWhy) {
      stopTimer();
      scene.speak(-1);
      let outcome = forced;
      if (!outcome) {
        if (!round.misses.length) outcome = 'won';
        else outcome = round.misses.length === 1 ? 'stalled' : 'lost';
      }
      const fast = outcome === 'won' && round.timeLeft > 0;
      let arr = 0;
      if (outcome === 'won') arr = Math.round(deal.arr * (fast ? 1 + FAST_BONUS : 1));
      if (outcome === 'stalled' && !forced) arr = Math.round(deal.arr * STALLED_SHARE);
      const firstMiss = seq[round.misses.find((k) => seq[k].why)];
      let why = forcedWhy || firstMiss?.why || deal.callWhy;
      if (outcome === 'won') why = deal.callWhy || T('outcome.allright');

      const prev = progress.results[deal.id];
      if (!prev || RANK[outcome] > RANK[prev.outcome]
        || (RANK[outcome] === RANK[prev.outcome] && arr > (prev.arr || 0))) {
        progress.results[deal.id] = { outcome, arr, at: Date.now() };
      }
      saveProgress(progress);

      const headline = deal[outcome] || T(`headline.${outcome}`, { company: deal.company });
      const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
      let arrLine = T(outcome === 'passed' ? 'outcome.passarr' : 'outcome.noarr');
      if (arr) arrLine = T('outcome.arr', { arr: money(arr) });
      const backBtn = h('button', { class: 'dr-primary', type: 'button', onclick: () => view.notebook(deal.id) }, T('outcome.back'));
      fill(card, h(
        'article',
        { class: `dr-paper is-${outcome}` },
        h('div', { class: 'dr-masthead' }, h('span', {}, T('outcome.masthead')), h('span', {}, date)),
        h('p', { class: 'dr-paper-kicker' }, T(`outcome.${outcome}`)),
        h('h2', { class: 'dr-headline' }, headline),
        h('p', { class: 'dr-paper-why' }, why),
        h('p', { class: 'dr-paper-arr' }, arrLine, fast ? h('small', {}, T('outcome.fast', { bonus: `${FAST_BONUS * 100}%` })) : null),
        round.used.length ? h(
          'div',
          { class: 'dr-paper-used' },
          h('p', { class: 'dr-kicker' }, T('outcome.used')),
          h('div', { class: 'dr-chips' }, round.used.map(linkChip)),
        ) : null,
        backBtn,
      ));
      room.classList.add(`is-${outcome}`);
      backBtn.focus({ preventScroll: true });
    }

    block.replaceChildren(room);
    block.scrollIntoView({ block: 'start' });
    tick();
    showStep();
  };

  view.notebook();
}
