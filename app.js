const STORAGE_KEY = 'wird-reader-state-v1';
const DAY_COUNT = 30;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const sampleChapters = {
  1: {
    day: 1,
    title: 'A prayer for goodness',
    duas: [
      {
        id: 'quran-2-201',
        title: 'For goodness in both worlds',
        source: "QUR'AN · 2:201",
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        english: 'Our Lord, grant us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
        urdu: 'اے ہمارے رب! ہمیں دنیا میں بھی بھلائی عطا فرما، آخرت میں بھی بھلائی عطا فرما اور ہمیں آگ کے عذاب سے بچا۔',
        transliteration: "Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina 'adhab an-nar."
      },
      {
        id: 'quran-20-114',
        title: 'A prayer for beneficial knowledge',
        source: "QUR'AN · 20:114",
        arabic: 'رَبِّ زِدْنِي عِلْمًا',
        english: 'My Lord, increase me in knowledge.',
        urdu: 'اے میرے رب! میرے علم میں اضافہ فرما۔',
        transliteration: 'Rabbi zidni ilma.'
      },
      {
        id: 'quran-7-23',
        title: 'A prayer for forgiveness',
        source: "QUR'AN · 7:23",
        arabic: 'رَبَّنَا ظَلَمْنَا أَنْفُسَنَا وَإِنْ لَمْ تَغْفِرْ لَنَا وَتَرْحَمْنَا لَنَكُونَنَّ مِنَ الْخَاسِرِينَ',
        english: 'Our Lord, we have wronged ourselves. If You do not forgive us and have mercy upon us, we will surely be among the losers.',
        urdu: 'اے ہمارے رب! ہم نے اپنی جانوں پر ظلم کیا، اور اگر تو نے ہمیں نہ بخشا اور ہم پر رحم نہ فرمایا تو ہم ضرور نقصان اٹھانے والوں میں سے ہو جائیں گے۔',
        transliteration: 'Rabbana zalamna anfusana wa illam taghfir lana wa tarhamna lanakunanna minal-khasirin.'
      }
    ]
  }
};

const defaultState = {
  reads: {},
  customChapters: {},
  reminderPreference: false,
  language: 'english',
  startedAt: localDateKey(new Date())
};
const defaultDuaCardMarkup = document.getElementById('dua-card').innerHTML;
let state = loadState();
let currentDay = getCurrentProgramDay();
let currentDuaIndex = 0;
let historyPeriod = 'week';
let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let toastTimeout;

function localDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...defaultState, ...parsed, reads: parsed.reads || {}, customChapters: parsed.customChapters || {} };
  } catch (error) {
    return { ...defaultState };
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function dateLabel(date, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) {
  return date.toLocaleDateString('en', options);
}
function todayKey() { return localDateKey(new Date()); }
function getCurrentProgramDay() {
  const start = new Date(`${state.startedAt}T12:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const started = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const elapsed = Math.max(0, Math.floor((today - started) / 86400000));
  return (elapsed % DAY_COUNT) + 1;
}
function chapterFor(day) {
  return state.customChapters[String(day)] || sampleChapters[day] || null;
}
function completedToday(day = currentDay) {
  return (state.reads[todayKey()] || []).includes(Number(day));
}
function allReadDates() {
  return Object.keys(state.reads).filter(key => Array.isArray(state.reads[key]) && state.reads[key].length > 0).sort();
}
function streakCount() {
  const dates = new Set(allReadDates());
  const cursor = new Date();
  let count = 0;
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(localDateKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
function countDatesBetween(start, end) {
  return allReadDates().filter(key => {
    const d = new Date(`${key}T12:00:00`);
    return d >= start && d <= end;
  }).length;
}
function weekStart(date = new Date()) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - result.getDay());
  return result;
}
function getDuaList() {
  const chapter = chapterFor(currentDay);
  return chapter && Array.isArray(chapter.duas) ? chapter.duas : [];
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2600);
}
function setView(view) {
  document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === `view-${view}`));
  document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const title = { today: 'Today', history: 'My history', rewards: 'Milestones', settings: 'Settings' }[view] || 'Today';
  document.getElementById('breadcrumb-current').textContent = title;
  if (view === 'history') renderHistory();
  if (view === 'rewards') renderRewards();
  if (view === 'settings') renderSettings();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderReader() {
  const chapter = chapterFor(currentDay);
  const duas = getDuaList();
  if (chapter && !document.getElementById('dua-dots')) {
    document.getElementById('dua-card').innerHTML = defaultDuaCardMarkup;
  }
  document.getElementById('chapter-number').innerHTML = `DAY ${String(currentDay).padStart(2, '0')} <span>OF ${DAY_COUNT}</span>`;
  document.getElementById('chapter-title').textContent = chapter?.title || 'Your next chapter';
  document.getElementById('chapter-kicker').textContent = chapter ? (currentDay === getCurrentProgramDay() ? 'YOUR DAILY WIRD' : 'YOUR READING PATH') : 'CHAPTER AWAITS';
  document.getElementById('prev-day-number').textContent = String(currentDay === 1 ? DAY_COUNT : currentDay - 1).padStart(2, '0');
  document.getElementById('next-day-number').textContent = String(currentDay === DAY_COUNT ? 1 : currentDay + 1).padStart(2, '0');
  const note = document.getElementById('content-note');
  note.style.display = chapter?.sample ? 'flex' : (chapter ? 'none' : 'flex');
  if (!chapter) note.innerHTML = '<span>ⓘ</span><span>No verified text is loaded for this day yet. Import your chapter set from Settings to continue.</span>';
  else if (chapter.sample) note.innerHTML = '<span>ⓘ</span><span>Preview selection · not verified against your edition of <em>Mukhtasar Hizb ul Azam</em>. Add verified chapters in Settings.</span>';
  else note.style.display = 'none';
  if (!chapter || duas.length === 0) {
    document.getElementById('dua-card').innerHTML = `<div class="empty-reading"><span class="empty-art">✧</span><span class="eyebrow">DAY ${String(currentDay).padStart(2, '0')} · CONTENT NEEDED</span><h3>Make this day yours</h3><p>Add the Arabic text and Urdu translation from a trusted copy of your edition. Your imported chapters stay on this device.</p><button class="button button-secondary" data-nav-view="settings">Import verified text <span>→</span></button></div>`;
    document.getElementById('chapter-progress-label').textContent = '0 duas';
    document.getElementById('chapter-progress-bar').style.width = '0%';
    document.getElementById('mark-read').disabled = true;
    document.getElementById('mark-read').classList.remove('is-complete');
    document.getElementById('mark-read-label').textContent = 'Content not available';
    document.getElementById('read-status').classList.remove('done');
    document.getElementById('read-status').innerHTML = '<span class="status-dot"></span><span>Add verified chapter text to begin.</span>';
    renderDaysStrip();
    return;
  }
  document.getElementById('mark-read').disabled = false;
  currentDuaIndex = Math.min(currentDuaIndex, duas.length - 1);
  const dua = duas[currentDuaIndex];
  const count = duas.length;
  const isRead = completedToday(currentDay);
  document.getElementById('chapter-progress-label').textContent = `${isRead ? count : 0} / ${count} duas`;
  document.getElementById('chapter-progress-bar').style.width = isRead ? '100%' : '0%';
  document.getElementById('dua-count').textContent = `DUA ${String(currentDuaIndex + 1).padStart(2, '0')} — ${String(count).padStart(2, '0')}`;
  document.getElementById('dua-title').textContent = dua.title || `Dua ${currentDuaIndex + 1}`;
  document.getElementById('dua-source').textContent = dua.source || 'SOURCE NOT LISTED';
  document.getElementById('dua-arabic').textContent = dua.arabic || '';
  document.getElementById('dua-arabic').setAttribute('dir', 'rtl');
  const translation = document.getElementById('dua-translation');
  const language = state.language === 'urdu' ? 'urdu' : 'english';
  translation.textContent = dua[language] || dua.english || dua.urdu || 'Translation not provided.';
  translation.setAttribute('dir', language === 'urdu' ? 'rtl' : 'ltr');
  translation.lang = language === 'urdu' ? 'ur' : 'en';
  document.getElementById('translation-label').textContent = language === 'urdu' ? 'اردو ترجمہ' : 'ENGLISH MEANING';
  document.getElementById('language-toggle').innerHTML = language === 'urdu' ? 'English <span>↗</span>' : 'اردو <span>↗</span>';
  document.getElementById('language-toggle').setAttribute('aria-label', language === 'urdu' ? 'Switch to English translation' : 'Switch to Urdu translation');
  const transliterationDetails = document.getElementById('transliteration-details');
  transliterationDetails.style.display = dua.transliteration ? 'block' : 'none';
  document.getElementById('dua-transliteration').textContent = dua.transliteration || '';
  document.getElementById('dua-dots').innerHTML = duas.map((_, index) => `<button class="dua-dot ${index === currentDuaIndex ? 'active' : ''}" data-dua-index="${index}" aria-label="Dua ${index + 1}" aria-current="${index === currentDuaIndex ? 'true' : 'false'}"></button>`).join('');
  document.getElementById('prev-dua').disabled = count < 2;
  document.getElementById('next-dua').disabled = count < 2;
  const markButton = document.getElementById('mark-read');
  markButton.classList.toggle('is-complete', isRead);
  document.getElementById('mark-read-label').textContent = isRead ? 'Day completed' : 'Mark this day as read';
  const status = document.getElementById('read-status');
  status.classList.toggle('done', isRead);
  status.innerHTML = isRead ? '<span class="status-dot"></span><span>Lovely work. Today’s reading is complete.</span>' : '<span class="status-dot"></span><span>Small steps, sincerely made.</span>';
  renderDaysStrip();
}
function renderDaysStrip() {
  const start = weekStart();
  const today = new Date();
  const markup = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = localDateKey(d);
    const reads = state.reads[key] || [];
    const isToday = key === todayKey();
    const chapterIndex = Math.max(1, (Math.floor((new Date(`${key}T12:00:00`) - new Date(`${state.startedAt}T12:00:00`)) / 86400000) % DAY_COUNT) + 1);
    const active = isToday && currentDay === chapterIndex;
    return `<button class="day-tile ${active ? 'active' : ''} ${reads.length ? 'read' : ''}" data-date="${key}" aria-label="${dateLabel(d, { weekday: 'long', month: 'long', day: 'numeric' })}${reads.length ? ', read' : ''}"><span class="tile-day">${d.toLocaleDateString('en', { weekday: 'short' }).toUpperCase()}</span><span class="tile-date">${d.getDate()}</span><span class="tile-mark"></span></button>`;
  }).join('');
  document.getElementById('days-list').innerHTML = markup;
  document.getElementById('today-date').textContent = dateLabel(today, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  renderStreak();
  renderMiniCalendar();
}
function renderStreak() {
  const streak = streakCount();
  document.getElementById('streak-number').textContent = streak;
  document.getElementById('week-row').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart().getFullYear(), weekStart().getMonth(), weekStart().getDate() + i);
    const key = localDateKey(d);
    const read = (state.reads[key] || []).length > 0;
    const today = key === todayKey();
    return `<div class="week-day ${read ? 'read' : ''} ${today ? 'today' : ''}"><span>${d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}</span><i>${read ? '✓' : d.getDate()}</i></div>`;
  }).join('');
  const thisWeek = countDatesBetween(weekStart(), new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59));
  document.getElementById('week-summary').textContent = `${thisWeek} of 7 days this week`;
  const milestone = [3, 7, 14, 30].find(value => streak < value) || 30;
  const previous = milestone === 3 ? 0 : [3, 7, 14, 30].filter(value => value < milestone).slice(-1)[0] || 0;
  const progress = Math.min(100, Math.max(0, ((streak - previous) / (milestone - previous)) * 100));
  document.getElementById('next-goal-title').textContent = streak >= 30 ? 'A beautiful 30-day rhythm' : milestone === 3 ? 'First little milestone' : `${milestone}-day milestone`;
  document.getElementById('next-goal-copy').textContent = streak >= 30 ? 'Your consistency is something to be proud of.' : `${Math.max(0, milestone - streak)} more ${milestone - streak === 1 ? 'day' : 'days'} to reach it.`;
  document.getElementById('next-goal-bar').style.width = `${progress}%`;
  document.getElementById('next-goal-count').textContent = `${Math.min(streak, milestone)}/${milestone}`;
}
function renderMiniCalendar() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  document.getElementById('month-read-count').textContent = countDatesBetween(new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59));
  document.getElementById('mini-calendar').innerHTML = WEEKDAYS.map(day => `<span class="cal-weekday">${day}</span>`).join('') + Array.from({ length: first }, () => '<span class="cal-day blank">0</span>').join('') + Array.from({ length: days }, (_, i) => {
    const date = new Date(y, m, i + 1);
    const key = localDateKey(date);
    return `<span class="cal-day ${state.reads[key]?.length ? 'read' : ''} ${key === todayKey() ? 'today' : ''}">${i + 1}</span>`;
  }).join('');
}
function renderHistory() {
  const dates = allReadDates();
  const streak = streakCount();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthCount = countDatesBetween(monthStart, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59));
  const yearCount = countDatesBetween(new Date(new Date().getFullYear(), 0, 1), new Date(new Date().getFullYear(), 11, 31, 23, 59, 59));
  document.getElementById('history-today').textContent = dateLabel(new Date(), { month: 'short', day: 'numeric', year: 'numeric' });
  document.getElementById('history-summary').innerHTML = [
    ['CURRENT STREAK', streak, 'consecutive days'],
    ['THIS WEEK', countDatesBetween(weekStart(), new Date()), 'days read'],
    ['THIS MONTH', monthCount, 'days read'],
    ['THIS YEAR', yearCount, 'days read']
  ].map(([label, count, note]) => `<article class="summary-card"><span class="eyebrow">${label}</span><strong>${count}</strong><small>${note}</small></article>`).join('');
  document.querySelectorAll('.period-button').forEach(button => button.classList.toggle('active', button.dataset.period === historyPeriod));
  renderHistoryChart();
  renderLargeCalendar();
}
function renderHistoryChart() {
  const now = new Date();
  const data = [];
  if (historyPeriod === 'week') {
    const start = weekStart(now);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      data.push({ label: d.toLocaleDateString('en', { weekday: 'short' }), count: (state.reads[localDateKey(d)] || []).length ? 1 : 0, today: localDateKey(d) === todayKey() });
    }
    document.getElementById('history-period-title').textContent = 'This week';
  } else if (historyPeriod === 'month') {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      data.push({ label: String(i), count: (state.reads[localDateKey(d)] || []).length ? 1 : 0, today: localDateKey(d) === todayKey() });
    }
    document.getElementById('history-period-title').textContent = MONTH_NAMES[now.getMonth()];
  } else {
    for (let m = 0; m < 12; m++) {
      const start = new Date(now.getFullYear(), m, 1);
      const end = new Date(now.getFullYear(), m + 1, 0, 23, 59, 59);
      data.push({ label: MONTH_NAMES[m].slice(0, 3), count: countDatesBetween(start, end), today: m === now.getMonth() });
    }
    document.getElementById('history-period-title').textContent = `${now.getFullYear()} at a glance`;
  }
  const max = Math.max(1, ...data.map(item => item.count));
  document.getElementById('history-chart').innerHTML = data.map(item => {
    const height = item.count ? Math.max(9, (item.count / max) * 100) : 0;
    return `<div class="bar-group"><span class="bar-value">${item.count || ''}</span><div class="bar-track"><span class="bar-fill ${item.today ? 'today' : ''}" style="height:${height}%"></span></div><span class="bar-label">${item.label}</span></div>`;
  }).join('');
  const total = data.reduce((sum, item) => sum + item.count, 0);
  document.getElementById('history-chart-note').textContent = historyPeriod === 'year' ? `${total} reading ${total === 1 ? 'day' : 'days'} this year. Your records are stored on this device.` : `${total} ${total === 1 ? 'day' : 'days'} marked as read in this view.`;
}
function renderLargeCalendar() {
  const y = calendarCursor.getFullYear(), m = calendarCursor.getMonth();
  document.getElementById('history-calendar-title').textContent = `${MONTH_NAMES[m]} ${y}`;
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  document.getElementById('large-calendar').innerHTML = WEEKDAYS.map(day => `<span class="cal-weekday">${day}</span>`).join('') + Array.from({ length: first }, () => '<span class="cal-day blank">0</span>').join('') + Array.from({ length: days }, (_, i) => {
    const d = new Date(y, m, i + 1), key = localDateKey(d);
    return `<span class="cal-day ${state.reads[key]?.length ? 'read' : ''} ${key === todayKey() ? 'today' : ''}">${i + 1}</span>`;
  }).join('');
}
function renderRewards() {
  const streak = streakCount();
  const total = allReadDates().length;
  document.getElementById('reward-streak-count').textContent = streak;
  document.getElementById('reward-hero-copy').textContent = streak ? `You have made space for remembrance ${streak} ${streak === 1 ? 'day' : 'days'} in a row. Keep your own gentle pace.` : 'Your first reading is waiting whenever you are.';
  const milestones = [
    { days: 1, name: 'The first return', desc: 'Read for the first time. Every journey starts somewhere.', icon: '☼' },
    { days: 3, name: 'A gentle rhythm', desc: 'Three days of making a little room for remembrance.', icon: '✧' },
    { days: 7, name: 'One week of care', desc: 'A full week of returning to your daily wird.', icon: '✿' },
    { days: 14, name: 'Rooted in habit', desc: 'Two weeks of showing up with intention.', icon: '❋' },
    { days: 30, name: 'A month of meaning', desc: 'Thirty days of steady, mindful reading.', icon: '✺' },
    { days: 100, name: 'A hundred moments', desc: 'One hundred days of keeping remembrance close.', icon: '❀' }
  ];
  const earned = milestones.filter(item => total >= item.days).length;
  document.getElementById('unlocked-count').textContent = `${earned} of ${milestones.length} earned`;
  document.getElementById('rewards-grid').innerHTML = milestones.map(item => {
    const unlocked = total >= item.days;
    return `<article class="reward-card ${unlocked ? 'earned' : ''}"><span class="reward-status">${unlocked ? 'EARNED' : `${Math.max(0, item.days - total)} DAYS TO GO`}</span><div class="badge-icon">${item.icon}</div><h3>${item.name}</h3><p>${item.desc}</p></article>`;
  }).join('');
}
function renderSettings() {
  document.getElementById('reminder-toggle').checked = Boolean(state.reminderPreference);
  document.getElementById('reminder-status').textContent = state.reminderPreference ? 'On (preference only)' : 'Off';
}
function changeDay(delta) {
  currentDay = ((currentDay - 1 + delta + DAY_COUNT) % DAY_COUNT) + 1;
  currentDuaIndex = 0;
  renderReader();
}
function toggleRead() {
  if (!chapterFor(currentDay)) return;
  const key = todayKey();
  const reads = new Set(state.reads[key] || []);
  if (reads.has(currentDay)) reads.delete(currentDay); else reads.add(currentDay);
  if (reads.size) state.reads[key] = [...reads].sort((a, b) => a - b); else delete state.reads[key];
  saveState();
  renderReader();
  showToast(reads.has(currentDay) ? 'A lovely moment made for remembrance.' : 'Reading mark removed.');
}
function openDayModal() {
  document.getElementById('modal-day-grid').innerHTML = Array.from({ length: DAY_COUNT }, (_, i) => {
    const day = i + 1, chapter = chapterFor(day);
    const isRead = completedToday(day);
    return `<button class="modal-day ${day === currentDay ? 'active' : ''} ${chapter ? 'has-content' : 'empty'} ${isRead ? 'read' : ''}" data-select-day="${day}"><strong>Day ${String(day).padStart(2, '0')}</strong><span>${isRead ? '✓ Completed' : chapter ? `${chapter.duas.length} duas` : 'Awaiting text'}</span></button>`;
  }).join('');
  document.getElementById('day-modal').hidden = false;
  document.getElementById('close-day-modal').focus();
}
function closeDayModal() { document.getElementById('day-modal').hidden = true; }
function validateImport(data) {
  const chapters = Array.isArray(data) ? data : data.chapters;
  if (!Array.isArray(chapters) || !chapters.length) throw new Error('JSON must contain a non-empty "chapters" array.');
  const parsed = {};
  for (const chapter of chapters) {
    const day = Number(chapter.day);
    if (!Number.isInteger(day) || day < 1 || day > DAY_COUNT) throw new Error('Each chapter needs a day number from 1 to 30.');
    if (!Array.isArray(chapter.duas) || !chapter.duas.length) throw new Error(`Day ${day} needs at least one dua.`);
    const duas = chapter.duas.map((dua, index) => {
      if (!dua.arabic || (!dua.urdu && !dua.english)) throw new Error(`Day ${day}, dua ${index + 1}: arabic and at least one translation are required.`);
      return {
        id: String(dua.id || `day-${day}-dua-${index + 1}`),
        title: String(dua.title || `Dua ${index + 1}`),
        source: String(dua.source || 'SOURCE NOT LISTED'),
        arabic: String(dua.arabic),
        urdu: String(dua.urdu || ''),
        english: String(dua.english || ''),
        transliteration: String(dua.transliteration || '')
      };
    });
    parsed[String(day)] = { day, title: String(chapter.title || `Day ${day}`), duas, sample: false };
  }
  return parsed;
}
function downloadFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function downloadTemplate() {
  const template = {
    chapters: [
      {
        day: 1,
        title: 'Chapter title',
        duas: [
          {
            id: 'day-1-dua-1',
            title: 'Dua title',
            source: 'Source / page reference',
            arabic: 'اَللّٰهُمَّ ...',
            urdu: 'یہاں اردو ترجمہ درج کریں۔',
            english: 'Optional English meaning.',
            transliteration: 'Optional transliteration.'
          }
        ]
      }
    ]
  };
  downloadFile('wird-chapters-template.json', JSON.stringify(template, null, 2));
  showToast('Chapter JSON template downloaded.');
}
function bindEvents() {
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.getElementById('open-settings').addEventListener('click', () => setView('settings'));
  document.querySelectorAll('[data-view]').forEach(button => {
    if (!button.classList.contains('nav-item')) button.addEventListener('click', () => setView(button.dataset.view));
  });
  document.querySelectorAll('[data-nav-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.navView)));
  document.getElementById('mark-read').addEventListener('click', toggleRead);
  document.getElementById('dua-card').addEventListener('click', event => {
    if (event.target.closest('#prev-dua')) {
      const list = getDuaList(); currentDuaIndex = (currentDuaIndex - 1 + list.length) % list.length; renderReader();
    } else if (event.target.closest('#next-dua')) {
      const list = getDuaList(); currentDuaIndex = (currentDuaIndex + 1) % list.length; renderReader();
    } else if (event.target.closest('[data-dua-index]')) {
      currentDuaIndex = Number(event.target.closest('[data-dua-index]').dataset.duaIndex); renderReader();
    } else if (event.target.closest('#language-toggle')) {
      state.language = state.language === 'urdu' ? 'english' : 'urdu'; saveState(); renderReader();
    } else if (event.target.closest('[data-nav-view]')) {
      setView(event.target.closest('[data-nav-view]').dataset.navView);
    }
  });
  document.getElementById('prev-chapter').addEventListener('click', () => changeDay(-1));
  document.getElementById('next-chapter').addEventListener('click', () => changeDay(1));
  ['chapter-picker', 'open-day-list', 'days-strip-link'].forEach(id => document.getElementById(id).addEventListener('click', openDayModal));
  document.getElementById('close-day-modal').addEventListener('click', closeDayModal);
  document.getElementById('day-modal').addEventListener('click', event => { if (event.target.id === 'day-modal') closeDayModal(); });
  document.getElementById('modal-day-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-select-day]');
    if (!button) return;
    currentDay = Number(button.dataset.selectDay);
    currentDuaIndex = 0;
    closeDayModal();
    renderReader();
  });
  document.getElementById('days-list').addEventListener('click', event => {
    const tile = event.target.closest('[data-date]');
    if (tile && tile.dataset.date === todayKey()) { currentDay = getCurrentProgramDay(); renderReader(); }
    else if (tile) showToast('History is shown in My history. You can read today’s chapter here.');
  });
  document.querySelectorAll('.period-button').forEach(button => button.addEventListener('click', () => { historyPeriod = button.dataset.period; renderHistory(); }));
  document.getElementById('calendar-prev').addEventListener('click', () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1); renderLargeCalendar(); });
  document.getElementById('calendar-next').addEventListener('click', () => { calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1); renderLargeCalendar(); });
  document.getElementById('chapter-upload').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    const feedback = document.getElementById('import-feedback');
    try {
      const parsed = validateImport(JSON.parse(await file.text()));
      state.customChapters = { ...state.customChapters, ...parsed };
      saveState();
      feedback.textContent = `Imported ${Object.keys(parsed).length} chapter${Object.keys(parsed).length === 1 ? '' : 's'} successfully. Check the text against your trusted edition.`;
      renderReader();
      showToast('Verified chapters imported to this browser.');
    } catch (error) {
      feedback.textContent = `Could not import: ${error.message}`;
      feedback.style.color = '#9b594b';
    }
    event.target.value = '';
  });
  document.getElementById('download-template').addEventListener('click', downloadTemplate);
  document.getElementById('export-data').addEventListener('click', () => {
    downloadFile('wird-reading-backup.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2));
    showToast('Your local backup has been downloaded.');
  });
  document.getElementById('clear-data').addEventListener('click', () => {
    if (!confirm('Clear your reading history, imported chapters, and preferences from this browser? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = { ...defaultState, reads: {}, customChapters: {}, startedAt: todayKey() };
    currentDay = 1;
    currentDuaIndex = 0;
    saveState();
    renderReader();
    renderSettings();
    showToast('Local data cleared.');
  });
  document.getElementById('reminder-toggle').addEventListener('change', event => {
    state.reminderPreference = event.target.checked;
    saveState();
    renderSettings();
    showToast(event.target.checked ? 'Reminder preference saved. Notifications are not sent in this preview.' : 'Reminder preference turned off.');
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDayModal(); });
}

sampleChapters[1].sample = true;
bindEvents();
renderReader();
