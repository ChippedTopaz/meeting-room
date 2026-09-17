// Only public catalog data belongs here. Never cache bookings or availability.
var CATALOG_CACHE_TTL_SECONDS = 120;

function catalogCacheKey_() {
  var settings = githubSettings_();
  return 'catalog-v1:' + settings.GITHUB_OWNER + '/' + settings.GITHUB_REPO + '/' + settings.GITHUB_BRANCH;
}

function getBootstrap_() {
  var startedAt = Date.now();
  var cache;
  var key = catalogCacheKey_();
  var catalog;
  try {
    cache = CacheService.getScriptCache();
    var cached = cache.get(key);
    if (cached) catalog = JSON.parse(cached);
  } catch (error) {
    // Cache is best-effort; a cache outage must not block a GitHub read.
    console.log(JSON.stringify({event: 'catalog_cache_unavailable'}));
  }
  var hit = !!(catalog && catalog.system && catalog.rooms && catalog.requirements);
  if (!hit) {
    var documents = githubGetJsonBatch_([
      'config/system.json', 'rooms/rooms.json', 'config/requirements.json'
    ]);
    catalog = {
      system: publicSystem_(documents[0]),
      rooms: publicRooms_(documents[1]),
      requirements: publicRequirements_(documents[2]),
      fetchedAt: new Date().toISOString()
    };
    try {
      if (cache) cache.put(key, JSON.stringify(catalog), CATALOG_CACHE_TTL_SECONDS);
    } catch (error) {
      console.log(JSON.stringify({event: 'catalog_cache_write_failed'}));
    }
  }
  return {
    status: 'ok',
    system: catalog.system,
    rooms: catalog.rooms,
    requirements: catalog.requirements,
    meta: {cache: hit ? 'hit' : 'miss', fetchedAt: catalog.fetchedAt,
      cacheTtlSeconds: CATALOG_CACHE_TTL_SECONDS, serverMs: Date.now() - startedAt}
  };
}

function invalidateCatalogCache_() {
  try {
    CacheService.getScriptCache().remove(catalogCacheKey_());
  } catch (error) {
    // A completed GitHub write remains successful even if cache removal fails.
    console.log(JSON.stringify({event: 'catalog_cache_invalidation_failed'}));
  }
}

// Editor only. No public cache-flush route.
function clearCatalogCacheInternal() {
  invalidateCatalogCache_();
}
