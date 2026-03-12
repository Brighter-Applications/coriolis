/**
 * Client for fetching CMDR data from cmdr.coriolis.io.
 *
 * All endpoints require an API key sent via X-Api-Key header.
 * The host and key are stored per-CMDR link in Persist.
 */

/**
 * Make an authenticated GET request to the CMDR API
 * @param  {String} host    API host (e.g. 'https://cmdr.coriolis.io')
 * @param  {String} apiKey  API key
 * @param  {String} path    API path (e.g. '/api/ships/')
 * @return {Promise}        Resolves with parsed JSON
 */
function _fetch(host, apiKey, path) {
  return fetch(host + path, {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
    },
  }).then(resp => {
    if (!resp.ok) {
      throw new Error(`CMDR API ${resp.status}: ${resp.statusText}`);
    }
    return resp.json();
  });
}

/**
 * Fetch the CMDR profile (name, credits, location, ranks)
 * @param  {Object} link  { host, apiKey }
 * @return {Promise<Object>}
 */
export function fetchProfile(link) {
  return _fetch(link.host, link.apiKey, '/api/profile/');
}

/**
 * Fetch all ships owned by the CMDR
 * @param  {Object} link  { host, apiKey }
 * @return {Promise<Object>}  { ships: [...] }
 */
export function fetchShips(link) {
  return _fetch(link.host, link.apiKey, '/api/ships/');
}

/**
 * Fetch the CMDR's material inventory
 * @param  {Object} link  { host, apiKey }
 * @return {Promise<Object>}  { materials: { raw: {}, manufactured: {}, encoded: {} } }
 */
export function fetchMaterials(link) {
  return _fetch(link.host, link.apiKey, '/api/materials/');
}

/**
 * Fetch the CMDR's stored modules
 * @param  {Object} link  { host, apiKey }
 * @return {Promise<Object>}  { modules: [...] }
 */
export function fetchModules(link) {
  return _fetch(link.host, link.apiKey, '/api/modules/');
}
