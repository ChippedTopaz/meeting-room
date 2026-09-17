async function checkConnection() {
  if (appState.loading) return;
  appState.loading = true;
  appState.results = {};
  const button = document.getElementById('check-connection');
  const status = document.getElementById('connection-status');
  button.disabled = true;
  status.textContent = 'Đang kiểm tra kết nối…';
  const checks = [
    ['ping', 'gas-status'], ['getSystemInfo', 'system-info'],
    ['getRooms', 'rooms'], ['getRequirements', 'requirements']
  ];
  checks.forEach(([, id]) => { document.getElementById(id).textContent = 'Đang tải…'; });
  try {
    await Promise.all(checks.map(async ([action, id]) => {
      try {
        const data = await apiRequest(action);
        appState.results[action] = {success: true, data};
        renderJson(id, data);
      } catch (error) {
        appState.results[action] = {success: false, message: error.message};
        document.getElementById(id).textContent = error.message;
      }
    }));
    const passed = Object.values(appState.results).filter(result => result.success).length;
    status.textContent = passed === checks.length
      ? 'Kết nối thành công: 4/4 API phản hồi.'
      : `Kiểm tra hoàn tất: ${passed}/4 API thành công. Xem chi tiết bên dưới.`;
  } finally {
    appState.loading = false;
    button.disabled = false;
  }
}

document.getElementById('check-connection').addEventListener('click', checkConnection);
