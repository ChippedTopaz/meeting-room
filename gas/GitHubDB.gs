function githubSettings_() {
  var properties = PropertiesService.getScriptProperties();
  var settings = {};
  ['GITHUB_OWNER', 'GITHUB_REPO', 'GITHUB_BRANCH', 'GITHUB_TOKEN'].forEach(function (key) {
    var value = properties.getProperty(key);
    if (!value || !value.trim()) throw appError_('CONFIG_MISSING', 'Chưa cấu hình đủ GitHub Script Properties.');
    settings[key] = value.trim();
  });
  return settings;
}

function databasePath_(path) {
  if (typeof path !== 'string') throw appError_('INVALID_PATH', 'Đường dẫn database không hợp lệ.');
  var relative = path.indexOf('database/') === 0 ? path.slice(9) : path;
  var parts = relative.split('/');
  if (!relative.endsWith('.json') || parts.some(function (part) {
    return !part || part === '.' || part === '..' || !/^[a-zA-Z0-9_.-]+$/.test(part);
  })) throw appError_('INVALID_PATH', 'Đường dẫn database không hợp lệ.');
  return 'database/' + parts.map(encodeURIComponent).join('/');
}

function githubRequestOptions_(method, path, payload, settings) {
  var url = 'https://api.github.com/repos/' + encodeURIComponent(settings.GITHUB_OWNER) +
    '/' + encodeURIComponent(settings.GITHUB_REPO) + '/contents/' + databasePath_(path);
  var options = {
    method: method,
    headers: {Authorization: 'Bearer ' + settings.GITHUB_TOKEN, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'},
    muteHttpExceptions: true
  };
  if (method === 'get') {
    url += '?ref=' + encodeURIComponent(settings.GITHUB_BRANCH);
  } else {
    payload.branch = settings.GITHUB_BRANCH;
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  options.url = url;
  return options;
}

function githubRequest_(method, path, payload) {
  var options = githubRequestOptions_(method, path, payload, githubSettings_());
  var startedAt = Date.now();
  var response;
  try {
    response = UrlFetchApp.fetch(options.url, options);
  } catch (error) {
    throw appError_('GITHUB_NETWORK_ERROR', 'Không thể kết nối GitHub.');
  }
  console.log(JSON.stringify({event: 'github_fetch', path: databasePath_(path),
    method: method, elapsedMs: Date.now() - startedAt, status: response.getResponseCode()}));
  return githubParseResponse_(response);
}

function githubParseResponse_(response) {
  var status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    // M3 may add conflict retry here, with a fresh read and data reconciliation.
    if (status === 409) throw appError_('GITHUB_CONFLICT', 'File đã thay đổi. Hãy đọc lại trước khi ghi.');
    throw appError_('GITHUB_HTTP_ERROR', 'GitHub trả về HTTP ' + status + '.');
  }
  try {
    return JSON.parse(response.getContentText());
  } catch (error) {
    throw appError_('GITHUB_INVALID_RESPONSE', 'GitHub trả về dữ liệu không hợp lệ.');
  }
}

function githubGetFile(path) {
  return githubDecodeFile_(githubRequest_('get', path));
}

function githubDecodeFile_(file) {
  if (file.type !== 'file' || file.encoding !== 'base64' || typeof file.content !== 'string' || !file.sha) {
    throw appError_('GITHUB_INVALID_FILE', 'File phải là JSON nhỏ, mã hóa base64.');
  }
  return {sha: file.sha, content: Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\s/g, '')))
    .getDataAsString('UTF-8')};
}

function githubGetJson(path) {
  try {
    return JSON.parse(githubGetFile(path).content);
  } catch (error) {
    if (error.publicCode) throw error;
    throw appError_('DATABASE_INVALID_JSON', 'File database không phải JSON hợp lệ.');
  }
}

function githubUpdateFile(path, content, sha, commitMessage) {
  if (typeof content !== 'string' || !sha || !commitMessage) {
    throw appError_('INVALID_WRITE', 'Cần nội dung, SHA hiện tại và commit message.');
  }
  var result = githubRequest_('put', path, {
    message: commitMessage, sha: sha,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8)
  });
  if (['database/config/system.json', 'database/rooms/rooms.json',
      'database/config/requirements.json'].indexOf(databasePath_(path)) !== -1) {
    invalidateCatalogCache_();
  }
  return result;
}

function githubWriteJson(path, data, commitMessage) {
  // M0 updates existing files only. GET immediately before PUT to obtain SHA.
  // This is not a transactional read-modify-write; M3 must handle concurrent writers.
  var current = githubGetFile(path);
  return githubUpdateFile(path, JSON.stringify(data, null, 2) + '\n', current.sha, commitMessage);
}

// One GAS execution, three GitHub requests issued as a batch on cache miss.
// Generic database reads and writes remain uncached, including future bookings.
function githubGetJsonBatch_(paths) {
  var settings = githubSettings_();
  var requests = paths.map(function (path) {
    return githubRequestOptions_('get', path, null, settings);
  });
  var startedAt = Date.now();
  var responses;
  try {
    responses = UrlFetchApp.fetchAll(requests);
  } catch (error) {
    console.log(JSON.stringify({event: 'github_batch_error', elapsedMs: Date.now() - startedAt}));
    throw appError_('GITHUB_NETWORK_ERROR', 'Cannot reach GitHub.');
  }
  console.log(JSON.stringify({event: 'github_batch', count: paths.length,
    elapsedMs: Date.now() - startedAt,
    statuses: responses.map(function (response) { return response.getResponseCode(); })}));
  return responses.map(function (response) {
    var file = githubDecodeFile_(githubParseResponse_(response));
    try {
      return JSON.parse(file.content);
    } catch (error) {
      throw appError_('DATABASE_INVALID_JSON', 'Invalid database JSON.');
    }
  });
}
