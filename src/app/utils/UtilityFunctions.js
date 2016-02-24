
/**
 * Wraps the callback/context menu handler such that the default
 * operation can proceed if the SHIFT key is held while right-clicked
 * @param  {Function} cb Callback for contextMenu
 * @return {Function}    Wrapped contextmenu handler
 */
export function wrapCtxMenu(cb) {
  return (event) => {
    if (!event.getModifierState('Shift')) {
      event.preventDefault();
      cb.call(null, event);
    }
  };
}

/**
 * Stop context menu / right-click propagation unless shift is held.
 * @param  {SyntheticEvent} event Event
 */
export function stopCtxPropagation(event) {
  if (!event.getModifierState('Shift')) {
    event.preventDefault();
    event.stopPropagation();
  }
}

/**
 * Compares A and B and return true using strict comparison (===)
 * @param  {any} objA   A
 * @param  {any} objB   B
 * @return {boolean}    true if A === B OR A properties === B properties
 */
export function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null ||
      typeof objB !== 'object' || objB === null) {
    return false;
  }

  let keysA = Object.keys(objA);
  let keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  let bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
  for (let i = 0; i < keysA.length; i++) {
    if (!bHasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
      return false;
    }
  }

  return true;
}
