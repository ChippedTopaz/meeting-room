function doGet() {
  return jsonResponse_({success: true, data: {service: 'meeting-room', milestone: 'M0'}, message: 'GAS đang chạy.'});
}

function doPost(e) {
  try {
    var body;
    try {
      body = JSON.parse(e && e.postData ? e.postData.contents : '');
    } catch (error) {
      throw appError_('INVALID_JSON', 'Body phải là JSON hợp lệ.');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string') {
      throw appError_('INVALID_REQUEST', 'Thiếu action hợp lệ.');
    }
    if (!isPublicReadAction_(body.action)) {
      throw appError_('ACTION_NOT_ALLOWED', 'Action không được hỗ trợ trong M0.');
    }

    // Explicit routes only: never resolve client-provided function names or paths.
    var data;
    switch (body.action) {
      case 'ping':
        data = {status: 'ok', timestamp: new Date().toISOString()};
        break;
      case 'getSystemInfo':
        data = pickFields_(githubGetJson('config/system.json'),
          ['version', 'systemName', 'timezone', 'bookingMode', 'updatedAt']);
        break;
      case 'getRooms':
        var rooms = githubGetJson('rooms/rooms.json');
        data = {version: rooms.version, rooms: rooms.rooms.map(function (room) {
          return pickFields_(room, ['id', 'name', 'capacity', 'location', 'active']);
        })};
        break;
      case 'getRequirements':
        var requirements = githubGetJson('config/requirements.json');
        data = {version: requirements.version, requirements: requirements.requirements.map(function (item) {
          return pickFields_(item, ['id', 'name', 'active']);
        })};
        break;
    }
    return jsonResponse_({success: true, data: data, message: ''});
  } catch (error) {
    // Never send upstream responses, tokens, stack traces or arbitrary errors.
    return jsonResponse_({success: false, error: {
      code: error.publicCode || 'INTERNAL_ERROR',
      message: error.publicCode ? error.message : 'Không thể xử lý yêu cầu.'
    }});
  }
}

// Run manually in Apps Script Editor only. Not reachable from doPost.
function testGithubWriteInternal() {
  var system = githubGetJson('config/system.json');
  system.lastWriteTestAt = new Date().toISOString();
  var result = githubWriteJson('config/system.json', system, 'M0: test GitHub write');
  Logger.log(JSON.stringify({success: true, lastWriteTestAt: system.lastWriteTestAt, sha: result.content.sha}));
}
