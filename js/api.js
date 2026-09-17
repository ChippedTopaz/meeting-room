const GAS_API_URL = 'PASTE_GAS_WEB_APP_EXEC_URL_HERE';

async function apiRequest(action, data = {}) {
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(GAS_API_URL)) {
    throw new Error('Hãy cấu hình URL GAS /exec trong js/api.js.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(GAS_API_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({action, data}),
      redirect: 'follow',
      credentials: 'omit',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`GAS trả về HTTP ${response.status}.`);
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('GAS không trả JSON. Kiểm tra URL /exec và quyền truy cập deployment.');
    }
    if (result?.success === false) throw new Error(result.error?.message || 'API báo lỗi.');
    if (result?.success !== true || !Object.prototype.hasOwnProperty.call(result, 'data')) {
      throw new Error('Response API không đúng định dạng.');
    }
    return result.data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Kết nối quá thời gian chờ 30 giây.');
    if (error instanceof TypeError) throw new Error('Lỗi mạng hoặc CORS. Kiểm tra mạng và GAS deployment.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
