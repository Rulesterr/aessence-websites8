/* ============================================================
   Rino's Calendar
   Month / Week / Day views, event CRUD, multiple calendars,
   recurrence, search. Vanilla JS, localStorage. No backend.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var STORE = "rino.calendar.v1";

  var PALETTE = ["#8c6fd1", "#6cb3a0", "#e06c9f", "#6c9fe0", "#e0a96c", "#7bbf6a", "#c77dd6", "#e0556f"];

  /* ============================================================
     i18n — English / Japanese (shares "rino.lang" with the study page)
     ============================================================ */
  var LANG_STORE = "rino.lang";
  var lang = (function () {
    try { return localStorage.getItem(LANG_STORE) === "ja" ? "ja" : "en"; } catch (e) { return "en"; }
  })();
  var DICT = {
    en: {
      study: "← Study", calendar: "Calendar", myCalendars: "My Calendars",
      today: "Today", searchPh: "Search events", day: "Day", week: "Week", month: "Month",
      newEvent: "+ New Event", event: "Event", newEventTitle: "New event", editEvent: "Edit event",
      titlePh: "Title", allDay: "All-day", starts: "Starts", ends: "Ends", repeat: "Repeat",
      repNever: "Never", repDaily: "Every day", repWeekly: "Every week", repMonthly: "Every month", repYearly: "Every year",
      locationPh: "Location", notesPh: "Notes", del: "Delete", cancel: "Cancel", save: "Save",
      allday: "all-day", untitled: "Untitled", noEvents: "No events found",
      errTitle: "Please add a title.", errEnd: "End time must be after the start.",
      confirmDelCal: function (n) { return 'Delete "' + n + '" and its events?'; },
      confirmDelEvent: "Delete this event?", promptCal: "New calendar name:",
      more: function (n) { return "+" + n + " more"; },
      dowShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      defaults: { personal: "Personal", study: "Study", exams: "Exams" },
    },
    ja: {
      study: "← 勉強", calendar: "カレンダー", myCalendars: "マイカレンダー",
      today: "今日", searchPh: "予定を検索", day: "日", week: "週", month: "月",
      newEvent: "＋ 新しい予定", event: "予定", newEventTitle: "新しい予定", editEvent: "予定を編集",
      titlePh: "タイトル", allDay: "終日", starts: "開始", ends: "終了", repeat: "繰り返し",
      repNever: "なし", repDaily: "毎日", repWeekly: "毎週", repMonthly: "毎月", repYearly: "毎年",
      locationPh: "場所", notesPh: "メモ", del: "削除", cancel: "キャンセル", save: "保存",
      allday: "終日", untitled: "無題", noEvents: "予定が見つかりません",
      errTitle: "タイトルを入力してください。", errEnd: "終了は開始より後にしてください。",
      confirmDelCal: function (n) { return "「" + n + "」とその予定を削除しますか？"; },
      confirmDelEvent: "この予定を削除しますか？", promptCal: "新しいカレンダー名：",
      more: function (n) { return "他" + n + "件"; },
      dowShort: ["日", "月", "火", "水", "木", "金", "土"],
      defaults: { personal: "個人", study: "勉強", exams: "試験" },
    },
  };
  function L() { return DICT[lang]; }

  /* ---------- State ---------- */
  var state = load();
  function load() {
    var def = {
      calendars: [
        { id: "personal", name: L().defaults.personal, color: "#8c6fd1" },
        { id: "study", name: L().defaults.study, color: "#6cb3a0" },
        { id: "exams", name: L().defaults.exams, color: "#e06c9f" },
      ],
      events: [],
      hidden: [],
    };
    try {
      var s = JSON.parse(localStorage.getItem(STORE));
      if (s && s.calendars) return Object.assign(def, s);
    } catch (e) {}
    return def;
  }
  var saveT;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
    }, 150);
  }

  /* ---------- View state ---------- */
  var view = "month";              // 'day' | 'week' | 'month'
  var cursor = startOfDay(new Date()); // the focused date
  var miniCursor = new Date(cursor);   // mini-calendar month being shown

  /* ---------- Date helpers ---------- */
  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) {
    var x = new Date(d), day = x.getDate();
    x.setDate(1); x.setMonth(x.getMonth() + n);
    var max = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(day, max));
    return x;
  }
  function startOfWeek(d) { var x = startOfDay(d); return addDays(x, -x.getDay()); } // Sunday start
  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function isToday(d) { return sameDay(d, new Date()); }
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Localized labels & titles
  function dowName(i) { return L().dowShort[i]; }
  function monthTitle(d) {
    return lang === "ja" ? d.getFullYear() + "年" + (d.getMonth() + 1) + "月" : MON[d.getMonth()] + " " + d.getFullYear();
  }
  function dayTitle(d) {
    if (lang === "ja") return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日（" + L().dowShort[d.getDay()] + "）";
    return DOW[d.getDay()] + ", " + MON[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }
  function weekTitle(base) {
    var end = addDays(base, 6);
    if (lang === "ja") return base.getFullYear() + "年" + (base.getMonth() + 1) + "月" + base.getDate() + "日 – " + (end.getMonth() + 1) + "月" + end.getDate() + "日";
    return MON[base.getMonth()].slice(0, 3) + " " + base.getDate() + " – " + MON[end.getMonth()].slice(0, 3) + " " + end.getDate() + ", " + end.getFullYear();
  }
  function miniTitle(d) {
    return lang === "ja" ? d.getFullYear() + "年" + (d.getMonth() + 1) + "月" : MON[d.getMonth()].slice(0, 3) + " " + d.getFullYear();
  }
  function searchDate(d) {
    return lang === "ja" ? (d.getMonth() + 1) + "月" + d.getDate() + "日" : MON[d.getMonth()].slice(0, 3) + " " + d.getDate();
  }

  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    if (lang === "ja") return h + ":" + (m < 10 ? "0" + m : m);
    var ap = h < 12 ? "AM" : "PM";
    var hr = h % 12; if (hr === 0) hr = 12;
    return hr + (m ? ":" + (m < 10 ? "0" + m : m) : "") + " " + ap;
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function toDateInput(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function toTimeInput(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fromInputs(dateStr, timeStr) {
    var p = dateStr.split("-"), t = (timeStr || "00:00").split(":");
    return new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1], 0, 0);
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function calOf(id) { return state.calendars.filter(function (c) { return c.id === id; })[0]; }
  function colorOf(id) { var c = calOf(id); return c ? c.color : "#8c6fd1"; }

  /* ---------- Recurrence expansion ---------- */
  // Yields { start, end } occurrences of ev that intersect [rs, re)
  function occurrences(ev, rs, re) {
    var out = [];
    var s0 = new Date(ev.start), e0 = new Date(ev.end);
    var dur = e0 - s0;
    var rep = ev.repeat || "none";
    if (rep === "none") {
      if (e0 > rs && s0 < re) out.push({ start: s0, end: e0, ev: ev });
      return out;
    }
    var cur = new Date(s0), i = 0, MAX = 1500;
    while (cur < re && i < MAX) {
      var oe = new Date(cur.getTime() + dur);
      if (oe > rs) out.push({ start: new Date(cur), end: oe, ev: ev });
      if (rep === "daily") cur = addDays(cur, 1);
      else if (rep === "weekly") cur = addDays(cur, 7);
      else if (rep === "monthly") cur = addMonths(cur, 1);
      else if (rep === "yearly") cur = addMonths(cur, 12);
      else break;
      i++;
    }
    return out;
  }

  // All occurrences across visible calendars within [rs, re)
  function occurrencesInRange(rs, re) {
    var all = [];
    state.events.forEach(function (ev) {
      if (state.hidden.indexOf(ev.calendarId) !== -1) return;
      occurrences(ev, rs, re).forEach(function (o) { all.push(o); });
    });
    return all;
  }

  /* ============================================================
     Rendering
     ============================================================ */
  var surface = $("[data-surface]");
  var titleEl = $("[data-title]");

  function render() {
    $$("[data-view]").forEach(function (b) { b.classList.toggle("active", b.dataset.view === view); });
    if (view === "month") renderMonth();
    else renderTimeGrid(view === "week" ? 7 : 1);
    renderMini();
    renderCalList();
  }

  /* ---------- Month ---------- */
  function renderMonth() {
    titleEl.textContent = monthTitle(cursor);
    var first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    var gridStart = startOfWeek(first);
    var weeks = 6;
    var rs = gridStart, re = addDays(gridStart, weeks * 7);
    var occ = occurrencesInRange(rs, re);

    var html = '<div class="month"><div class="month-dow">';
    L().dowShort.forEach(function (d) { html += "<span>" + d + "</span>"; });
    html += '</div><div class="month-grid">';

    for (var i = 0; i < weeks * 7; i++) {
      var day = addDays(gridStart, i);
      var dayEnd = addDays(day, 1);
      var muted = day.getMonth() !== cursor.getMonth();
      var dayOcc = occ.filter(function (o) { return o.start < dayEnd && o.end > day; })
        .sort(function (a, b) {
          var aa = !!a.ev.allDay, bb = !!b.ev.allDay;
          if (aa !== bb) return aa ? -1 : 1;
          return a.start - b.start;
        });

      html += '<div class="m-cell' + (muted ? " muted" : "") + (isToday(day) ? " today" : "") +
        '" data-day="' + day.getTime() + '">';
      html += '<span class="num">' + day.getDate() + "</span>";

      var shown = dayOcc.slice(0, 3);
      shown.forEach(function (o) {
        var col = colorOf(o.ev.calendarId);
        if (o.ev.allDay) {
          html += '<div class="chip allday" data-evt="' + o.ev.id + '" style="background:' + col + '">' +
            '<span class="ct">' + esc(o.ev.title || L().untitled) + "</span></div>";
        } else {
          html += '<div class="chip timed" data-evt="' + o.ev.id + '">' +
            '<span class="cdot" style="background:' + col + '"></span>' +
            '<span class="ctime">' + fmtTime(o.start) + "</span>" +
            '<span class="ct">' + esc(o.ev.title || L().untitled) + "</span></div>";
        }
      });
      if (dayOcc.length > 3) {
        html += '<div class="m-more" data-goday="' + day.getTime() + '">' + L().more(dayOcc.length - 3) + "</div>";
      }
      html += "</div>";
    }
    html += "</div></div>";
    surface.innerHTML = html;
  }

  /* ---------- Week / Day time grid ---------- */
  var HOUR_H = 48;
  function renderTimeGrid(numDays) {
    var base = numDays === 7 ? startOfWeek(cursor) : startOfDay(cursor);
    var rs = base, re = addDays(base, numDays);
    var occ = occurrencesInRange(rs, re);

    titleEl.textContent = numDays === 7 ? weekTitle(base) : dayTitle(base);

    var cols = "60px repeat(" + numDays + ", 1fr)";

    // header
    var head = '<div class="tg-head" style="grid-template-columns:' + cols + '"><div class="gutter"></div>';
    for (var d = 0; d < numDays; d++) {
      var day = addDays(base, d);
      head += '<div class="dcol' + (isToday(day) ? " today" : "") + '">' +
        '<div class="dow">' + dowName(day.getDay()) + "</div>" +
        '<div class="dnum">' + day.getDate() + "</div></div>";
    }
    head += "</div>";

    // all-day band
    var ad = '<div class="tg-allday" style="grid-template-columns:' + cols + '"><div class="gutter">' + L().allday + "</div>";
    for (var d2 = 0; d2 < numDays; d2++) {
      var day2 = addDays(base, d2), day2e = addDays(day2, 1);
      ad += '<div class="ad-col" data-day="' + day2.getTime() + '">';
      occ.filter(function (o) { return o.ev.allDay && o.start < day2e && o.end > day2; })
        .forEach(function (o) {
          ad += '<div class="chip allday" data-evt="' + o.ev.id + '" style="background:' + colorOf(o.ev.calendarId) + '">' +
            '<span class="ct">' + esc(o.ev.title || L().untitled) + "</span></div>";
        });
      ad += "</div>";
    }
    ad += "</div>";

    // body
    var body = '<div class="tg-body"><div class="tg-scroll" style="grid-template-columns:' + cols + '">';
    // gutter hours
    body += '<div class="tg-gutter">';
    for (var h = 0; h < 24; h++) {
      body += '<div class="tg-hour"><span class="hr-label">' + (h === 0 ? "" : hourLabel(h)) + "</span></div>";
    }
    body += "</div>";

    for (var c = 0; c < numDays; c++) {
      var cday = addDays(base, c), cdaye = addDays(cday, 1);
      body += '<div class="tg-daycol" data-daycol="' + cday.getTime() + '">';
      for (var hh = 0; hh < 24; hh++) body += '<div class="tg-hour"></div>';

      // timed events of this day
      var items = occ.filter(function (o) {
        return !o.ev.allDay && o.start < cdaye && o.end > cday;
      });
      var laid = layoutDay(items, cday);
      laid.forEach(function (it) {
        var top = (it.startMin / 60) * HOUR_H;
        var height = Math.max(18, (it.durMin / 60) * HOUR_H - 2);
        var widthPct = 100 / it.cols;
        var leftPct = it.col * widthPct;
        body += '<div class="tg-event" data-evt="' + it.o.ev.id + '" style="top:' + top + "px;height:" + height +
          "px;left:calc(" + leftPct + "% + 2px);width:calc(" + widthPct + "% - 4px);background:" + colorOf(it.o.ev.calendarId) + '">' +
          '<div class="te-title">' + esc(it.o.ev.title || L().untitled) + "</div>" +
          '<div class="te-time">' + fmtTime(it.o.start) + "</div></div>";
      });

      if (isToday(cday)) {
        var now = new Date();
        var nm = now.getHours() * 60 + now.getMinutes();
        body += '<div class="now-line" style="top:' + (nm / 60 * HOUR_H) + 'px"></div>';
      }
      body += "</div>";
    }
    body += "</div></div>";

    surface.innerHTML = '<div class="timegrid">' + head + ad + body + "</div>";

    // scroll to ~8am or now
    var tb = $(".tg-body", surface);
    if (tb) {
      var nowM = new Date().getHours() * 60 + new Date().getMinutes();
      var target = (numDays === 1 || view === "week") ? Math.max(0, (nowM / 60 * HOUR_H) - 120) : 8 * HOUR_H;
      tb.scrollTop = target;
    }
  }

  function hourLabel(h) {
    if (lang === "ja") return h + "時";
    var ap = h < 12 ? "AM" : "PM"; var hr = h % 12; if (hr === 0) hr = 12;
    return hr + " " + ap;
  }

  // Column packing for overlapping events within one day
  function layoutDay(items, day) {
    var dayStart = day.getTime();
    var mapped = items.map(function (o) {
      var s = Math.max(o.start.getTime(), dayStart);
      var e = Math.min(o.end.getTime(), dayStart + 864e5);
      return { o: o, startMin: (s - dayStart) / 60000, endMin: (e - dayStart) / 60000 };
    }).map(function (m) { m.durMin = Math.max(15, m.endMin - m.startMin); return m; })
      .sort(function (a, b) { return a.startMin - b.startMin || a.endMin - b.endMin; });

    var result = [];
    var cluster = [], clusterEnd = -1;
    function flush() {
      if (!cluster.length) return;
      // assign columns greedily
      var colsEnd = []; // end time per column
      cluster.forEach(function (m) {
        var placed = false;
        for (var k = 0; k < colsEnd.length; k++) {
          if (m.startMin >= colsEnd[k]) { m.col = k; colsEnd[k] = m.startMin + m.durMin; placed = true; break; }
        }
        if (!placed) { m.col = colsEnd.length; colsEnd.push(m.startMin + m.durMin); }
      });
      var total = colsEnd.length;
      cluster.forEach(function (m) { m.cols = total; result.push(m); });
      cluster = []; clusterEnd = -1;
    }
    mapped.forEach(function (m) {
      if (cluster.length && m.startMin >= clusterEnd) flush();
      cluster.push(m);
      clusterEnd = Math.max(clusterEnd, m.startMin + m.durMin);
    });
    flush();
    return result;
  }

  /* ---------- Mini calendar ---------- */
  function renderMini() {
    var host = $("[data-mini]");
    var mc = miniCursor;
    var first = new Date(mc.getFullYear(), mc.getMonth(), 1);
    var gs = startOfWeek(first);
    var html = '<div class="mini-head"><button data-mini-prev aria-label="Previous month">‹</button>' +
      "<strong>" + miniTitle(mc) + "</strong>" +
      '<button data-mini-next aria-label="Next month">›</button></div><div class="mini-grid">';
    L().dowShort.forEach(function (d) { html += '<span class="dow">' + (lang === "ja" ? d : d[0]) + "</span>"; });
    for (var i = 0; i < 42; i++) {
      var day = addDays(gs, i);
      var cls = "day";
      if (day.getMonth() !== mc.getMonth()) cls += " muted";
      if (isToday(day)) cls += " today";
      if (sameDay(day, cursor)) cls += " sel";
      html += '<span class="' + cls + '" data-mini-day="' + day.getTime() + '">' + day.getDate() + "</span>";
    }
    html += "</div>";
    host.innerHTML = html;
  }

  /* ---------- Calendar list ---------- */
  function renderCalList() {
    var host = $("[data-cal-list]");
    host.innerHTML = "";
    state.calendars.forEach(function (c) {
      var off = state.hidden.indexOf(c.id) !== -1;
      var li = document.createElement("li");
      li.className = "cal-row" + (off ? " off" : "");
      li.innerHTML = '<span class="dot' + (off ? " off" : "") + '" style="background:' + c.color + '"></span>' +
        '<span class="name">' + esc(c.name) + "</span>" +
        (state.calendars.length > 1 ? '<button class="del" aria-label="Delete calendar" title="Delete calendar">×</button>' : "");
      li.addEventListener("click", function (e) {
        if (e.target.classList.contains("del")) {
          if (confirm(L().confirmDelCal(c.name))) {
            state.events = state.events.filter(function (ev) { return ev.calendarId !== c.id; });
            state.calendars = state.calendars.filter(function (x) { return x.id !== c.id; });
            state.hidden = state.hidden.filter(function (x) { return x !== c.id; });
            save(); render();
          }
          return;
        }
        toggleCal(c.id);
      });
      host.appendChild(li);
    });
  }
  function toggleCal(id) {
    var i = state.hidden.indexOf(id);
    if (i === -1) state.hidden.push(id); else state.hidden.splice(i, 1);
    save(); render();
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  /* ============================================================
     Event modal
     ============================================================ */
  var modal = $("[data-modal]");
  var form = $("[data-evt-form]");
  var F = {
    id: $("[data-evt-id]"), title: $("[data-evt-title]"), allday: $("[data-evt-allday]"),
    cal: $("[data-evt-calendar]"), sd: $("[data-evt-start-date]"), st: $("[data-evt-start-time]"),
    ed: $("[data-evt-end-date]"), et: $("[data-evt-end-time]"), repeat: $("[data-evt-repeat]"),
    loc: $("[data-evt-location]"), notes: $("[data-evt-notes]"), del: $("[data-evt-delete]"),
    err: $("[data-evt-error]"),
  };

  function fillCalSelect(selId) {
    F.cal.innerHTML = "";
    state.calendars.forEach(function (c) {
      var o = document.createElement("option");
      o.value = c.id; o.textContent = c.name;
      if (c.id === selId) o.selected = true;
      F.cal.appendChild(o);
    });
  }

  function openEditor(ev, defaultDate) {
    F.err.textContent = "";
    if (ev) {
      $("#evt-title-label").textContent = L().editEvent;
      F.id.value = ev.id;
      F.title.value = ev.title || "";
      F.allday.checked = !!ev.allDay;
      fillCalSelect(ev.calendarId);
      var s = new Date(ev.start), e = new Date(ev.end);
      F.sd.value = toDateInput(s); F.st.value = toTimeInput(s);
      F.ed.value = toDateInput(e); F.et.value = toTimeInput(e);
      F.repeat.value = ev.repeat || "none";
      F.loc.value = ev.location || "";
      F.notes.value = ev.notes || "";
      F.del.hidden = false;
    } else {
      $("#evt-title-label").textContent = L().newEventTitle;
      F.id.value = "";
      F.title.value = "";
      F.allday.checked = false;
      fillCalSelect(state.calendars[0].id);
      var base = defaultDate ? new Date(defaultDate) : new Date();
      if (!defaultDate) base.setMinutes(0, 0, 0); else base.setHours(9, 0, 0, 0);
      var endD = new Date(base.getTime() + 60 * 60000);
      F.sd.value = toDateInput(base); F.st.value = toTimeInput(base);
      F.ed.value = toDateInput(endD); F.et.value = toTimeInput(endD);
      F.repeat.value = "none";
      F.loc.value = ""; F.notes.value = "";
      F.del.hidden = true;
    }
    syncAllday();
    modal.hidden = false;
    setTimeout(function () { F.title.focus(); }, 30);
  }
  function closeEditor() { modal.hidden = true; }

  function syncAllday() { form.classList.toggle("allday", F.allday.checked); }
  F.allday.addEventListener("change", syncAllday);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var title = F.title.value.trim();
    if (!title) { F.err.textContent = L().errTitle; return; }
    var allDay = F.allday.checked;
    var start = allDay ? fromInputs(F.sd.value, "00:00") : fromInputs(F.sd.value, F.st.value);
    var end = allDay ? fromInputs(F.ed.value, "00:00") : fromInputs(F.ed.value, F.et.value);
    if (allDay) end = addDays(startOfDay(end), 1); // make end-of-day inclusive
    if (end <= start) {
      if (allDay) end = addDays(start, 1);
      else { F.err.textContent = L().errEnd; return; }
    }
    var rec = {
      calendarId: F.cal.value, title: title, allDay: allDay,
      start: start.toISOString(), end: end.toISOString(),
      repeat: F.repeat.value, location: F.loc.value.trim(), notes: F.notes.value.trim(),
    };
    if (F.id.value) {
      var ev = state.events.filter(function (x) { return x.id === F.id.value; })[0];
      if (ev) Object.assign(ev, rec);
    } else {
      rec.id = uid();
      state.events.push(rec);
    }
    save(); closeEditor(); render();
  });

  F.del.addEventListener("click", function () {
    if (!F.id.value) return;
    if (confirm(L().confirmDelEvent)) {
      state.events = state.events.filter(function (x) { return x.id !== F.id.value; });
      save(); closeEditor(); render();
    }
  });

  $("[data-modal-close]").addEventListener("click", closeEditor);
  $("[data-modal-cancel]").addEventListener("click", closeEditor);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeEditor(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hidden) closeEditor();
  });

  function findEvent(id) { return state.events.filter(function (x) { return x.id === id; })[0]; }

  /* ============================================================
     Surface interactions (event delegation)
     ============================================================ */
  surface.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-evt]");
    if (chip) { e.stopPropagation(); var ev = findEvent(chip.dataset.evt); if (ev) openEditor(ev); return; }
    var more = e.target.closest("[data-goday]");
    if (more) { cursor = new Date(+more.dataset.goday); view = "day"; render(); return; }
    var cell = e.target.closest("[data-day]");
    if (cell) { openEditor(null, +cell.dataset.day); return; }
    var dcol = e.target.closest("[data-daycol]");
    if (dcol) {
      // create event at clicked hour
      var rect = dcol.getBoundingClientRect();
      var y = e.clientY - rect.top + dcol.scrollTop;
      var hour = Math.max(0, Math.min(23, Math.floor(y / HOUR_H)));
      var d = new Date(+dcol.dataset.daycol); d.setHours(hour, 0, 0, 0);
      openEditor(null, d.getTime()); // defaultDate path uses 9am; override below
      F.st.value = toTimeInput(d);
      F.et.value = toTimeInput(new Date(d.getTime() + 3600000));
      F.sd.value = toDateInput(d); F.ed.value = toDateInput(d);
    }
  });

  /* ============================================================
     Toolbar
     ============================================================ */
  $$("[data-view]").forEach(function (b) {
    b.addEventListener("click", function () { view = b.dataset.view; render(); });
  });
  $("[data-today]").addEventListener("click", function () {
    cursor = startOfDay(new Date()); miniCursor = new Date(cursor); render();
  });
  $("[data-prev]").addEventListener("click", function () { step(-1); });
  $("[data-next]").addEventListener("click", function () { step(1); });
  function step(dir) {
    if (view === "month") cursor = addMonths(cursor, dir);
    else if (view === "week") cursor = addDays(cursor, 7 * dir);
    else cursor = addDays(cursor, dir);
    miniCursor = new Date(cursor);
    render();
  }
  $("[data-new-event]").addEventListener("click", function () { openEditor(null, view === "month" ? null : cursor.getTime()); });

  // mini-cal navigation (delegated)
  $("[data-mini]").addEventListener("click", function (e) {
    if (e.target.matches("[data-mini-prev]")) { miniCursor = addMonths(miniCursor, -1); renderMini(); }
    else if (e.target.matches("[data-mini-next]")) { miniCursor = addMonths(miniCursor, 1); renderMini(); }
    else if (e.target.matches("[data-mini-day]")) {
      cursor = new Date(+e.target.dataset.miniDay);
      if (view === "month") miniCursor = new Date(cursor);
      render();
    }
  });

  // add calendar
  $("[data-add-calendar]").addEventListener("click", function () {
    var name = prompt(L().promptCal);
    if (!name) return;
    name = name.trim(); if (!name) return;
    var color = PALETTE[state.calendars.length % PALETTE.length];
    state.calendars.push({ id: uid(), name: name, color: color });
    save(); render();
  });

  // sidebar toggle (mobile)
  var sidebar = $("[data-sidebar]");
  $("[data-menu]").addEventListener("click", function () { sidebar.classList.toggle("hidden"); });

  /* ============================================================
     Search
     ============================================================ */
  var search = $("[data-search]");
  var results = $("[data-search-results]");
  search.addEventListener("input", function () {
    var q = search.value.trim().toLowerCase();
    if (!q) { results.hidden = true; results.innerHTML = ""; return; }
    var matches = state.events.filter(function (ev) {
      return (ev.title || "").toLowerCase().indexOf(q) !== -1 ||
        (ev.location || "").toLowerCase().indexOf(q) !== -1 ||
        (ev.notes || "").toLowerCase().indexOf(q) !== -1;
    }).slice(0, 12);
    if (!matches.length) {
      results.innerHTML = '<li class="none">' + L().noEvents + "</li>";
    } else {
      results.innerHTML = matches.map(function (ev) {
        var d = new Date(ev.start);
        return '<li data-result="' + ev.id + '"><span class="s-dot" style="background:' + colorOf(ev.calendarId) + '"></span>' +
          '<span>' + esc(ev.title || L().untitled) + "</span>" +
          '<span class="s-date">' + searchDate(d) + "</span></li>";
      }).join("");
    }
    results.hidden = false;
  });
  results.addEventListener("click", function (e) {
    var li = e.target.closest("[data-result]");
    if (!li) return;
    var ev = findEvent(li.dataset.result);
    if (ev) {
      cursor = startOfDay(new Date(ev.start));
      miniCursor = new Date(cursor);
      results.hidden = true; search.value = "";
      render();
      openEditor(ev);
    }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".search-wrap")) results.hidden = true;
  });

  /* ---------- i18n apply + language toggle ---------- */
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
    render();
  }
  $$("[data-lang-switch] button").forEach(function (b) {
    b.addEventListener("click", function () {
      var target = b.getAttribute("data-lang");
      if (target !== lang) applyLang(target);
    });
  });

  /* ---------- Init ---------- */
  // Honor a #YYYY-MM-DD hash (e.g. from the home page mini calendar):
  // jump straight to that day.
  (function applyHash() {
    var m = /^#(\d{4})-(\d{2})-(\d{2})$/.exec(location.hash || "");
    if (!m) return;
    cursor = startOfDay(new Date(+m[1], +m[2] - 1, +m[3]));
    miniCursor = new Date(cursor);
    view = "day";
  })();

  applyStaticI18n();
  updateLangToggle();
  document.documentElement.lang = lang;
  render();
  // keep the "now" line and today highlight fresh
  setInterval(function () { if (view !== "month") render(); }, 60000);
})();
