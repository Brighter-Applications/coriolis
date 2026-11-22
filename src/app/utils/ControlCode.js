/**
 * Helpers for the outfitting page "control code": the slash separated string
 * (compressed with LZString) that follows a build code and stores pips, boost,
 * fuel, cargo, opponent and engagement range:
 *
 *   sys/eng/wep/boost/fuel/cargo/opponentId/opponentBuild/engagementRange/mcSys/mcEng/mcWep
 *
 * Kept free of React so that it can be unit tested.
 */

const MAX_PIPS_PER_CAPACITOR = 4;
const MAX_MULTI_CREW_PIPS_PER_CAPACITOR = 2;
const MAX_MULTI_CREW_PIPS_TOTAL = 2;
const MAX_MAIN_PIPS = 6;
const DEFAULT_PIPS = 2;

// Position of the opponent build name, the number of fields after it, and the field count of a current code
const OPPONENT_BUILD_INDEX = 7;
const TAIL_LENGTH = 4; // engagementRange/mcSys/mcEng/mcWep
const CURRENT_FIELD_COUNT = 12;

/**
 * Escape characters in a build name that would otherwise break the control code
 * @param  {string} name Build name
 * @return {string}      Name with '/' and '%' escaped
 */
export function escapeBuildName(name) {
  return String(name || '').replace(/[%/]/g, (char) => (char === '/' ? '%2F' : '%25'));
}

/**
 * Reverse escapeBuildName. Names written before escaping was introduced are returned as they are
 * @param  {string} name Escaped build name
 * @return {string}      Build name
 */
export function unescapeBuildName(name) {
  return String(name || '').replace(/%(2F|25)/gi, (match, hex) => (hex.toUpperCase() === '2F' ? '/' : '%'));
}

/**
 * Create the control code string
 * @param  {Object} control               The control values
 * @param  {number} control.sys           SYS pips (including multi-crew pips)
 * @param  {number} control.eng           ENG pips (including multi-crew pips)
 * @param  {number} control.wep           WEP pips (including multi-crew pips)
 * @param  {boolean} control.boost        True if boosting
 * @param  {number} control.fuel          Fuel carried
 * @param  {number} control.cargo         Cargo carried
 * @param  {string} control.opponentId    Opponent ship ID
 * @param  {string} control.opponentBuild Opponent build name (may be empty)
 * @param  {number} control.engagementRange Engagement range
 * @param  {number} control.mcSys         SYS pips from multi-crew
 * @param  {number} control.mcEng         ENG pips from multi-crew
 * @param  {number} control.mcWep         WEP pips from multi-crew
 * @return {string}                       The control code
 */
export function buildControlString({
  sys, eng, wep, boost, fuel, cargo, opponentId, opponentBuild, engagementRange, mcSys, mcEng, mcWep
}) {
  return [
    sys, eng, wep, boost ? 1 : 0, fuel, cargo, opponentId,
    opponentBuild ? escapeBuildName(opponentBuild) : '',
    engagementRange, mcSys, mcEng, mcWep
  ].join('/');
}

/**
 * Split a control code string into its fields. Codes written before build names were
 * escaped can contain '/' in the opponent build name, which shifts every later field.
 * When there are more fields than expected the surplus is treated as part of the name,
 * because the four fields after the name are always present in codes that long.
 * (A pre-multi-crew code, which has only 9 fields, with a '/' in the name cannot be told
 * apart from a current one and is left as it is.)
 * @param  {string} control The decompressed control code
 * @return {string[]}       Fields, with the opponent build name in index 7
 */
export function splitControlString(control) {
  const fields = String(control || '').split('/');
  if (fields.length > CURRENT_FIELD_COUNT) {
    const tailStart = fields.length - TAIL_LENGTH;
    const name = fields.slice(OPPONENT_BUILD_INDEX, tailStart).join('/');
    return [...fields.slice(0, OPPONENT_BUILD_INDEX), name, ...fields.slice(tailStart)]
      .map((field, index) => (index === OPPONENT_BUILD_INDEX ? unescapeBuildName(field) : field));
  }
  if (fields.length > OPPONENT_BUILD_INDEX) {
    fields[OPPONENT_BUILD_INDEX] = unescapeBuildName(fields[OPPONENT_BUILD_INDEX]);
  }
  return fields;
}

/**
 * Clamp a number to [min, max]
 * @param  {number} value Value
 * @param  {number} min   Minimum
 * @param  {number} max   Maximum
 * @return {number}       Clamped value
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Turn incoming pip values (from a URL, saved build, etc.) into a consistent set.
 * The sys, eng and wep values include the multi-crew pips, so the main pips of a capacitor
 * are its total minus its multi-crew pips, and the main pips must not add up to more than 6.
 * Anything that is not consistent falls back to the default 2/2/2 main pips and/or no multi-crew pips.
 * @param  {Object} pips       The incoming values
 * @param  {number} pips.sys   SYS total
 * @param  {number} pips.eng   ENG total
 * @param  {number} pips.wep   WEP total
 * @param  {number} pips.mcSys SYS multi-crew pips
 * @param  {number} pips.mcEng ENG multi-crew pips
 * @param  {number} pips.mcWep WEP multi-crew pips
 * @return {Object}            Consistent { sys, eng, wep, mcSys, mcEng, mcWep }
 */
export function sanitisePips({ sys, eng, wep, mcSys, mcEng, mcWep }) {
  // Multi-crew pips are whole pips, at most 2 per capacitor and 2 in total
  let mc = [mcSys, mcEng, mcWep].map((value) => {
    const pips = Math.trunc(Number(value));
    return Number.isFinite(pips) ? clamp(pips, 0, MAX_MULTI_CREW_PIPS_PER_CAPACITOR) : 0;
  });
  if (mc[0] + mc[1] + mc[2] > MAX_MULTI_CREW_PIPS_TOTAL) {
    mc = [0, 0, 0];
  }

  const totals = [sys, eng, wep].map(Number);
  const main = totals.map((total, index) => total - mc[index]);
  const consistent =
    totals.every((total) => Number.isFinite(total) && total <= MAX_PIPS_PER_CAPACITOR) &&
    main.every((pips) => pips >= 0) &&
    main[0] + main[1] + main[2] <= MAX_MAIN_PIPS;

  const result = consistent ? totals : mc.map((pips) => DEFAULT_PIPS + pips);
  return {
    sys: result[0],
    eng: result[1],
    wep: result[2],
    mcSys: mc[0],
    mcEng: mc[1],
    mcWep: mc[2]
  };
}
