(() => {
  const $ = (id) => document.getElementById(id);
  const storedBase = localStorage.getItem('attendance_admin_api') || 'http://localhost:3001/api';
  $('api-url').value = storedBase;
  let token = sessionStorage.getItem('attendance_admin_token');
  let page = 0;
  const pageSize = 50;
  let currentRecords = [];

  function showAdmin() {
    $('login-view').classList.toggle('hidden', Boolean(token));
    $('admin-view').classList.toggle('hidden', !token);
    if (token) refresh();
  }
  function apiUrl(path) { return `${$('api-url').value.trim().replace(/\/$/, '')}${path}`; }
  async function request(path, options = {}) {
    const response = await fetch(apiUrl(path), { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) { token = null; sessionStorage.removeItem('attendance_admin_token'); showAdmin(); }
      throw new Error(payload.message || `Request failed (${response.status})`);
    }
    return payload;
  }
  function safe(value) { return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function displayDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(); }
  function parseAudit(record) {
    try { const raw = typeof record.verification_meta === 'string' ? JSON.parse(record.verification_meta) : record.verification_meta; return raw?.checks || raw?.auditMeta?.checks || []; } catch { return []; }
  }
  function renderRows(records) {
    currentRecords = records;
    const body = $('records-body');
    if (!records.length) { body.innerHTML = '<tr><td colspan="9" class="empty">No attendance records match these filters.</td></tr>'; return; }
    body.innerHTML = records.map((record, index) => {
      const checks = parseAudit(record);
      const location = checks.find((item) => item.id === 'location');
      const face = Number(record.face_match_score || 0);
      const live = Number(record.liveness_score || 0);
      const status = String(record.status || 'UNKNOWN').toLowerCase();
      return `<tr><td><strong>${safe(record.teacher_name)}</strong><small>${safe(record.employee_code)} · ${safe(record.teacher_department || '')}</small></td><td>${safe(displayDate(record.timestamp))}</td><td>${safe(record.punch_type?.replace('_',' '))}</td><td><span class="pill ${status === 'late' ? 'late' : ''}">${safe(record.status)}</span></td><td><span class="pill">${location?.status === 'PASS' ? 'PASS' : 'CHECK'}</span><small>${safe(record.distance_meters)} m · ±${safe(record.gps_accuracy)} m</small></td><td>${Math.round(face * 100)}%</td><td>${Math.round(live * 100)}%</td><td><span class="pill">SYNCED</span></td><td><button class="detail-btn" data-index="${index}">View checks ↗</button></td></tr>`;
    }).join('');
    body.querySelectorAll('.detail-btn').forEach((button) => button.addEventListener('click', () => showDetails(records[Number(button.dataset.index)])));
  }
  function showDetails(record) {
    $('detail-title').textContent = `${record.teacher_name} · ${record.punch_type}`;
    const metadata = [ ['Employee', record.employee_code], ['Time', displayDate(record.timestamp)], ['Campus distance', `${record.distance_meters} m`], ['GPS accuracy', `±${record.gps_accuracy} m`], ['Face score', `${Math.round(Number(record.face_match_score || 0) * 100)}%`], ['Liveness score', `${Math.round(Number(record.liveness_score || 0) * 100)}%`] ];
    const checks = parseAudit(record);
    $('detail-content').innerHTML = `<div class="record-meta">${metadata.map(([label,value]) => `<div>${safe(label)}<strong>${safe(value)}</strong></div>`).join('')}</div><h3>Verification checks</h3>${checks.length ? checks.map((check) => `<div class="check-row"><div><strong>${safe(check.label || check.id)}</strong><p>${safe(check.detail || '')}</p></div><span class="check-state ${check.status === 'PASS' ? 'pass' : check.status === 'BYPASSED' ? 'bypassed' : 'fail'}">${safe(check.status)}</span></div>`).join('') : '<p class="muted">No individual check details were included in this record.</p>'}`;
    $('detail-dialog').showModal();
  }
  function filtersQuery() {
    const params = new URLSearchParams({ limit: String(pageSize), offset: String(page * pageSize) });
    const fields = [['teacher','filter-teacher'],['from','filter-from'],['to','filter-to'],['punchType','filter-type']];
    fields.forEach(([key,id]) => { if ($(id).value.trim()) params.set(key, $(id).value.trim()); });
    return params.toString();
  }
  async function refresh() {
    if (!token) return;
    $('page-error').classList.add('hidden');
    $('records-body').innerHTML = '<tr><td colspan="9" class="empty">Loading attendance…</td></tr>';
    try {
      const [summary, list] = await Promise.all([request('/admin/attendance/summary'), request(`/admin/attendance?${filtersQuery()}`)]);
      $('stat-total').textContent = summary.data.totalRecords ?? 0;
      $('stat-today').textContent = summary.data.todayRecords ?? 0;
      $('stat-present').textContent = summary.data.presentToday ?? 0;
      $('stat-teachers').textContent = summary.data.teachersSeen ?? 0;
      renderRows(list.data || []);
      $('page-label').textContent = `Page ${page + 1} · ${list.data?.length || 0} records`;
      $('prev-page').disabled = page === 0;
      $('next-page').disabled = (list.data?.length || 0) < pageSize;
    } catch (error) {
      $('page-error').textContent = error.message;
      $('page-error').classList.remove('hidden');
      $('records-body').innerHTML = '<tr><td colspan="9" class="empty">Could not load records.</td></tr>';
    }
  }
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    $('login-error').textContent = '';
    localStorage.setItem('attendance_admin_api', $('api-url').value.trim());
    try {
      const result = await request('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email: $('email').value, password: $('password').value }) });
      token = result.data.token;
      sessionStorage.setItem('attendance_admin_token', token);
      $('password').value = '';
      showAdmin();
    } catch (error) { $('login-error').textContent = error.message; }
  });
  $('filters').addEventListener('submit', (event) => { event.preventDefault(); page = 0; refresh(); });
  $('refresh').addEventListener('click', refresh);
  $('logout').addEventListener('click', () => { token = null; sessionStorage.removeItem('attendance_admin_token'); showAdmin(); });
  $('prev-page').addEventListener('click', () => { page = Math.max(0, page - 1); refresh(); });
  $('next-page').addEventListener('click', () => { page++; refresh(); });
  $('close-dialog').addEventListener('click', () => $('detail-dialog').close());
  showAdmin();
})();
