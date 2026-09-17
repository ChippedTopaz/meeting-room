async function checkConnection() {
  if (appState.loading) return;
  appState.loading = true;
  appState.results = {};
  const button = document.getElementById('check-connection');
  const status = document.getElementById('connection-status');
  const panels = ['gas-status', 'system-info', 'rooms', 'requirements'];
  const startedAt = performance.now();
  button.disabled = true;
  status.textContent = 'Đang tải dữ liệu danh mục…';
  panels.forEach(id => { document.getElementById(id).textContent = 'Đang tải…'; });
  try {
    const data = await apiRequest('bootstrap');
    if (!data || data.status !== 'ok' || !data.system ||
        !Array.isArray(data.rooms?.rooms) || !Array.isArray(data.requirements?.requirements) || !data.meta) {
      throw new Error('Bootstrap không đúng định dạng. Kiểm tra phiên bản GAS deployment.');
    }
    appState.results.bootstrap = {success: true, data};
    renderJson('gas-status', {status: data.status, ...data.meta,
      clientMs: Math.round(performance.now() - startedAt)});
    renderJson('system-info', data.system);
    renderJson('rooms', data.rooms);
    renderJson('requirements', data.requirements);
    status.textContent = 'Kết nối thành công: đã tải system, rooms và requirements qua một API bootstrap.';
  } catch (error) {
    appState.results.bootstrap = {success: false, message: error.message};
    panels.forEach(id => { document.getElementById(id).textContent = error.message; });
    status.textContent = 'Không tải được dữ liệu. Bấm Kiểm tra kết nối để thử lại.';
  } finally {
    appState.loading = false;
    button.disabled = false;
  }
}

document.getElementById('check-connection').addEventListener('click', checkConnection);
// One request on page load; no automatic retries or four-action fallback.
checkConnection();
