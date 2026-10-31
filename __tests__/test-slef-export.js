/**
 * SLEF (Ship Loadout Export Format) export tests.
 *
 * Spansh's Galaxy Plotter and other journal-Loadout consumers reject a SLEF
 * payload that lacks the calculated top-level values Frontier writes into a
 * journal Loadout event ("cannot parse ship"). toSLEF must emit, alongside the
 * module list: Ship (lowercase FD name), ShipName/ShipIdent, HullValue,
 * ModulesValue, UnladenMass, CargoCapacity, MaxJumpRange,
 * FuelCapacity {Main, Reserve} and Rebuy.
 */
import { Ships } from 'coriolis-data/dist';
import Ship from '../src/app/shipyard/Ship';
import * as Serializer from '../src/app/shipyard/Serializer';
import { shipModelFromJson } from '../src/app/utils/CompanionApiUtils';
import { shipFromLoadoutJSON } from '../src/app/utils/JournalUtils';

function slefData(shipId) {
  const sd = Ships[shipId];
  const ship = new Ship(shipId, sd.properties, sd.slots);
  ship.buildWith(sd.defaults);
  return { ship, data: Serializer.toSLEF('Test Build', ship)[0].data };
}

describe('SLEF export calculated values', () => {

  it('includes all Spansh-required top-level fields', () => {
    const { data } = slefData('explorer_nx');
    for (const key of [
      'Ship', 'ShipName', 'ShipIdent', 'HullValue', 'ModulesValue',
      'UnladenMass', 'CargoCapacity', 'MaxJumpRange', 'FuelCapacity', 'Rebuy', 'Modules'
    ]) {
      expect(data).toHaveProperty(key);
    }
    expect(data.FuelCapacity).toHaveProperty('Main');
    expect(data.FuelCapacity).toHaveProperty('Reserve');
  });

  it('emits the lowercase Frontier ship name (journal convention)', () => {
    expect(slefData('explorer_nx').data.Ship).toBe('explorer_nx');
    expect(slefData('krait_mkii').data.Ship).toBe('krait_mkii');
    expect(slefData('anaconda2').data.Ship).toBe('anacondamkii');
    expect(slefData('type_9_heavy').data.Ship).toBe('type9');
    // never the mixed-case SHIP_FD_NAME_TO_CORIOLIS_NAME key
    expect(slefData('explorer_nx').data.Ship).not.toBe('Explorer_NX');
  });

  it('computes values consistent with the ship', () => {
    const { ship, data } = slefData('explorer_nx');
    expect(data.HullValue).toBe(Math.round(ship.hullCost));
    expect(data.ModulesValue).toBe(Math.round(ship.totalCost - ship.hullCost));
    expect(data.CargoCapacity).toBe(ship.cargoCapacity);
    expect(data.FuelCapacity.Main).toBe(ship.fuelCapacity);
    expect(data.FuelCapacity.Reserve).toBe(ship.reserveFuelCapacity);
    expect(data.MaxJumpRange).toBeGreaterThan(0);
    expect(typeof data.MaxJumpRange).toBe('number');
  });

  it('computes Rebuy as 5% of hull + modules value (floored), like the game', () => {
    for (const id of ['explorer_nx', 'anaconda2', 'sidewinder']) {
      const { data } = slefData(id);
      expect(data.Rebuy).toBe(Math.floor((data.HullValue + data.ModulesValue) * 0.05));
    }
  });

  it('exports every module Item in lowercase, as the game writes them', () => {
    for (const id of ['explorer_nx', 'anaconda2', 'krait_mkii']) {
      const { data } = slefData(id);
      for (const m of data.Modules) {
        expect(m.Item).toBe(m.Item.toLowerCase());
      }
    }
  });

  describe('engineered modifier labels', () => {
    // An imported loadout with an engineered (G2 Increased Range) FSD.
    const fixture = require('./fixtures/slef-single-build.json')[0].data;
    const exported = Serializer.toSLEF('x', shipFromLoadoutJSON(fixture))[0].data;
    const labelsFor = (slot) => {
      const mod = exported.Modules.find(m => m.Slot === slot);
      return ((mod && mod.Engineering && mod.Engineering.Modifiers) || []).map(x => x.Label);
    };

    it('labels an engineered FSD optimal mass as FSDOptimalMass (not EngineOptimalMass)', () => {
      const labels = labelsFor('FrameShiftDrive');
      expect(labels).toContain('FSDOptimalMass');
      expect(labels).not.toContain('EngineOptimalMass');
      expect(labels).not.toContain('ShieldGenOptimalMass');
    });

    it('preserves the engineered FSD optimal mass through export and re-import', () => {
      const original = shipFromLoadoutJSON(fixture);
      const back = shipFromLoadoutJSON(exported);
      expect(Math.round(back.standard[2].m.getOptMass())).toBe(Math.round(original.standard[2].m.getOptMass()));
    });

    it('only uses real Frontier modifier labels', () => {
      const { Modifications } = require('coriolis-data/dist');
      const valid = new Set(Object.keys(Modifications.modifierActions).map(k => k.replace('OutfittingFieldType_', '')));
      for (const mod of exported.Modules) {
        for (const x of ((mod.Engineering && mod.Engineering.Modifiers) || [])) {
          expect(valid.has(x.Label)).toBe(true);
        }
      }
    });
  });

  it('exports a ship imported from a loadout that omits Priority values', () => {
    // The fixture omits Priority on several modules (incl. a Guardian FSD
    // Booster, which MaxJumpRange checks the power status of). This used to
    // crash the export.
    const fixture = require('./fixtures/slef-single-build.json')[0].data;
    const ship = shipFromLoadoutJSON(fixture);
    const data = Serializer.toSLEF('x', ship)[0].data;
    expect(data.MaxJumpRange).toBeGreaterThan(0);
  });

  describe('slot names match the game exactly (ship-slots.json)', () => {
    // Real journal Loadout events (31 Oct 2026) with every slot filled. The
    // game's numbering has gaps and duplicates the old counter-based export
    // could not reproduce: the Type-8 has no SmallHardpoint3 (1,2,4,5,6) and
    // the Type-7 starts at Slot00 and has both Slot09_Size2 and Slot09_Size1.
    const isSlot = n => /hardpoint|^slot\d|^military|^cargo\d/i.test(n);
    for (const ship of ['type7', 'type8']) {
      it(`exports every ${ship} hardpoint/internal module under the journal's own slot name`, () => {
        const ev = require(`./fixtures/journal-loadout-${ship}.json`);
        const id = shipModelFromJson(ev);
        const sd = Ships[id];
        // Build via the build code, as the outfitting page holds the ship.
        const s = new Ship(id, sd.properties, sd.slots);
        s.buildFrom(shipFromLoadoutJSON(ev).toString());
        const exported = Serializer.toSLEF('x', s)[0].data.Modules;
        const pairs = mods => mods.filter(m => isSlot(m.Slot)).map(m => `${m.Slot}=${m.Item.toLowerCase()}`).sort();
        expect(pairs(exported)).toEqual(pairs(ev.Modules));
      });
    }
  });

  it('round-trips: the exported data re-imports to the same ship', () => {
    for (const id of ['explorer_nx', 'krait_mkii', 'anaconda2', 'federal_corvette']) {
      const { data } = slefData(id);
      expect(shipModelFromJson(data)).toBe(id);
      expect(() => shipFromLoadoutJSON(data)).not.toThrow();
    }
  });
});
