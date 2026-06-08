/* ============================================================
   Rino's Study Companion
   Tokyo clock + weather, to-do list, Pomodoro timer, progress.
   Vanilla JS, persisted to localStorage. No build step.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var STORE = "rino.study.v1";

  /* ============================================================
     i18n — English / Japanese
     ============================================================ */
  var LANG_STORE = "rino.lang";
  var lang = (function () {
    try { return localStorage.getItem(LANG_STORE) === "ja" ? "ja" : "en"; } catch (e) { return "en"; }
  })();

  var DICT = {
    en: {
      greeting: "Hello, Rino!",
      tokyo: "Tokyo, Japan",
      openCal: "Open full calendar →",
      todos: "Today's to-dos",
      add: "Add",
      todoPlaceholder: "What would you like to get done?",
      todoEmpty: "Nothing here yet — add your first task above. 🌿",
      progressTitle: "Your progress",
      reset: "Reset",
      focusTimer: "Focus timer",
      editPlan: "Edit plan",
      studyFor: "Study for",
      enter: "Enter",
      hUnit: "h", mUnit: "m",
      focus: "Focus", breakLabel: "Break", cyclesLabel: "Cycles",
      start: "Start", pause: "Pause", skip: "Skip",
      footer: "Made with care for focused study",
      weatherLoading: "Loading weather…",
      weatherUnavailable: "Weather unavailable right now.",
      humidityLabel: "Humidity",
      subs: [
        "Burning the midnight oil — be gentle with yourself.",
        "Good morning — a fresh start awaits.",
        "Good afternoon — let's make it count.",
        "Good evening — ready to focus?",
        "Winding down — one more focused stretch?",
      ],
      cycleOf: function (a, b) { return "Cycle " + a + " of " + b; },
      leftOf: function (a, b) { return a + " left of " + b; },
      scheduleSummary: function (c, f, b, study, total) {
        return c + " × " + f + "m focus + " + b + "m breaks · " + study + " studying, " + total + " total.";
      },
      studiedLine: function (v) { return "<strong>" + v + "</strong> studied"; },
      plannedLine: function (v) { return "of <strong>" + v + "</strong> planned"; },
      affirms: [
        "Let's begin whenever you're ready. 💜",
        "You're off to a lovely start. Keep going! 🌱",
        "Over a third done — you've got this. 🌿",
        "So close now — finish strong. 🌸",
        "Goal reached — wonderful work today! 🎉💜",
      ],
      sessionDone: "Session complete — take a well-earned breath. 🎉",
    },
    ja: {
      greeting: "こんにちは、Rino！",
      tokyo: "東京、日本",
      openCal: "カレンダーを開く →",
      todos: "今日のやること",
      add: "追加",
      todoPlaceholder: "何を終わらせたいですか？",
      todoEmpty: "まだありません — 上から最初のタスクを追加しましょう。🌿",
      progressTitle: "学習の進捗",
      reset: "リセット",
      focusTimer: "集中タイマー",
      editPlan: "プラン編集",
      studyFor: "勉強時間",
      enter: "決定",
      hUnit: "時間", mUnit: "分",
      focus: "集中", breakLabel: "休憩", cyclesLabel: "サイクル",
      start: "開始", pause: "一時停止", skip: "スキップ",
      footer: "集中して学べるよう、心を込めて",
      weatherLoading: "天気を読み込み中…",
      weatherUnavailable: "現在、天気を取得できません。",
      humidityLabel: "湿度",
      subs: [
        "夜更かし中 — 無理せずいきましょう。",
        "おはよう — 新しい一日の始まりです。",
        "こんにちは — 今日も頑張りましょう。",
        "こんばんは — 集中する準備はいい？",
        "そろそろ終わり — もうひと頑張りする？",
      ],
      cycleOf: function (a, b) { return "サイクル " + a + " / " + b; },
      leftOf: function (a, b) { return "残り " + a + " / " + b; },
      scheduleSummary: function (c, f, b, study, total) {
        return c + "×" + f + "分集中 ＋ " + b + "分休憩 · 勉強" + study + "、合計" + total + "。";
      },
      studiedLine: function (v) { return "<strong>" + v + "</strong> 勉強しました"; },
      plannedLine: function (v) { return "目標 <strong>" + v + "</strong>"; },
      affirms: [
        "準備ができたら始めましょう。💜",
        "良いスタートです。その調子！🌱",
        "3分の1を達成 — いい調子です。🌿",
        "あと少し — 最後まで頑張って。🌸",
        "目標達成 — 今日もよく頑張りました！🎉💜",
      ],
      sessionDone: "セッション完了 — ひと息つきましょう。🎉",
    },
  };
  function L() { return DICT[lang]; }
  var miniCalRender = null; // set by the mini-calendar module; re-rendered on lang change

  function applyStaticI18n() {
    var d = L();
    $$("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (typeof d[k] === "string") el.textContent = d[k];
    });
    $$("[data-i18n-ph]").forEach(function (el) {
      var k = el.getAttribute("data-i18n-ph");
      if (typeof d[k] === "string") el.placeholder = d[k];
    });
  }
  function updateLangToggle() {
    $$("[data-lang-switch] button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-lang") === lang);
    });
  }
  function applyLang(newLang) {
    lang = newLang === "ja" ? "ja" : "en";
    try { localStorage.setItem(LANG_STORE, lang); } catch (e) {}
    document.documentElement.lang = lang;
    applyStaticI18n();
    updateLangToggle();
    tickClock();
    renderTodos();
    renderSchedule();
    if (phases && phases.length) paint();
    renderProgress();
    refreshWeatherText();
    if (miniCalRender) miniCalRender();
  }

  /* ---------- Persistence ---------- */
  var state = loadState();
  function loadState() {
    var defaults = {
      todos: [],
      settings: { hours: 3, mins: 0, focusLen: 25, breakLen: 5, cycles: 3 },
      studiedSeconds: 0,
    };
    try {
      var saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && typeof saved === "object") {
        return Object.assign(defaults, saved, {
          settings: Object.assign(defaults.settings, saved.settings || {}),
          todos: Array.isArray(saved.todos) ? saved.todos : [],
        });
      }
    } catch (e) { /* ignore corrupt storage */ }
    return defaults;
  }
  var saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
    }, 200);
  }
  function saveNow() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- Year ---------- */
  $("[data-year]").textContent = new Date().getFullYear();

  /* ============================================================
     Tokyo clock + greeting
     ============================================================ */
  var clockEl = $("[data-clock]");
  var dateEl = $("[data-date]");
  var greetSub = $("[data-greeting-sub]");

  function tokyoTime() {
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo", hour12: false,
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    var p = {};
    fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function tokyoDateStr() {
    var d = new Date();
    if (lang === "ja") {
      var fj = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", weekday: "short",
      });
      var pj = {};
      fj.formatToParts(d).forEach(function (x) { pj[x.type] = x.value; });
      return pj.year + "年" + pj.month + "月" + pj.day + "日（" + pj.weekday + "）";
    }
    var fe = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo", weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    var pe = {};
    fe.formatToParts(d).forEach(function (x) { pe[x.type] = x.value; });
    return pe.weekday + ", " + pe.day + " " + pe.month + " " + pe.year;
  }
  function tickClock() {
    var t = tokyoTime();
    clockEl.textContent = t.hour + ":" + t.minute + ":" + t.second;
    dateEl.textContent = tokyoDateStr();
    var h = parseInt(t.hour, 10);
    var i, wave;
    if (h < 5)       { i = 0; wave = "🌙"; }
    else if (h < 12) { i = 1; wave = "🌸"; }
    else if (h < 17) { i = 2; wave = "☀️"; }
    else if (h < 21) { i = 3; wave = "🌷"; }
    else             { i = 4; wave = "🌙"; }
    greetSub.textContent = L().subs[i];
    $(".wave").textContent = wave;
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ============================================================
     Weather — Open-Meteo (no key required)
     ============================================================ */
  var WMO = {
    0:["Clear sky","☀️"],1:["Mainly clear","🌤️"],2:["Partly cloudy","⛅"],3:["Overcast","☁️"],
    45:["Fog","🌫️"],48:["Rime fog","🌫️"],
    51:["Light drizzle","🌦️"],53:["Drizzle","🌦️"],55:["Dense drizzle","🌦️"],
    56:["Freezing drizzle","🌧️"],57:["Freezing drizzle","🌧️"],
    61:["Light rain","🌧️"],63:["Rain","🌧️"],65:["Heavy rain","🌧️"],
    66:["Freezing rain","🌧️"],67:["Freezing rain","🌧️"],
    71:["Light snow","🌨️"],73:["Snow","🌨️"],75:["Heavy snow","❄️"],77:["Snow grains","🌨️"],
    80:["Light showers","🌦️"],81:["Showers","🌦️"],82:["Heavy showers","⛈️"],
    85:["Snow showers","🌨️"],86:["Snow showers","🌨️"],
    95:["Thunderstorm","⛈️"],96:["Thunderstorm","⛈️"],99:["Thunderstorm","⛈️"],
  };
  var WMO_JA = {
    0: "快晴", 1: "おおむね晴れ", 2: "一部曇り", 3: "曇り",
    45: "霧", 48: "霧氷",
    51: "弱い霧雨", 53: "霧雨", 55: "強い霧雨",
    56: "着氷性の霧雨", 57: "着氷性の霧雨",
    61: "弱い雨", 63: "雨", 65: "強い雨",
    66: "着氷性の雨", 67: "着氷性の雨",
    71: "弱い雪", 73: "雪", 75: "強い雪", 77: "霧雪",
    80: "弱いにわか雨", 81: "にわか雨", 82: "激しいにわか雨",
    85: "にわか雪", 86: "にわか雪",
    95: "雷雨", 96: "雷雨", 99: "雷雨",
  };
  function wmo(code) {
    var e = WMO[code] || ["—", "🌡️"];
    var name = lang === "ja" ? (WMO_JA[code] || "—") : e[0];
    return [name, e[1]];
  }

  var lastWeather = null;
  var weatherState = "loading"; // "loading" | "ok" | "error"
  function loadWeather() {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503" +
      "&current=temperature_2m,relative_humidity_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=Asia%2FTokyo&forecast_days=4";
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("net"); return r.json(); })
      .then(function (d) { weatherState = "ok"; lastWeather = d; renderWeather(d); })
      .catch(function () { weatherState = "error"; renderWeatherError(); });
  }
  function renderWeatherError() {
    $("[data-cond]").textContent = L().weatherUnavailable;
    $("[data-weather-icon]").textContent = "🌡️";
    $("[data-temp]").textContent = "—";
    $("[data-humidity]").textContent = "";
    $("[data-forecast]").innerHTML = "";
  }
  function refreshWeatherText() {
    if (weatherState === "ok" && lastWeather) renderWeather(lastWeather);
    else if (weatherState === "error") renderWeatherError();
    else $("[data-cond]").textContent = L().weatherLoading;
  }
  function renderWeather(d) {
    var c = d.current, info = wmo(c.weather_code);
    $("[data-weather-icon]").textContent = info[1];
    $("[data-temp]").textContent = Math.round(c.temperature_2m) + "°C";
    $("[data-cond]").textContent = info[0];
    $("[data-humidity]").textContent = L().humidityLabel + " " + c.relative_humidity_2m + "%";

    var fc = $("[data-forecast]");
    fc.innerHTML = "";
    var days = d.daily.time;
    for (var i = 1; i < days.length && i <= 3; i++) {
      var di = wmo(d.daily.weather_code[i]);
      var name = new Date(days[i] + "T00:00:00").toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", {
        weekday: "short", timeZone: "Asia/Tokyo",
      });
      var li = document.createElement("li");
      li.innerHTML = '<span class="f-day">' + name + "</span>" +
        '<span class="f-ico" aria-hidden="true">' + di[1] + "</span>" +
        '<span class="f-temp">' + Math.round(d.daily.temperature_2m_max[i]) + "° / " +
        Math.round(d.daily.temperature_2m_min[i]) + "°</span>";
      fc.appendChild(li);
    }
  }
  loadWeather();
  setInterval(loadWeather, 10 * 60 * 1000); // refresh every 10 min

  /* ============================================================
     To-do list
     ============================================================ */
  var todoForm = $("[data-todo-form]");
  var todoInput = $("[data-todo-input]");
  var todoList = $("[data-todo-list]");
  var todoEmpty = $("[data-todo-empty]");
  var todoCounter = $("[data-todo-counter]");

  function renderTodos() {
    todoList.innerHTML = "";
    state.todos.forEach(function (t) {
      var li = document.createElement("li");
      li.className = "todo-item" + (t.done ? " done" : "");

      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "todo-check";
      cb.checked = t.done;
      cb.setAttribute("aria-label", "Mark complete");
      cb.addEventListener("change", function () {
        t.done = cb.checked; renderTodos(); save();
      });

      var span = document.createElement("span");
      span.className = "todo-text";
      span.textContent = t.text;

      var del = document.createElement("button");
      del.className = "todo-del";
      del.innerHTML = "&times;";
      del.setAttribute("aria-label", "Delete task");
      del.addEventListener("click", function () {
        state.todos = state.todos.filter(function (x) { return x.id !== t.id; });
        renderTodos(); save();
      });

      li.append(cb, span, del);
      todoList.appendChild(li);
    });

    var open = state.todos.filter(function (t) { return !t.done; }).length;
    todoEmpty.style.display = state.todos.length ? "none" : "block";
    todoCounter.textContent = state.todos.length ? L().leftOf(open, state.todos.length) : "";
  }

  todoForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = todoInput.value.trim();
    if (!text) return;
    state.todos.push({ id: Date.now() + "-" + Math.random().toString(36).slice(2, 7), text: text, done: false });
    todoInput.value = "";
    renderTodos(); save();
  });
  renderTodos();

  /* ============================================================
     Pomodoro setup
     ============================================================ */
  var elHours = $("[data-total-hours]");
  var elMins = $("[data-total-mins]");
  var elFocus = $("[data-focus-len]");
  var elBreak = $("[data-break-len]");
  var elCycles = $("[data-cycles]");
  var scheduleEl = $("[data-schedule]");
  var scheduleSummary = $("[data-schedule-summary]");

  // hydrate inputs from saved settings
  var s = state.settings;
  elHours.value = s.hours; elMins.value = s.mins;
  elFocus.value = s.focusLen; elBreak.value = s.breakLen; elCycles.value = s.cycles;

  function num(el, min, max, fb) {
    var v = parseInt(el.value, 10);
    if (isNaN(v)) v = fb;
    v = Math.max(min, Math.min(max, v));
    return v;
  }

  function readSettings() {
    s.hours = num(elHours, 0, 12, 0);
    s.mins = num(elMins, 0, 59, 0);
    s.focusLen = num(elFocus, 5, 90, 25);
    s.breakLen = num(elBreak, 1, 30, 5);
    s.cycles = num(elCycles, 1, 20, 3);
    return s;
  }

  // Build phase list: focus,break,focus,...,focus (no trailing break)
  function buildPhases() {
    var phases = [];
    for (var i = 0; i < s.cycles; i++) {
      phases.push({ type: "focus", secs: s.focusLen * 60 });
      if (i < s.cycles - 1) phases.push({ type: "break", secs: s.breakLen * 60 });
    }
    return phases;
  }

  function plannedFocusSeconds() { return s.cycles * s.focusLen * 60; }

  function fmtDur(totalMin) {
    var h = Math.floor(totalMin / 60), m = Math.round(totalMin % 60);
    if (lang === "ja") return (h ? h + "時間" : "") + m + "分";
    return (h ? h + "h " : "") + m + "m";
  }
  function fmtSecs(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (lang === "ja") { if (h) return h + "時間" + m + "分"; if (m) return m + "分"; return Math.floor(sec) + "秒"; }
    if (h) return h + "h " + m + "m";
    if (m) return m + "m";
    return Math.floor(sec) + "s";
  }

  function renderSchedule() {
    scheduleEl.innerHTML = "";
    var phases = buildPhases();
    phases.forEach(function (p) {
      var div = document.createElement("div");
      div.className = "blk blk-" + p.type;
      div.style.flex = p.secs;
      div.title = (p.type === "focus" ? L().focus : L().breakLabel) + " " + Math.round(p.secs / 60) + (lang === "ja" ? "分" : " min");
      scheduleEl.appendChild(div);
    });
    var focusMin = s.cycles * s.focusLen;
    var breakMin = (s.cycles - 1) * s.breakLen;
    scheduleSummary.textContent = L().scheduleSummary(
      s.cycles, s.focusLen, s.breakLen, fmtDur(focusMin), fmtDur(focusMin + breakMin)
    );
  }

  function suggestPlan() {
    readSettings();
    var totalFocus = s.hours * 60 + s.mins;
    if (totalFocus < s.focusLen) totalFocus = s.focusLen;
    s.cycles = Math.max(1, Math.min(20, Math.round(totalFocus / s.focusLen)));
    elCycles.value = s.cycles;
    onSettingsChanged(true);
  }

  function onSettingsChanged(rebuildTimer) {
    readSettings();
    renderSchedule();
    renderProgress();
    if (rebuildTimer && !running) resetTimer();
    save();
  }

  $("[data-suggest]").addEventListener("click", suggestPlan);
  [elHours, elMins, elFocus, elBreak, elCycles].forEach(function (el) {
    el.addEventListener("change", function () { onSettingsChanged(true); });
  });

  /* ============================================================
     Timer engine
     ============================================================ */
  var ring = $("[data-ring-progress]");
  var ringWrap = $(".ring-wrap");
  var ringTime = $("[data-ring-time]");
  var phaseLabel = $("[data-phase]");
  var cycleLabel = $("[data-cycle-label]");
  var startBtn = $("[data-start]");
  var pauseBtn = $("[data-pause]");
  var pomoSection = $("[data-pomodoro]");
  var editPlanBtn = $("[data-edit-plan]");
  var RING_LEN = 2 * Math.PI * 100;

  // Show/hide the plan-editing controls. They collapse while a session
  // is active (from Start until Reset or completion) to keep the timer compact.
  function setEditing(active) {
    pomoSection.classList.toggle("is-running", active);
    editPlanBtn.hidden = !active;
  }
  ring.style.strokeDasharray = RING_LEN;

  var phases = [];
  var idx = 0;
  var remaining = 0;
  var running = false;
  var loop = null;
  var lastTick = 0;

  function currentFocusCycle() {
    var f = 0;
    for (var i = 0; i <= idx && i < phases.length; i++) {
      if (phases[i].type === "focus") f++;
    }
    return Math.max(1, f);
  }

  function paint() {
    var phase = phases[idx];
    var mm = Math.floor(remaining / 60);
    var ss = Math.floor(remaining % 60);
    ringTime.textContent = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
    var frac = phase.secs ? remaining / phase.secs : 0;
    ring.style.strokeDashoffset = RING_LEN * (1 - frac);

    var isBreak = phase.type === "break";
    ringWrap.classList.toggle("break", isBreak);
    phaseLabel.textContent = isBreak ? L().breakLabel : L().focus;
    cycleLabel.textContent = L().cycleOf(currentFocusCycle(), s.cycles);
    document.title = ringTime.textContent + " · " + phaseLabel.textContent + " — Hello, Rino!";
  }

  function resetTimer() {
    stop();
    setEditing(false);
    phases = buildPhases();
    idx = 0;
    remaining = phases[0].secs;
    paint();
    document.title = "Hello, Rino! · Study Companion";
  }

  function stop() {
    running = false;
    if (loop) { clearInterval(loop); loop = null; }
    startBtn.hidden = false;
    pauseBtn.hidden = true;
    saveNow();
  }

  function start() {
    if (running) return;
    if (!phases.length) resetTimer();
    if (idx >= phases.length) { resetTimer(); }
    running = true;
    setEditing(true);
    lastTick = Date.now();
    startBtn.hidden = true;
    pauseBtn.hidden = false;
    loop = setInterval(tick, 200);
  }

  function tick() {
    var now = Date.now();
    var delta = (now - lastTick) / 1000;
    lastTick = now;
    remaining -= delta;

    if (phases[idx].type === "focus") {
      state.studiedSeconds += delta;
      renderProgress();
      save();
    }

    if (remaining <= 0) {
      advance();
    } else {
      paint();
    }
  }

  function advance() {
    if (idx >= phases.length - 1) {
      // session complete
      remaining = 0;
      paint();
      stop();
      setEditing(false);
      playSeq(SND.complete);
      celebrate();
      idx = phases.length; // mark finished
      return;
    }
    idx++;
    remaining = phases[idx].secs;
    announcePhase(); // chime for the phase we just entered (break / focus)
    paint();
  }

  /* ---------- Sound (Web Audio, no assets needed) ----------
     The AudioContext is unlocked on the Start click (a user gesture);
     phase-change chimes during the running timer then play reliably. */
  var audioCtx = null;
  function audioReady() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }
  // notes: array of { f: freq, t: startOffset, d: duration, g: gain, type }
  function playSeq(notes) {
    var ctx = audioReady();
    if (!ctx) return;
    notes.forEach(function (n) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      var t0 = ctx.currentTime + (n.t || 0);
      var dur = n.d || 0.45;
      var peak = n.g || 0.16;
      osc.type = n.type || "sine";
      osc.frequency.value = n.f;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    });
  }
  var SND = {
    start:      [{ f: 587.33, d: 0.12 }, { f: 880.00, t: 0.09, d: 0.16 }],                 // quick rising blip
    breakStart: [{ f: 880.00, d: 0.40 }, { f: 587.33, t: 0.20, d: 0.55 }],                 // descending → relax
    focusStart: [{ f: 587.33, d: 0.30 }, { f: 880.00, t: 0.17, d: 0.48 }],                 // rising → back to work
    complete:   [{ f: 523.25, d: 0.30 }, { f: 659.25, t: 0.16, d: 0.32 },
                 { f: 783.99, t: 0.32, d: 0.34 }, { f: 1046.50, t: 0.48, d: 0.55 }],       // celebratory arpeggio
  };
  // Chime for the phase the timer just entered: break starting vs. break ending (focus).
  function announcePhase() {
    if (!phases.length || idx >= phases.length) return;
    playSeq(phases[idx].type === "break" ? SND.breakStart : SND.focusStart);
  }

  startBtn.addEventListener("click", function () { playSeq(SND.start); start(); });
  pauseBtn.addEventListener("click", stop);
  $("[data-reset]").addEventListener("click", function () { readSettings(); resetTimer(); });
  editPlanBtn.addEventListener("click", function () { resetTimer(); });
  $("[data-skip]").addEventListener("click", function () {
    if (!phases.length) resetTimer();
    if (idx < phases.length - 1) { idx++; remaining = phases[idx].secs; announcePhase(); paint(); }
    else { resetTimer(); }
  });

  /* ============================================================
     Progress
     ============================================================ */
  var progFill = $("[data-progress-fill]");
  var progPct = $("[data-progress-pct]");
  var progBar = $("[data-progress-bar]");
  var studiedLineEl = $("[data-studied-line]");
  var plannedLineEl = $("[data-planned-line]");
  var affirmEl = $("[data-affirm]");
  var PRING_LEN = 2 * Math.PI * 68;
  progFill.style.strokeDasharray = PRING_LEN;

  function renderProgress() {
    var planned = plannedFocusSeconds();
    var studied = state.studiedSeconds;
    var pct = planned > 0 ? Math.min(100, (studied / planned) * 100) : 0;

    progFill.style.strokeDashoffset = PRING_LEN * (1 - pct / 100);
    progPct.textContent = Math.round(pct) + "%";
    progBar.style.width = pct + "%";
    studiedLineEl.innerHTML = L().studiedLine(fmtSecs(studied));
    plannedLineEl.innerHTML = L().plannedLine(fmtDur(planned / 60));

    var i;
    if (pct === 0)      i = 0;
    else if (pct < 34)  i = 1;
    else if (pct < 67)  i = 2;
    else if (pct < 100) i = 3;
    else                i = 4;
    affirmEl.textContent = L().affirms[i];
  }

  $("[data-reset-progress]").addEventListener("click", function () {
    state.studiedSeconds = 0;
    renderProgress();
    saveNow();
  });

  function celebrate() {
    affirmEl.textContent = L().sessionDone;
    // tiny burst of emoji petals
    var petals = ["🌸", "💜", "✨", "🌿", "🌷"];
    for (var i = 0; i < 18; i++) {
      (function (i) {
        var el = document.createElement("span");
        el.textContent = petals[i % petals.length];
        el.style.cssText =
          "position:fixed;left:" + (10 + Math.random() * 80) + "vw;top:-2rem;" +
          "font-size:" + (1 + Math.random() * 1.2) + "rem;pointer-events:none;z-index:99;" +
          "transition:transform 2.4s ease-in, opacity 2.4s ease-in;";
        document.body.appendChild(el);
        requestAnimationFrame(function () {
          el.style.transform = "translateY(105vh) rotate(" + (Math.random() * 540 - 270) + "deg)";
          el.style.opacity = "0";
        });
        setTimeout(function () { el.remove(); }, 2600);
      })(i);
    }
  }

  /* ---------- Language toggle ---------- */
  $$("[data-lang-switch] button").forEach(function (b) {
    b.addEventListener("click", function () {
      var target = b.getAttribute("data-lang");
      if (target !== lang) applyLang(target);
    });
  });

  /* ---------- Init ---------- */
  readSettings();
  renderSchedule();
  resetTimer();
  renderProgress();
  applyLang(lang); // localize everything to the saved/default language

  // persist on leave
  window.addEventListener("beforeunload", saveNow);

  /* ============================================================
     Mini calendar card — reads the full calendar's events
     (stored by calendar.js under "rino.calendar.v1") and shows a
     month with today highlighted and dots on days that have events.
     Clicking a day opens the full calendar on that date.
     ============================================================ */
  (function miniCal() {
    var grid = $("[data-cc-grid]");
    if (!grid) return;
    var titleEl = $("[data-cc-title]");
    var CAL_STORE = "rino.calendar.v1";
    var DOWS = ["S", "M", "T", "W", "T", "F", "S"];
    var MONTHS = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];
    var shown = new Date(); shown.setDate(1); shown.setHours(0, 0, 0, 0);

    function sod(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
    function addD(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function addM(d, n) { var x = new Date(d); x.setDate(1); x.setMonth(x.getMonth() + n); return x; }
    function same(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
    function p2(n) { return n < 10 ? "0" + n : "" + n; }
    function key(d) { return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }

    function calData() {
      try { var d = JSON.parse(localStorage.getItem(CAL_STORE)); if (d && d.events) return d; } catch (e) {}
      return { calendars: [], events: [], hidden: [] };
    }
    function colorOf(data, id) {
      var c = (data.calendars || []).filter(function (x) { return x.id === id; })[0];
      return c ? c.color : "#8c6fd1";
    }

    function mark(map, d, col) {
      var k = key(d);
      if (!map[k]) map[k] = [];
      if (map[k].length < 3 && map[k].indexOf(col) === -1) map[k].push(col);
    }
    function markRange(map, start, end, col, rs, re) {
      var d = sod(new Date(Math.max(start.getTime(), rs.getTime())));
      var guard = 0;
      while (d < end && d < re && guard < 70) {
        if (d >= rs) mark(map, d, col);
        d = addD(d, 1); guard++;
      }
    }
    function dayColors(data, rs, re) {
      var map = {};
      (data.events || []).forEach(function (ev) {
        if (data.hidden && data.hidden.indexOf(ev.calendarId) !== -1) return;
        var col = colorOf(data, ev.calendarId);
        var s0 = new Date(ev.start), e0 = new Date(ev.end), dur = e0 - s0;
        var rep = ev.repeat || "none";
        if (rep === "none") { markRange(map, s0, e0, col, rs, re); return; }
        var cur = new Date(s0), i = 0;
        while (cur < re && i < 800) {
          var oe = new Date(cur.getTime() + dur);
          if (oe > rs) markRange(map, cur, oe, col, rs, re);
          if (rep === "daily") cur = addD(cur, 1);
          else if (rep === "weekly") cur = addD(cur, 7);
          else if (rep === "monthly") cur = addM(cur, 1);
          else if (rep === "yearly") cur = addM(cur, 12);
          else break;
          i++;
        }
      });
      return map;
    }

    function render() {
      var ja = lang === "ja";
      titleEl.textContent = ja
        ? shown.getFullYear() + "年" + (shown.getMonth() + 1) + "月"
        : MONTHS[shown.getMonth()] + " " + shown.getFullYear();
      var dows = ja ? ["日", "月", "火", "水", "木", "金", "土"] : DOWS;
      var first = new Date(shown.getFullYear(), shown.getMonth(), 1);
      var gs = addD(sod(first), -first.getDay());
      var rs = gs, re = addD(gs, 42);
      var colors = dayColors(calData(), rs, re);
      var today = new Date();
      var html = "";
      dows.forEach(function (d) { html += '<span class="dow">' + d + "</span>"; });
      for (var i = 0; i < 42; i++) {
        var day = addD(gs, i);
        var cls = "cc-day";
        if (day.getMonth() !== shown.getMonth()) cls += " muted";
        if (same(day, today)) cls += " today";
        var dots = (colors[key(day)] || []).map(function (c) {
          return '<span class="cc-dot" style="background:' + c + '"></span>';
        }).join("");
        html += '<div class="' + cls + '" data-cc-day="' + day.getTime() + '"><span>' + day.getDate() +
          '</span><span class="cc-dots">' + dots + "</span></div>";
      }
      grid.innerHTML = html;
    }

    $("[data-cc-prev]").addEventListener("click", function () { shown = addM(shown, -1); render(); });
    $("[data-cc-next]").addEventListener("click", function () { shown = addM(shown, 1); render(); });
    grid.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cc-day]");
      if (!c) return;
      var d = new Date(+c.dataset.ccDay);
      window.location.href = "calendar.html#" + d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
    });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });

    miniCalRender = render;
    render();
  })();
})();
