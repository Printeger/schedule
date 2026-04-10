const KEY = 'weeklyScheduleLite_';
const SNAP_KEY = KEY + 'snapshots';
let selectedDate = window.scheduleData?.days?.[0]?.id || '2026-04-09';

const days = window.scheduleData.days;
const ganttHeaders = window.scheduleData.ganttHeaders;
const ganttRows = window.scheduleData.ganttRows;
const noteTemplates = window.scheduleData.noteTemplates;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>');
}

function ckey(id, i, j) { return `${KEY}c_${id}_${i}_${j}`; }
function nkey(id) { return `${KEY}n_${id}`; }
function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function getDay(id) { return days.find((d) => d.id === id); }
function getNote(id) { return localStorage.getItem(nkey(id)) || ''; }
function isChecked(id, i, j) { return localStorage.getItem(ckey(id, i, j)) === 'true'; }

function renderStaticText() {
  q('#pageTitle').textContent = window.scheduleData.title;
  q('#pageSubtitle').innerHTML = window.scheduleData.subtitle;
  q('#focusList').innerHTML = window.scheduleData.focusItems
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
}

function renderGantt() {
  const grid = q('#ganttGrid');
  const headerHtml = [
    '<div class="gc headc">项目</div>',
    ...ganttHeaders.map((label) => `<div class="gc headc">${label}</div>`)
  ].join('');

  const rowsHtml = ganttRows.map((row) => {
    const cells = ganttHeaders.map((_, index) => {
      const active = row.active.includes(index);
      const isToday = row.today === index ? ' today' : '';
      const bar = active ? '<span class="bar"></span>' : '';
      const deadline = row.deadline === index ? '<span class="deadline"></span>' : '';
      return `<div class="gc${isToday}">${bar}${deadline}</div>`;
    }).join('');

    return `<div class="gc task">${escapeHtml(row.label)}</div>${cells}`;
  }).join('');

  grid.innerHTML = headerHtml + rowsHtml;
}

function renderCalendar() {
  q('#calendarGrid').innerHTML = days.map((d) => `
    <button class="cbtn ${d.id === selectedDate ? 'active' : ''}" data-id="${d.id}" onclick="selectDay('${d.id}')">
      <div class="cw">${escapeHtml(d.name)}</div>
      <div class="cd">${escapeHtml(d.date.split('/')[1])}</div>
      <div class="ct">${escapeHtml(d.mini)}</div>
    </button>
  `).join('');
}

function renderWeek() {
  q('#weekList').innerHTML = days.map((d) => `
    <div class="day ${d.id === selectedDate ? 'sel' : ''}" id="day-${d.id}">
      <div class="dhead">
        <div class="dname">${escapeHtml(d.name)}</div>
        <div class="ddate">${escapeHtml(d.date)}</div>
        <div class="tags">
          ${d.tags.map((t, idx) => `<span class="tag ${idx === 0 && t.includes('起始') ? 'major' : ''}">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
      ${d.sections.map((sec, i) => `
        <div class="dsec">
          <div class="st">${escapeHtml(sec[0])}</div>
          <div class="list">
            ${sec[1].map((item, j) => `
              <label class="item ${isChecked(d.id, i, j) ? 'done' : ''}">
                <input type="checkbox" ${isChecked(d.id, i, j) ? 'checked' : ''} onchange="toggleCheck('${d.id}', ${i}, ${j}, this.checked)">
                <span>${escapeHtml(item)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <div class="memo" contenteditable="true" data-id="${d.id}" data-placeholder="${escapeHtml(d.placeholder)}">${escapeHtml(getNote(d.id))}</div>
    </div>
  `).join('');

  qa('.memo').forEach((el) => {
    el.addEventListener('input', () => {
      localStorage.setItem(nkey(el.dataset.id), el.innerText);
      if (el.dataset.id === selectedDate) renderSelected();
    });
  });
}

function renderSelected() {
  const d = getDay(selectedDate);
  if (!d) return;

  q('#selTitle').textContent = `${d.name} · ${d.date}`;
  q('#selTags').innerHTML = d.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  q('#selSections').innerHTML = d.sections.map((sec, i) => `
    <div class="box">
      <h4>${escapeHtml(sec[0])}</h4>
      <ul>
        ${sec[1].map((item, j) => `<li class="${isChecked(d.id, i, j) ? 'done' : ''}">${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>
  `).join('');
  q('#selNote').innerHTML = escapeHtml(getNote(d.id) || '今天还没有填写备注。');
}

function selectDay(id) {
  selectedDate = id;
  renderCalendar();
  renderWeek();
  renderSelected();
}

function scrollToSelectedDay() {
  const el = q(`#day-${selectedDate}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleCheck(id, i, j, checked) {
  localStorage.setItem(ckey(id, i, j), checked);
  renderWeek();
  renderSelected();
}

function fillNotes() {
  days.forEach((d, i) => {
    if (!getNote(d.id)) {
      localStorage.setItem(nkey(d.id), noteTemplates[i] || '今日记录：');
    }
  });
  renderWeek();
  renderSelected();
}

function resetChecks() {
  if (!confirm('确认清空所有勾选状态吗？')) return;
  days.forEach((d) => {
    d.sections.forEach((sec, i) => {
      sec[1].forEach((_, j) => localStorage.removeItem(ckey(d.id, i, j)));
    });
  });
  renderWeek();
  renderSelected();
}

function resetAll() {
  if (!confirm('确认恢复为初始状态吗？这会清空勾选和备注。')) return;
  days.forEach((d) => localStorage.removeItem(nkey(d.id)));
  days.forEach((d) => {
    d.sections.forEach((sec, i) => {
      sec[1].forEach((_, j) => localStorage.removeItem(ckey(d.id, i, j)));
    });
  });
  renderWeek();
  renderSelected();
}

function getSnaps() {
  try {
    return JSON.parse(localStorage.getItem(SNAP_KEY) || '[]');
  } catch {
    return [];
  }
}

function setSnaps(v) {
  localStorage.setItem(SNAP_KEY, JSON.stringify(v));
}

function snapshotData() {
  return {
    title: q('h1').innerText,
    savedAt: new Date().toLocaleString('zh-CN'),
    days: days.map((d) => ({
      id: d.id,
      name: d.name,
      date: d.date,
      tags: d.tags,
      sections: d.sections.map((sec, i) => ({
        title: sec[0],
        items: sec[1].map((it, j) => ({ text: it, checked: isChecked(d.id, i, j) }))
      })),
      note: getNote(d.id)
    }))
  };
}

function saveSnapshot() {
  const arr = getSnaps();
  arr.unshift({ id: String(Date.now()), ...snapshotData() });
  setSnaps(arr.slice(0, 20));
  renderArchive();
  alert('已保存当前周快照。');
}

function renderArchive() {
  const arr = getSnaps();
  q('#archive').innerHTML = arr.length
    ? arr.map((s) => `
        <div class="aitem">
          <div class="meta"><span>${escapeHtml(s.savedAt)}</span><span>${s.days.length} 天</span></div>
          <div class="atitle">${escapeHtml(s.title)}</div>
          <div class="aactions">
            <button onclick="showSnapshot('${s.id}')">查看</button>
            <button onclick="delSnapshot('${s.id}')">删除</button>
          </div>
        </div>
      `).join('')
    : '<div class="aitem small">还没有历史快照。建议每次更新下一周前先保存一次。</div>';
}

function showSnapshot(id) {
  const s = getSnaps().find((x) => x.id === id);
  if (!s) return;

  const lines = s.days.map((d) => [
    `${d.name} ${d.date}`,
    ...d.sections.map((sec) => [
      `${sec.title}:`,
      ...sec.items.map((it) => `${it.checked ? '☑' : '☐'} ${it.text}`)
    ].join('\n')),
    `备注：${d.note || '无'}`,
    ''
  ].join('\n')).join('\n');

  alert(`${s.title}\n保存时间：${s.savedAt}\n\n${lines}`);
}

function delSnapshot(id) {
  if (!confirm('确认删除这个历史快照吗？')) return;
  setSnaps(getSnaps().filter((x) => x.id !== id));
  renderArchive();
}

function runTests() {
  console.assert(typeof selectDay === 'function', 'selectDay should exist');
  console.assert(typeof scrollToSelectedDay === 'function', 'scrollToSelectedDay should exist');
  console.assert(days.length === 7, 'should have 7 days');
  const before = selectedDate;
  selectDay('2026-04-10');
  console.assert(selectedDate === '2026-04-10', 'selectDay should update selectedDate');
  selectDay(before);
}

window.selectDay = selectDay;
window.scrollToSelectedDay = scrollToSelectedDay;
window.toggleCheck = toggleCheck;
window.fillNotes = fillNotes;
window.resetChecks = resetChecks;
window.resetAll = resetAll;
window.saveSnapshot = saveSnapshot;
window.showSnapshot = showSnapshot;
window.delSnapshot = delSnapshot;

renderStaticText();
renderGantt();
renderCalendar();
renderWeek();
renderSelected();
renderArchive();
runTests();
