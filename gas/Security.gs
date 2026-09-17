// M0 placeholder only.
// Production authorization will be implemented in M1.
// This allowlist limits routing; it is NOT authentication or production security.
function isPublicReadAction_(action) {
  return ['ping', 'bootstrap', 'getSystemInfo', 'getRooms', 'getRequirements'].indexOf(action) !== -1;
}
