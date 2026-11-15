/**
 * BuildSync utility — syncs local Coriolis builds to cmdr.coriolis.io.
 *
 * Provides three entry points:
 *   syncAllBuilds(link)                            – push every local build
 *   syncSingleBuild(link, shipId, buildName, code) – push one build
 *   deleteSyncedBuild(link, shipId, buildName)     – remove one build from the server
 *
 * All are fire-and-forget; errors are logged to the console but never
 * surface to the user.
 */
import { Ships } from 'coriolis-data/dist';
import Persist from '../stores/Persist';
import Ship from '../shipyard/Ship';
import { toDetailedBuild, toSLEF } from '../shipyard/Serializer';
import { saveBuild, deleteBuild } from './CmdrApi';
import { outfitURL } from './UrlGenerators';

/**
 * Generate the SLEF and detailed JSON exports for a build, so the server can
 * serve them from its build export API.
 *
 * @param  {String} shipId    Coriolis ship key
 * @param  {String} buildName User-facing build name
 * @param  {String} code      Serialised ship code string
 * @return {Object}           { slef, json }, or {} if the build can't be generated
 */
export function buildExports(shipId, buildName, code) {
  const shipData = Ships[shipId];
  if (!shipData) return {};
  try {
    const ship = new Ship(shipId, shipData.properties, shipData.slots).buildFrom(code);
    return {
      slef: toSLEF(buildName, ship),
      json: toDetailedBuild(buildName, ship),
    };
  } catch (err) {
    console.warn('[BuildSync] could not generate exports for', shipId, '–', buildName, err);
    return {};
  }
}

/**
 * Push a single build to cmdr.coriolis.io.
 *
 * @param {Object} link      { host, apiKey }
 * @param {String} shipId    Coriolis ship key (e.g. 'fer_de_lance')
 * @param {String} buildName User-facing build name
 * @param {String} code      Serialised ship code string
 */
export function syncSingleBuild(link, shipId, buildName, code) {
  if (!link || !shipId || !buildName || !code) return;
  const shipData = Ships[shipId];
  const displayName = shipData ? shipData.properties.name : shipId;
  const url = window.location.origin + outfitURL(shipId, code, buildName);
  saveBuild(link, {
    shipType: shipId,
    shipDisplayName: displayName,
    buildName,
    code,
    url,
    ...buildExports(shipId, buildName, code),
  }).then(() => {
    console.log('[BuildSync] synced', displayName, '–', buildName);
  }).catch(err => {
    console.warn('[BuildSync] failed to sync', displayName, '–', buildName, err);
  });
}

/**
 * Remove a single build from cmdr.coriolis.io.
 *
 * @param {Object} link      { host, apiKey }
 * @param {String} shipId    Coriolis ship key
 * @param {String} buildName User-facing build name
 */
export function deleteSyncedBuild(link, shipId, buildName) {
  if (!link || !shipId || !buildName) return;
  deleteBuild(link, shipId, buildName).then(() => {
    console.log('[BuildSync] deleted', shipId, '–', buildName);
  }).catch(err => {
    console.warn('[BuildSync] failed to delete', shipId, '–', buildName, err);
  });
}

/**
 * Push every locally-stored build to cmdr.coriolis.io.
 * Requests are sent in parallel; failures are logged individually.
 *
 * @param {Object} link  { host, apiKey }
 */
export function syncAllBuilds(link) {
  if (!link) return;
  const builds = Persist.getBuilds(); // { shipId: { buildName: code, ... }, ... }
  if (!builds) return;
  const shipIds = Object.keys(builds);
  let count = 0;
  for (const shipId of shipIds) {
    const shipBuilds = builds[shipId];
    if (!shipBuilds) continue;
    for (const buildName of Object.keys(shipBuilds)) {
      const code = shipBuilds[buildName];
      if (!code) continue;
      syncSingleBuild(link, shipId, buildName, code);
      count++;
    }
  }
  console.log('[BuildSync] queued', count, 'build(s) for sync');
}
