// app.js – 화면 동작 (목록 그리기, 일정 추가)

let baseTasks = [];
let tasks = [];
let weatherByRegion = {};
const testWind = new URLSearchParams(window.location.search).get('test') === 'wind';

async function loadWeather() {
  const box = document.getElementById('weatherBox');
  const testNotice = testWind ? ' · 강풍 시험 중 (풍속 12m/s)' : '';
  box.textContent = '오늘 날씨를 불러오는 중…' + testNotice;
  const results = await Promise.allSettled(Object.keys(REGIONS).map(async (region) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(weatherUrl(region), { signal: controller.signal });
      if (!response.ok) throw new Error('날씨 요청 실패');
      weatherByRegion[region] = parseWeather(await response.json(), testWind);
      renderTasks();
    } finally {
      clearTimeout(timeout);
    }
  }));
  const regions = Object.keys(REGIONS);
  const failed = regions.filter((region, index) => results[index].status === 'rejected');
  box.textContent = (failed.length
    ? '날씨 조회 실패: ' + failed.join(' · ') + ' — 잠시 후 새로고침해 주세요.'
    : '오늘 날씨 조회 완료 (최고 기온 · 최대 풍속 · 강수확률)') + testNotice;
  const source = document.createElement('a');
  source.href = 'https://open-meteo.com/';
  source.textContent = '날씨 제공: Open-Meteo';
  box.appendChild(document.createTextNode(' · '));
  box.appendChild(source);
}

function isTask(task) {
  return task && ['title', 'region', 'kind', 'owner'].every(key => typeof task[key] === 'string');
}

function readAddedTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem('wx_added') || '[]');
    if (!Array.isArray(saved) || !saved.every(isTask)) throw new Error('잘못된 저장 목록');
    return saved;
  } catch {
    document.getElementById('msgBox').textContent += ' 브라우저에 저장된 추가 일정을 읽지 못했습니다.';
    return [];
  }
}

async function loadTasks() {
  const message = document.getElementById('msgBox');
  message.textContent = '일정 목록을 불러오는 중…';
  try {
    const response = await fetch('data/tasks.json');
    if (!response.ok) throw new Error('일정 요청 실패');
    const data = await response.json();
    if (!Array.isArray(data) || !data.every(isTask)) throw new Error('잘못된 일정 목록');
    baseTasks = data;
    message.textContent = '';
  } catch {
    message.textContent = '일정 파일을 읽지 못했습니다. 배포 주소로 열어 주세요';
  }
  tasks = baseTasks.concat(readAddedTasks());
  renderTasks();
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const saved = readAddedTasks();
  saved.push(t);
  try {
    localStorage.setItem('wx_added', JSON.stringify(saved));
  } catch {
    document.getElementById('msgBox').textContent = '추가 일정을 브라우저에 저장하지 못했습니다.';
    return;
  }
  e.target.reset();
  tasks = baseTasks.concat(saved);
  renderTasks();
}

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
document.getElementById('todayDate').textContent = `${year}-${month}-${day}`;

document.getElementById('taskForm').addEventListener('submit', addTask);
loadTasks();
renderTasks();
loadWeather();
