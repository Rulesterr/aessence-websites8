/* ============================================================
   Rino's Study Companion
   Tokyo clock + weather, to-do list, Pomodoro timer, progress.
   Vanilla JS, persisted to localStorage. No build step.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var STORE = "rino.study.v1";

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

  function tokyoParts() {
    var fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tokyo", hour12: false,
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    var p = {};
    fmt.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function tickClock() {
    var p = tokyoParts();
    clockEl.textContent = p.hour + ":" + p.minute + ":" + p.second;
    dateEl.textContent = p.weekday + ", " + p.day + " " + p.month + " " + p.year;
    var h = parseInt(p.hour, 10);
    var sub, wave;
    if (h < 5)       { sub = "Burning the midnight oil — be gentle with yourself."; wave = "🌙"; }
    else if (h < 12) { sub = "Good morning — a fresh start awaits."; wave = "🌸"; }
    else if (h < 17) { sub = "Good afternoon — let's make it count."; wave = "☀️"; }
    else if (h < 21) { sub = "Good evening — ready to focus?"; wave = "🌷"; }
    else             { sub = "Winding down — one more focused stretch?"; wave = "🌙"; }
    greetSub.textContent = sub;
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
  function wmo(code) { return WMO[code] || ["—","🌡️"]; }

  function loadWeather() {
    var url = "https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503" +
      "&current=temperature_2m,relative_humidity_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=Asia%2FTokyo&forecast_days=4";
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error("net"); return r.json(); })
      .then(renderWeather)
      .catch(function () {
        $("[data-cond]").textContent = "Weather unavailable right now.";
        $("[data-weather-icon]").textContent = "🌡️";
        $("[data-temp]").textContent = "—";
      });
  }
  function renderWeather(d) {
    var c = d.current, info = wmo(c.weather_code);
    $("[data-weather-icon]").textContent = info[1];
    $("[data-temp]").textContent = Math.round(c.temperature_2m) + "°C";
    $("[data-cond]").textContent = info[0];
    $("[data-humidity]").textContent = "Humidity " + c.relative_humidity_2m + "%";

    var fc = $("[data-forecast]");
    fc.innerHTML = "";
    var days = d.daily.time;
    for (var i = 1; i < days.length && i <= 3; i++) {
      var di = wmo(d.daily.weather_code[i]);
      var name = new Date(days[i] + "T00:00:00").toLocaleDateString("en-US", {
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
    todoCounter.textContent = state.todos.length
      ? open + " left of " + state.todos.length
      : "";
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
    return (h ? h + "h " : "") + m + "m";
  }
  function fmtSecs(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
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
      div.title = (p.type === "focus" ? "Focus " : "Break ") + Math.round(p.secs / 60) + " min";
      scheduleEl.appendChild(div);
    });
    var focusMin = s.cycles * s.focusLen;
    var breakMin = (s.cycles - 1) * s.breakLen;
    scheduleSummary.textContent =
      s.cycles + " × " + s.focusLen + "m focus + " + s.breakLen + "m breaks · " +
      fmtDur(focusMin) + " studying, " + fmtDur(focusMin + breakMin) + " total.";
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
    phaseLabel.textContent = isBreak ? "Break" : "Focus";
    cycleLabel.textContent = "Cycle " + currentFocusCycle() + " of " + s.cycles;
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
    chimePlay();
    if (idx >= phases.length - 1) {
      // session complete
      remaining = 0;
      paint();
      stop();
      setEditing(false);
      celebrate();
      idx = phases.length; // mark finished
      return;
    }
    idx++;
    remaining = phases[idx].secs;
    paint();
  }

  // Gentle two-note chime via Web Audio (no asset needed)
  var audioCtx = null;
  function chimePlay() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      [880, 1174.66].forEach(function (freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var t = audioCtx.currentTime + i * 0.18;
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.62);
      });
    } catch (e) { /* audio not available */ }
  }

  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", stop);
  $("[data-reset]").addEventListener("click", function () { readSettings(); resetTimer(); });
  editPlanBtn.addEventListener("click", function () { resetTimer(); });
  $("[data-skip]").addEventListener("click", function () {
    if (!phases.length) resetTimer();
    if (idx < phases.length - 1) { idx++; remaining = phases[idx].secs; paint(); }
    else { resetTimer(); }
  });

  /* ============================================================
     Progress
     ============================================================ */
  var progFill = $("[data-progress-fill]");
  var progPct = $("[data-progress-pct]");
  var progBar = $("[data-progress-bar]");
  var studiedEl = $("[data-studied]");
  var plannedEl = $("[data-planned]");
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
    studiedEl.textContent = fmtSecs(studied);
    plannedEl.textContent = fmtDur(planned / 60);

    var msg;
    if (pct === 0)        msg = "Let's begin whenever you're ready. 💜";
    else if (pct < 34)    msg = "You're off to a lovely start. Keep going! 🌱";
    else if (pct < 67)    msg = "Over a third done — you've got this. 🌿";
    else if (pct < 100)   msg = "So close now — finish strong. 🌸";
    else                  msg = "Goal reached — wonderful work today! 🎉💜";
    affirmEl.textContent = msg;
  }

  $("[data-reset-progress]").addEventListener("click", function () {
    state.studiedSeconds = 0;
    renderProgress();
    saveNow();
  });

  function celebrate() {
    affirmEl.textContent = "Session complete — take a well-earned breath. 🎉";
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

  /* ---------- Init ---------- */
  readSettings();
  renderSchedule();
  resetTimer();
  renderProgress();

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
      titleEl.textContent = MONTHS[shown.getMonth()] + " " + shown.getFullYear();
      var first = new Date(shown.getFullYear(), shown.getMonth(), 1);
      var gs = addD(sod(first), -first.getDay());
      var rs = gs, re = addD(gs, 42);
      var colors = dayColors(calData(), rs, re);
      var today = new Date();
      var html = "";
      DOWS.forEach(function (d) { html += '<span class="dow">' + d + "</span>"; });
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

    render();
  })();
})();
