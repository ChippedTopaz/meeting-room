function doGet() {
  return jsonResponse_({success: true, data: {service: 'meeting-room', milestone: 'M0'}, message: 'GAS đang chạy.'});
}

function publicSystem_(system) {
  return pickFields_(system, ['version', 'systemName', 'timezone', 'bookingMode', 'updatedAt']);
}

function publicRooms_(document) {
  return {version: document.version, rooms: document.rooms.map(function (room) {
    return pickFields_(room, ['id', 'name', 'capacity', 'location', 'active']);
  })};
}

function publicRequirements_(document) {
  return {version: document.version, requirements: document.requirements.map(function (item) {
    return pickFields_(item, ['id', 'name', 'active']);
  })};
}

function doPost(e) {
  var startedAt = Date.now();
  var action = 'invalid';
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
    action = body.action;
    // Fixed routes only. Legacy individual reads deliberately bypass catalog cache
    // for diagnostics; the application uses bootstrap exclusively.
    var data;
    switch (action) {
      case 'ping':
        data = {status: 'ok', timestamp: new Date().toISOString()};
        break;
      case 'bootstrap':
        data = getBootstrap_();
        break;
      case 'getSystemInfo':
        data = publicSystem_(githubGetJson('config/system.json'));
        break;
      case 'getRooms':
        data = publicRooms_(githubGetJson('rooms/rooms.json'));
        break;
      case 'getRequirements':
        data = publicRequirements_(githubGetJson('config/requirements.json'));
        break;
    }
    console.log(JSON.stringify({event: 'api_complete', action: action,
      elapsedMs: Date.now() - startedAt, cache: action === 'bootstrap' ? data.meta.cache : 'bypass'}));
    return jsonResponse_({success: true, data: data, message: ''});
  } catch (error) {
    console.log(JSON.stringify({event: 'api_error', action: action,
      elapsedMs: Date.now() - startedAt, code: error.publicCode || 'INTERNAL_ERROR'}));
    // Never return upstream bodies, credentials or stack traces.
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
