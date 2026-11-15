import Ship from '../src/app/shipyard/Ship';
import { Ships, Modifications } from 'coriolis-data/dist';
import { getBlueprint } from '../src/app/utils/BlueprintFunctions';
import { shipFromLoadoutJSON } from '../src/app/utils/JournalUtils';

/**
 * Limpet controller blueprints use the game's Misc_* names (EDCD/coriolis#913).
 * Older saved builds and imports may carry the previous Coriolis-only names
 * (e.g. ProspectingLimpet_LightWeight) and must keep working.
 */

const LIMPET_GROUPS = ['pc', 'cc', 'fx', 'hb'];
const LEGACY_PREFIXES = ['ProspectingLimpet', 'CollectionLimpet', 'FuelTransferLimpet', 'HatchBreakerLimpet'];
const TYPES = ['LightWeight', 'Reinforced', 'Shielded'];

// Mirrors the check ModificationsMenu uses to show the applied blueprint
function menuShowsBlueprint(m) {
  const listed = Modifications.modules[m.grp].blueprints[m.blueprint.fdname];
  return Boolean(m.blueprint.name && listed && listed.grades && listed.grades[m.blueprint.grade]);
}

function findSlot(ship, grp) {
  return ship.internal.find(slot => slot.m && slot.m.grp === grp);
}

describe('Limpet controller blueprints', function() {
  it('limpet controller groups list the game Misc_* blueprints', function() {
    for (const grp of LIMPET_GROUPS) {
      expect({ [grp]: Object.keys(Modifications.modules[grp].blueprints).sort() })
        .toEqual({ [grp]: TYPES.map(t => 'Misc_' + t).sort() });
    }
  });

  it('maps every legacy limpet blueprint name (any case) to its Misc_* equivalent', function() {
    const module = { grp: 'pc', symbol: 'Int_DroneControl_Prospector_Size3_Class5' };
    for (const prefix of LEGACY_PREFIXES) {
      for (const type of TYPES) {
        const legacy = prefix + '_' + type;
        for (const name of [legacy, legacy.toLowerCase()]) {
          const bp = getBlueprint(name, module);
          expect({ [name]: bp.fdname }).toEqual({ [name]: 'Misc_' + type });
          expect(bp.id).toBe(Modifications.blueprints['Misc_' + type].id);
        }
      }
    }
  });

  it('does not change other blueprints', function() {
    expect(getBlueprint('Sensor_LightWeight', { symbol: 'Int_Sensors_Size3_Class2' }).fdname).toBe('Sensor_LightWeight');
    expect(getBlueprint('Misc_LightWeight', { symbol: 'Int_LifeSupport_Size3_Class2' }).fdname).toBe('Misc_LightWeight');
  });

  it('imports the EDSY SLEF from issue #913 with the blueprint shown in the engineering menu', function() {
    const slef = require('./fixtures/issue-913-type11-edsy-slef.json');
    const ship = shipFromLoadoutJSON(slef[0].data);
    const slot = findSlot(ship, 'pc');
    expect(slot).toBeDefined();
    expect(slot.m.blueprint.fdname).toBe('Misc_LightWeight');
    expect(slot.m.blueprint.grade).toBe(5);
    expect(slot.m.getMass()).toBeCloseTo(0.75, 2);
    expect(menuShowsBlueprint(slot.m)).toBe(true);
  });

  it('loads a saved build that uses a legacy limpet blueprint and re-saves it with the new one', function() {
    const id = 'type_11_prospector';
    const original = new Ship(id, Ships[id].properties, Ships[id].slots);
    original.buildFrom(shipFromLoadoutJSON(require('./fixtures/issue-913-type11-edsy-slef.json')[0].data).toString());

    // Recreate what an old saved build contains: the legacy blueprint (by id) on the prospector controller
    const legacyBp = JSON.parse(JSON.stringify(Modifications.blueprints.ProspectingLimpet_LightWeight));
    const slot = findSlot(original, 'pc');
    legacyBp.grade = slot.m.blueprint.grade;
    slot.m.blueprint = legacyBp;
    original.updateModificationsString();
    const legacyCode = original.toString();

    const rebuilt = new Ship(id, Ships[id].properties, Ships[id].slots);
    rebuilt.buildFrom(legacyCode);
    const rebuiltSlot = findSlot(rebuilt, 'pc');
    expect(rebuiltSlot.m.blueprint.fdname).toBe('Misc_LightWeight');
    expect(rebuiltSlot.m.blueprint.grade).toBe(5);
    expect(rebuiltSlot.m.getMass()).toBeCloseTo(0.75, 2);
    expect(menuShowsBlueprint(rebuiltSlot.m)).toBe(true);

    // Re-saving writes the new blueprint, and that loads back the same
    const resaved = rebuilt.toString();
    expect(resaved).not.toBe(legacyCode);
    const again = new Ship(id, Ships[id].properties, Ships[id].slots);
    again.buildFrom(resaved);
    expect(findSlot(again, 'pc').m.blueprint.fdname).toBe('Misc_LightWeight');
    expect(again.toString()).toBe(resaved);
  });
});
