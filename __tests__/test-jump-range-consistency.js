import Ship from '../src/app/shipyard/Ship';
import * as Calc from '../src/app/shipyard/Calculations';
import { Ships } from 'coriolis-data/dist';

/**
 * Guards against jump range fields on Ship drifting from the outfitting summary
 * (ShipSummaryTable.jsx / ResponsiveShipSummary.jsx), e.g. double-counting fuel.
 * See https://github.com/EDCD/coriolis/issues/912
 *
 * Mass conventions:
 *   dryMass     = hull + modules (no fuel, no cargo)
 *   unladenMass = dryMass + full fuel tank
 *   ladenMass   = unladenMass + cargo
 */

// The same formulas the outfitting summary tables use
function summaryRanges(ship) {
  const fsd = ship.standard[2].m;
  const maxFuel = fsd.getMaxFuelPerJump();
  return {
    unladenRange: Calc.jumpRange(ship.unladenMass - ship.fuelCapacity + maxFuel, fsd, maxFuel, ship),
    fullTankRange: Calc.jumpRange(ship.unladenMass, fsd, ship.fuelCapacity, ship),
    ladenRange: Calc.jumpRange(ship.unladenMass + ship.cargoCapacity, fsd, ship.fuelCapacity, ship),
    unladenFastestRange: Calc.totalJumpRange(ship.unladenMass, fsd, ship.fuelCapacity, ship),
    ladenFastestRange: Calc.totalJumpRange(ship.unladenMass + ship.cargoCapacity, fsd, ship.fuelCapacity, ship),
  };
}

function expectMatchesSummary(ship, label) {
  const expected = summaryRanges(ship);
  for (const field of Object.keys(expected)) {
    expect({ [`${label} ${field}`]: ship[field] })
      .toEqual({ [`${label} ${field}`]: expect.closeTo(expected[field], 6) });
  }
}

describe('Jump range consistency', function() {
  it('mass fields follow the dry / unladen / laden conventions', function() {
    for (const id in Ships) {
      const ship = new Ship(id, Ships[id].properties, Ships[id].slots);
      ship.buildWith(Ships[id].defaults);
      expect(ship.unladenMass).toBeCloseTo(ship.dryMass + ship.fuelCapacity, 6);
      expect(ship.ladenMass).toBeCloseTo(ship.unladenMass + ship.cargoCapacity, 6);
    }
  });

  it('Ship jump range fields match the outfitting summary for every stock ship', function() {
    for (const id in Ships) {
      const ship = new Ship(id, Ships[id].properties, Ships[id].slots);
      ship.buildWith(Ships[id].defaults);
      expectMatchesSummary(ship, id);
    }
  });

  it('matches the outfitting summary for the build reported in issue #912', function() {
    const id = 'type_7_transport';
    const ship = new Ship(id, Ships[id].properties, Ships[id].slots);
    ship.buildFrom('A0p0tiFfliddsdf5--------0505040403480101--.Iw18eQ==.Aw18eQ==.');
    expectMatchesSummary(ship, 'issue912');

    // Values shown in the outfitting summary for this build
    expect(ship.unladenRange).toBeCloseTo(35.51, 2);
    expect(ship.fullTankRange).toBeCloseTo(32.95, 2);
    expect(ship.unladenFastestRange).toBeCloseTo(229.29, 2);
    expect(ship.ladenFastestRange).toBeCloseTo(143.17, 2);
  });

  it('calcUnladenRange only adds the fuel needed for the jump to dry mass', function() {
    const id = 'asp';
    const ship = new Ship(id, Ships[id].properties, Ships[id].slots);
    ship.buildWith(Ships[id].defaults);
    const fsd = ship.standard[2].m;
    const jumpFuel = Math.min(fsd.getMaxFuelPerJump(), ship.fuelCapacity);
    expect(ship.calcUnladenRange()).toBeCloseTo(Calc.jumpRange(ship.dryMass + jumpFuel, fsd, undefined, ship), 6);
    // A mass change is applied on top of dry mass
    expect(ship.calcUnladenRange(10)).toBeCloseTo(Calc.jumpRange(ship.dryMass + 10 + jumpFuel, fsd, undefined, ship), 6);
  });
});
