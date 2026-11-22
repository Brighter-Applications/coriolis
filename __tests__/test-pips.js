import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { AppContext } from '../src/app/AppContext';
import Pips from '../src/app/components/Pips';

// auto-bind is an ES module that jest does not transform; this does the same job for the tests
jest.mock('auto-bind', () => ({
  __esModule: true,
  default: (self) => {
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(self))) {
      if (key !== 'constructor' && typeof self[key] === 'function') {
        self[key] = self[key].bind(self);
      }
    }
    return self;
  }
}));

const context = { language: { translate: (text) => text }, sizeRatio: 1, termtip: () => {}, tooltip: () => {} };

// Clickable cells, in document order
const ENG_PIPS = 0;
const SYS_PIPS = 1;
const ENG_LABEL = 2;
const WEP_PIPS = 3;
const SYS_LABEL = 4;
const RESET = 5;
const WEP_LABEL = 6;
const MULTI_CREW_RESET = 7;

/**
 * Render Pips inside a parent that keeps the state, as OutfittingPage does
 * @param {Object} initial Initial props
 * @returns {Object} helpers
 */
function setup(initial = {}) {
  const changes = [];
  const start = { sys: 2, eng: 2, wep: 2, mcSys: 0, mcEng: 0, mcWep: 0, ...initial };
  class Parent extends React.Component {
    state = start;
    update = (sys, eng, wep, mcSys = 0, mcEng = 0, mcWep = 0) => {
      changes.push([sys, eng, wep, mcSys, mcEng, mcWep]);
      this.setState({ sys, eng, wep, mcSys, mcEng, mcWep });
    };
    render() {
      return (
        <AppContext.Provider value={context}>
          <Pips {...this.state} onChange={this.update} />
        </AppContext.Provider>
      );
    }
  }
  const { container } = render(<Parent />);
  const cells = () => container.querySelectorAll('td.clickable');
  return {
    changes,
    last: () => changes[changes.length - 1],
    click: (cell) => act(() => { fireEvent.click(cells()[cell]); }),
    rightClick: (cell) => act(() => { fireEvent.contextMenu(cells()[cell]); }),
    key: (keyCode, modifiers = { ctrlKey: true }) => act(() => { fireEvent.keyDown(document.body, { keyCode, ...modifiers }); }),
    svgsIn: (cell) => cells()[cell].querySelectorAll('svg').length
  };
}

describe('Pips', () => {
  describe('rendering', () => {
    it('shows 4 slots for each capacitor', () => {
      const pips = setup();
      for (const cell of [ENG_PIPS, SYS_PIPS, WEP_PIPS]) {
        expect(pips.svgsIn(cell)).toBe(4);
      }
    });

    it('does not call onChange just by being shown', () => {
      expect(setup().changes).toEqual([]);
    });

    it('never shows more than 4 slots, whatever the values', () => {
      const bad = [
        { mcSys: 1000 },
        { sys: 4, eng: 2, wep: 0, mcSys: 1000 }, // link from EDCD/coriolis#655, before sanitising
        { sys: 2, mcSys: 2, mcEng: 2, mcWep: 2 },
        { sys: 50, eng: 50, wep: 50 },
        { sys: 2, mcSys: -3 }
      ];
      for (const props of bad) {
        const pips = setup(props);
        for (const cell of [ENG_PIPS, SYS_PIPS, WEP_PIPS]) {
          expect(pips.svgsIn(cell)).toBeLessThanOrEqual(4);
        }
      }
    });
  });

  describe('left click', () => {
    it('adds a pip taking half from each of the others', () => {
      const pips = setup();
      pips.click(SYS_PIPS);
      expect(pips.last()).toEqual([3, 1.5, 1.5, 0, 0, 0]);
    });

    it('takes a full pip from the only other capacitor with pips', () => {
      const pips = setup({ sys: 2, eng: 4, wep: 0 });
      pips.click(SYS_LABEL);
      expect(pips.last()).toEqual([3, 3, 0, 0, 0, 0]);
    });

    it('does nothing when the capacitor already has 4 pips', () => {
      const pips = setup({ sys: 4, eng: 2, wep: 0 });
      pips.click(SYS_PIPS);
      expect(pips.last()).toEqual([4, 2, 0, 0, 0, 0]);
    });

    it('works from the pips and from the labels', () => {
      for (const [cell, expected] of [
        [SYS_PIPS, [3, 1.5, 1.5]], [SYS_LABEL, [3, 1.5, 1.5]],
        [ENG_PIPS, [1.5, 3, 1.5]], [ENG_LABEL, [1.5, 3, 1.5]],
        [WEP_PIPS, [1.5, 1.5, 3]], [WEP_LABEL, [1.5, 1.5, 3]]
      ]) {
        const pips = setup();
        pips.click(cell);
        expect(pips.last().slice(0, 3)).toEqual(expected);
      }
    });

    it('keeps the total of the main pips at 6 over many clicks', () => {
      const pips = setup();
      [SYS_PIPS, ENG_PIPS, WEP_PIPS, SYS_PIPS, SYS_PIPS, WEP_PIPS, ENG_PIPS, ENG_PIPS].forEach((cell) => {
        pips.click(cell);
        const [sys, eng, wep, mcSys, mcEng, mcWep] = pips.last();
        expect(sys + eng + wep - mcSys - mcEng - mcWep).toBe(6);
        expect(Math.max(sys, eng, wep)).toBeLessThanOrEqual(4);
      });
    });
  });

  describe('right click (multi-crew)', () => {
    it('adds a multi-crew pip, included in the total', () => {
      const pips = setup();
      pips.rightClick(SYS_PIPS);
      expect(pips.last()).toEqual([3, 2, 2, 1, 0, 0]);
    });

    it('allows 2 multi-crew pips on one capacitor, but no more', () => {
      const pips = setup();
      pips.rightClick(SYS_PIPS);
      pips.rightClick(SYS_PIPS);
      pips.rightClick(SYS_PIPS);
      expect(pips.last()).toEqual([4, 2, 2, 2, 0, 0]);
    });

    it('allows 2 multi-crew pips in total across capacitors, but no more', () => {
      const pips = setup();
      pips.rightClick(SYS_PIPS);
      pips.rightClick(ENG_PIPS);
      pips.rightClick(WEP_PIPS);
      expect(pips.last()).toEqual([3, 3, 2, 1, 1, 0]);
    });

    it('resets only the multi-crew pips with the multi-crew reset', () => {
      const pips = setup();
      pips.click(SYS_PIPS);
      pips.rightClick(ENG_PIPS);
      pips.click(MULTI_CREW_RESET);
      expect(pips.last()[3]).toBe(0);
      expect(pips.last().slice(3)).toEqual([0, 0, 0]);
      const [sys, eng, wep] = pips.last();
      expect(sys + eng + wep).toBe(6);
    });

    it('resets the main pips if there are no multi-crew pips to reset', () => {
      const pips = setup({ sys: 4, eng: 2, wep: 0 });
      pips.click(MULTI_CREW_RESET);
      expect(pips.last()).toEqual([2, 2, 2, 0, 0, 0]);
    });
  });

  describe('reset', () => {
    it('sets the main pips to 2/2/2 and keeps multi-crew pips', () => {
      const pips = setup({ sys: 4, eng: 2, wep: 2, mcSys: 2 });
      pips.click(RESET);
      expect(pips.last()).toEqual([4, 2, 2, 2, 0, 0]);
    });

    it('does nothing when the pips are already reset', () => {
      const pips = setup();
      pips.click(RESET);
      expect(pips.changes).toEqual([]);
    });
  });

  describe('keyboard', () => {
    it('increases SYS, ENG and WEP with CTRL and the left, up and right arrows', () => {
      const pips = setup();
      pips.key(37);
      expect(pips.last().slice(0, 3)).toEqual([3, 1.5, 1.5]);
      pips.key(40);
      expect(pips.last().slice(0, 3)).toEqual([2, 2, 2]);
      pips.key(38);
      expect(pips.last().slice(0, 3)).toEqual([1.5, 3, 1.5]);
      pips.key(40);
      pips.key(39);
      expect(pips.last().slice(0, 3)).toEqual([1.5, 1.5, 3]);
    });

    it('also works with the CMD key', () => {
      const pips = setup();
      pips.key(37, { metaKey: true });
      expect(pips.last().slice(0, 3)).toEqual([3, 1.5, 1.5]);
    });

    it('ignores the arrow keys without CTRL or CMD', () => {
      const pips = setup();
      pips.key(37, {});
      pips.key(38, {});
      pips.key(39, {});
      expect(pips.changes).toEqual([]);
    });
  });
});
