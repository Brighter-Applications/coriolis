import React from 'react';
import * as EN from './en';
import * as DE from './de';
import * as ES from './es';
import * as FR from './fr';
import * as IT from './it';
import * as RU from './ru';
import * as PL from './pl';
import * as PT from './pt';
import * as CN from './cn';
import * as KO from './ko';
import * as KA from './geo';
import * as d3 from 'd3';

/**
 * Get the units, translation and format functions for the specified language
 * @param  {string} langCode ISO Language code
 * @return {Object}          Language units, translation and format functions
 */
export function getLanguage(langCode) {
  let lang, translate;

  switch (langCode) {
    case 'de': lang = DE; break;
    case 'es': lang = ES; break;
    case 'fr': lang = FR; break;
    case 'it': lang = IT; break;
    case 'ru': lang = RU; break;
    case 'pl': lang = PL; break;
    case 'pt': lang = PT; break;
    case 'cn': lang = CN; break;
    case 'ko': lang = KO; break;
    case 'ka': lang = KA; break;
    default:
      lang = EN;
  }

  const currentTerms = lang.terms;
  const fallbackTerms = EN.terms;
  const d3Locale = d3.formatLocale(lang.formats);
  const gen = d3Locale.format('');

  /**
   * Round a number to a give number of decimal places
   * @param {number} number
   * @param {number} decimals
   * @returns {number}
   */
  const round = (number, decimals) => {
    const ten_decimals = Math.pow(10, decimals);
    return Math.round(number * ten_decimals) / ten_decimals;
  };

  /**
   * Replace {0}, {1}, .. {n} placeholders in a string with the given value identified by their index in values
   * @param {string} string the string to interpolate values in
   * @param {array} values the indexed array with values to interpolate into string
   * @returns {string}
   */
  const indexedReplace = (string, values) => {
    if (!Array.isArray(values)) return string;

    for (let i = 0; i < values.length; i++) {
      string = string.replace('{' + i + '}', values[i]);
    }
    return string;
  };

  /**
   * Localize (translate) a string
   * @param {string} term The term to be localized
   * @param {string} subTerm The sub-term to be localized
   * @param {array} indexedValues An indexed array of values to interpolate into the localized string for the given term at the indicated placeholder
   * @return {string} the localized term
   */
  translate = (term, subTerm, indexedValues) => {
    const translated = currentTerms[term + '_' + subTerm] || currentTerms[term] || fallbackTerms[term + '_' + subTerm] || fallbackTerms[term] || term;

    if (indexedValues) {
      return indexedReplace(translated, indexedValues);
    }
    return translated;
  };

  return {
    formats: {
      gen,                              // General number format (.e.g 1,001,001.1234)
      int: d3Locale.format(',.0f'),     // Fixed to 0 decimal places (.e.g 1,001)
      f1: d3Locale.format(',.1f'),      // Fixed to 1 decimal place (.e.g 1,001.1)
      f2: d3Locale.format(',.2f'),      // Fixed to 2 decimal places (.e.g 1,001.10)
      s2: d3Locale.format('.2s'),       // SI Format to 2 decimal places (.e.g 1.1k)
      pct: d3Locale.format('.2%'),      // % to 2 decimal places (.e.g 5.40%)
      pct1: d3Locale.format('.1%'),     // % to 1 decimal places (.e.g 5.4%)
      r1: d3Locale.format('.1r'),       // Rounded to 1 significant number (.e.g 512 => 500, 4.122 => 4)
      r2: d3Locale.format('.2r'),       // Rounded to 2 significant numbers (.e.g 512 => 510, 4.122 => 4.1)
      rPct: d3Locale.format('.0%'),                   // % to 0 decimal places (.e.g 5%)
      round1: (d) => gen(round(d, 1)),  // Round to 0-1 decimal places (e.g. 5.1, 4)
      round: (d) => gen(round(d, 2)),      // Rounded to 0-2 decimal places (.e.g 5.12, 4.1)
      time: (d) => (d < 0 ? '-' : '') + Math.floor(Math.abs(d) / 60) + ':' + ('00' + Math.floor(Math.abs(d) % 60)).substr(-2, 2)
    },
    translate,
    units: {
      ang: '°',                         // Degrees (Angle)
      CR: <u>{translate('CR')}</u>,     // Credits
      MC: <u>{translate('MC')}</u>,     // Merc Coin
      kg: <u>{translate('kg')}</u>,     // Kilograms
      kgs: <u>{translate('kg/s')}</u>,  // Kilograms per second
      km: <u>{translate('km')}</u>,     // Kilometers
      Ls: <u>{translate('Ls')}</u>,     // Light Seconds
      LY: <u>{translate('LY')}</u>,     // Light Years
      m: <u>{translate('m')}</u>,       // Meters
      MJ: <u>{translate('MJ')}</u>,     // Mega Joules
      'm/s': <u>{translate('m/s')}</u>, // Meters per second
      '°/s': <u>{translate('°/s')}</u>, // Degrees per second
      MW: <u>{translate('MW')}</u>,     // Mega Watts (same as Mega Joules per second)
      mps: <u>{translate('m/s')}</u>,   // Metres per second
      pct: '%',                         // Percent
      ps: <u>{translate('/s')}</u>,     // per second
      pm: <u>{translate('/min')}</u>,   // per minute
      s: <u>{translate('secs')}</u>,    // Seconds
      T: <u>{translate('T')}</u>,       // Metric Tons
    }
  };
}

/**
 * The list of available languages
 * @type {Object}
 */
export const Languages = {
  en: 'English',
  de: 'Deutsch',
  it: 'Italiano',
  es: 'Español',
  fr: 'Français',
  ru: 'ру́сский',
  pl: 'polski',
  pt: 'português',
  cn: '中文',
  ko: '한국어',
  ka: 'ქართული'
};
