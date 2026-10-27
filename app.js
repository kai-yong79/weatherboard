// app.js – 화면 동작 (목록 그리기, 일정 추가)

let tasks = [];
let database = null;
let tasksReady = false;
let savingTask = false;
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

function connectDatabase() {
  if (typeof SUPABASE_URL !== 'string' || !SUPABASE_URL.trim() ||
      typeof SUPABASE_PUBLIC_KEY !== 'string' || !SUPABASE_PUBLIC_KEY.trim()) {
    throw new Error('config.js에 Supabase 주소와 공개용 키를 입력해 주세요.');
  }
  let publicKey = SUPABASE_PUBLIC_KEY.startsWith('sb_publishable_');
  if (!publicKey) {
    try {
      const payload = SUPABASE_PUBLIC_KEY.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      publicKey = JSON.parse(atob(payload)).role === 'anon';
    } catch {
      publicKey = false;
    }
  }
  if (!publicKey) throw new Error('공개용 publishable 또는 anon 키만 사용할 수 있습니다.');
  if (!window.supabase) throw new Error('Supabase 스크립트를 불러오지 못했습니다. 인터넷 연결 후 새로고침해 주세요.');
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function loadTasks() {
  const message = document.getElementById('msgBox');
  const button = document.getElementById('addTaskButton');
  tasksReady = false;
  button.disabled = true;
  message.textContent = '일정 목록을 불러오는 중…';
  if (!database) {
    try {
      database = connectDatabase();
    } catch (error) {
      message.textContent = error.message;
      return;
    }
  }
  try {
    const { data, error } = await database.from('wx_tasks')
      .select('id,title,region,kind,owner,created_at')
      .order('created_at', { ascending: true }).order('id', { ascending: true });
    if (error) throw error;
    if (!Array.isArray(data) || !data.every(isTask)) throw new Error('잘못된 일정 목록');
    tasks = data;
    tasksReady = true;
    button.disabled = false;
    renderTasks();
    message.textContent = tasks.length ? '' : '등록된 일정이 없습니다. 첫 일정을 추가해 주세요.';
  } catch {
    message.textContent = '일정을 불러오지 못했습니다. Supabase 연결 정보와 setup.sql 실행 여부를 확인한 뒤 새로고침해 주세요.';
  }
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

async function addTask(e) {
  e.preventDefault();
  if (!database || !tasksReady || savingTask) return;
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const button = document.getElementById('addTaskButton');
  const message = document.getElementById('msgBox');
  savingTask = true;
  button.disabled = true;
  message.textContent = '일정을 저장하는 중…';
  try {
    const { data, error } = await database.from('wx_tasks').insert(t)
      .select('id,title,region,kind,owner,created_at').single();
    if (error) throw error;
    if (!isTask(data)) throw new Error('잘못된 저장 응답');
    tasks.push(data);
    renderTasks();
    e.target.reset();
    message.textContent = '일정을 저장했습니다.';
  } catch {
    message.textContent = '저장 완료를 확인하지 못했습니다. 연결 상태를 확인하고 새로고침해 목록을 확인해 주세요.';
  } finally {
    savingTask = false;
    button.disabled = false;
  }
}

function saveMarkdown() {
  const date = document.getElementById('todayDate').textContent;
  const rows = Array.from(document.getElementById('taskList').rows, row =>
    Array.from(row.cells, cell => cell.textContent));
  const blob = new Blob([makeMarkdown(rows, date)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `현장일정_판단_${date}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
document.getElementById('todayDate').textContent = `${year}-${month}-${day}`;

document.getElementById('taskForm').addEventListener('submit', addTask);
document.getElementById('saveMarkdown').addEventListener('click', saveMarkdown);
loadTasks();
renderTasks();
loadWeather();
