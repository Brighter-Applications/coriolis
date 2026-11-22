import LZString from 'lz-string';
import {
  buildControlString,
  escapeBuildName,
  sanitisePips,
  splitControlString,
  unescapeBuildName
} from '../src/app/utils/ControlCode';
import { fromUrlSafe } from '../src/app/utils/UtilityFunctions';

// The link from https://github.com/EDCD/coriolis/issues/655. The control code is its 5th part.
// Its opponent build name contains a '/', which used to shift the fields and put the
// engagement range (1000) into the SYS multi-crew pips.
const ISSUE_655_CODE =
  'A0pntsFklndssif61c7j7j--04070203070706054a320302023x3w.AwRj4yqo.MwBjIRjAmbykdxgcYQ%3D%3D.' +
  'H4sIAAAAAAAAAzVOvQ4BYRAczv%2Fhchc%2FFxVylKJWiI5C1EqFTqtQeAQPIOEBlEoPovQAKrUIu2bFbTGZ75vZnYFkAXwSBHdHKJ1TgL8hC%2B4OEC3JNCFDMyUJudNH1ZvWgdqc76BJkzrSMD1N8KKXanBxgcq2CoQ3fmpaBnFIfs28wigDtK6i2jboGHSPysnIInZ64ZuX%2Bk%2FVXpG6lmQcl3gfrO6D1LM6vrHwV9eYlmUSO90pN32DaG9NqzIzybEjKwtpsKm%2FYFJUKFJX%2FOcLyAcAphgBAAA%3D.' +
  'CwegTCAMUgbKB2MAOEBDANhglmgdgMYCmA%2BgQBbZEBmALmtniAAoCu11ABACrlGcBZNAHNsBTgBEATiID2eTgHcQAcQDMAMmCdyrLCACMkYzGiQgA%3D%3D%3D';

// Decompress the control code the way OutfittingPage does (the router has already URL decoded the code)
const decompressControl = (code) =>
  LZString.decompressFromBase64(fromUrlSafe(decodeURIComponent(code).split('.')[4]));

describe('control code', () => {
  describe('build names', () => {
    it('escapes and restores slashes and percent signs', () => {
      for (const name of ['plain', 'a/b', '100% hull', 'a%2Fb', '//', '%', '']) {
        const escaped = escapeBuildName(name);
        expect(escaped).not.toContain('/');
        expect(unescapeBuildName(escaped)).toBe(name);
      }
    });

    it('leaves names written before escaping was introduced alone', () => {
      expect(unescapeBuildName('Puff The Magic Dragon')).toBe('Puff The Magic Dragon');
    });
  });

  describe('buildControlString / splitControlString', () => {
    const control = {
      sys: 4, eng: 2, wep: 2, boost: true, fuel: 32, cargo: 100, opponentId: 'eagle',
      opponentBuild: 'My/Build', engagementRange: 1500, mcSys: 2, mcEng: 0, mcWep: 0
    };

    it('writes 12 fields even when the opponent build name has a slash', () => {
      expect(buildControlString(control).split('/')).toHaveLength(12);
    });

    it('round trips every field', () => {
      expect(splitControlString(buildControlString(control))).toEqual(
        ['4', '2', '2', '1', '32', '100', 'eagle', 'My/Build', '1500', '2', '0', '0']
      );
    });

    it('writes an empty name when there is no opponent build', () => {
      expect(buildControlString({ ...control, opponentBuild: undefined }).split('/')[7]).toBe('');
    });

    it('reads unescaped slashes in names from older links', () => {
      const fields = splitControlString('4/2/0/0/64/728/alliance_chieftain/Some w/G3&4 hull/1000/0/0/0');
      expect(fields).toHaveLength(12);
      expect(fields[7]).toBe('Some w/G3&4 hull');
      expect(fields.slice(8)).toEqual(['1000', '0', '0', '0']);
    });

    it('reads several unescaped slashes in names', () => {
      const fields = splitControlString('2/2/2/0/8/0/eagle/a/b/c/d/1000/1/0/1');
      expect(fields[7]).toBe('a/b/c/d');
      expect(fields.slice(8)).toEqual(['1000', '1', '0', '1']);
    });

    it('reads codes from before multi-crew pips existed', () => {
      expect(splitControlString('2/2/2/0/8/0/eagle//1000')).toHaveLength(9);
    });

    it('copes with missing or empty input', () => {
      expect(() => splitControlString(null)).not.toThrow();
      expect(() => splitControlString('')).not.toThrow();
    });
  });

  describe('link from issue 655', () => {
    const control = splitControlString(decompressControl(ISSUE_655_CODE));

    it('has the opponent build name, range and multi-crew pips in the right place', () => {
      expect(control).toHaveLength(12);
      expect(control.slice(0, 3)).toEqual(['4', '2', '0']);
      expect(control[6]).toBe('alliance_chieftain');
      expect(control[7]).toBe('Puff The Magic Dragon w/G3&4 hull');
      expect(control.slice(8)).toEqual(['1000', '0', '0', '0']);
    });

    it('gave 1000 multi-crew SYS pips when split on every slash', () => {
      expect(parseInt(decompressControl(ISSUE_655_CODE).split('/')[9])).toBe(1000);
    });

    it('ends up with sensible pips once sanitised', () => {
      const [sys, eng, wep, , , , , , , mcSys, mcEng, mcWep] = control.map(Number);
      expect(sanitisePips({ sys, eng, wep, mcSys, mcEng, mcWep })).toEqual({
        sys: 4, eng: 2, wep: 0, mcSys: 0, mcEng: 0, mcWep: 0
      });
    });
  });

  describe('sanitisePips', () => {
    const pips = (sys, eng, wep, mcSys = 0, mcEng = 0, mcWep = 0) => ({ sys, eng, wep, mcSys, mcEng, mcWep });

    it('keeps valid values', () => {
      expect(sanitisePips(pips(2, 2, 2))).toEqual(pips(2, 2, 2));
      expect(sanitisePips(pips(4, 1.5, 0.5))).toEqual(pips(4, 1.5, 0.5));
      expect(sanitisePips(pips(4, 2, 2, 2, 0, 0))).toEqual(pips(4, 2, 2, 2, 0, 0));
      expect(sanitisePips(pips(3, 3, 2, 1, 1, 0))).toEqual(pips(3, 3, 2, 1, 1, 0));
    });

    it('keeps 6 main pips plus 2 multi-crew pips (total of 8) when reloading', () => {
      expect(sanitisePips(pips(4, 2, 2, 2, 0, 0))).toEqual(pips(4, 2, 2, 2, 0, 0));
      expect(sanitisePips(pips(3, 3, 2, 1, 1, 0))).toEqual(pips(3, 3, 2, 1, 1, 0));
    });

    it('does not keep multi-crew pips on top of reset main pips', () => {
      // Main pips of 4+3+2-2 = 7 are impossible, so reset main pips to 2/2/2 and keep multi-crew pips
      expect(sanitisePips(pips(4, 3, 2, 2, 0, 0))).toEqual(pips(4, 2, 2, 2, 0, 0));
    });

    it('resets the main pips when they add up to more than 6', () => {
      expect(sanitisePips(pips(4, 4, 4))).toEqual(pips(2, 2, 2));
    });

    it('resets a total over 4 for one capacitor', () => {
      expect(sanitisePips(pips(5, 1, 0))).toEqual(pips(2, 2, 2));
    });

    it('clamps multi-crew pips to 2 per capacitor and 2 in total', () => {
      expect(sanitisePips(pips(4, 2, 2, 1000, 0, 0))).toEqual(pips(4, 2, 2, 2, 0, 0));
      expect(sanitisePips(pips(2, 2, 2, 2, 2, 2))).toEqual(pips(2, 2, 2));
      expect(sanitisePips(pips(3, 3, 2, 2, 1, 0))).toEqual(pips(2, 2, 2));
      expect(sanitisePips(pips(2, 2, 2, -3, 0, 0))).toEqual(pips(2, 2, 2));
    });

    it('drops multi-crew pips that are larger than the capacitor total', () => {
      expect(sanitisePips(pips(1, 2, 2, 2, 0, 0))).toEqual(pips(4, 2, 2, 2, 0, 0));
    });

    it('treats NaN, undefined and strings as not set', () => {
      expect(sanitisePips(pips(NaN, 2, 2))).toEqual(pips(2, 2, 2));
      expect(sanitisePips({})).toEqual(pips(2, 2, 2));
      expect(sanitisePips(pips(2, 2, 2, NaN, undefined, 'x'))).toEqual(pips(2, 2, 2));
    });

    it('fixes the values from the link in issue 655', () => {
      // Old parsing of that link gave 4/2/0 with 1000 multi-crew SYS pips
      expect(sanitisePips(pips(4, 2, 0, 1000, 0, 0))).toEqual(pips(4, 2, 0, 2, 0, 0));
    });

    it('always returns values that are consistent', () => {
      const values = [NaN, undefined, -1, 0, 0.5, 1, 2, 3, 4, 5, 6, 1000];
      for (const sys of values) for (const eng of values) for (const mcSys of values) for (const mcEng of values) {
        const out = sanitisePips(pips(sys, eng, 2, mcSys, mcEng, 0));
        const mc = out.mcSys + out.mcEng + out.mcWep;
        expect(mc).toBeLessThanOrEqual(2);
        for (const [total, multiCrew] of [[out.sys, out.mcSys], [out.eng, out.mcEng], [out.wep, out.mcWep]]) {
          expect(Number.isFinite(total)).toBe(true);
          expect(total).toBeLessThanOrEqual(4);
          expect(total - multiCrew).toBeGreaterThanOrEqual(0);
        }
        expect(out.sys + out.eng + out.wep - mc).toBeLessThanOrEqual(6);
      }
    });
  });
});
