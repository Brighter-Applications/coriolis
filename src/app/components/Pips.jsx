import React from 'react';
import PropTypes from 'prop-types';
import TranslatedComponent from './TranslatedComponent';
import { Pip } from './SvgIcons';
import autoBind from 'auto-bind';

/**
 * Pips displays SYS/ENG/WEP pips and allows users to change them with key presses by clicking on the relevant area
 * Requires an onChange() function of the form onChange(sys, eng, wep) which is triggered whenever the pips change
 */
export default class Pips extends TranslatedComponent {
  static propTypes = {
    sys: PropTypes.number.isRequired,
    eng: PropTypes.number.isRequired,
    wep: PropTypes.number.isRequired,
    mcSys: PropTypes.number.isRequired,
    mcEng: PropTypes.number.isRequired,
    mcWep: PropTypes.number.isRequired,
    onChange: PropTypes.func.isRequired
  };

  /**
   * Constructor
   * @param  {Object} props React Component properties
   * @param  {Object} context React Component context
   */
  constructor(props, context) {
    super(props);
    autoBind(this);
  }

  /**
   * Add listeners after mounting
   */
  componentDidMount() {
    document.addEventListener('keydown', this._onKeyDown);
  }

  /**
   * Remove listeners before unmounting
   */
  componentWillUnmount() {
    document.removeEventListener('keydown', this._onKeyDown);
  }

  /**
   * Handle multi-crew pip changes
   * @private
   * @param {string} key The name of the pips to change. Valid values are 'sys', 'eng', 'wep', and 'rst'
   * @param {boolean} multiCrewPip True when a multi-crew pip is clicked, false otherwise
   * @returns {void}
   */
  _onPipClick(key, multiCrewPip) {
    return (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (key == 'rst') {
        this._resetPips(multiCrewPip);
      } else {
        this._incrementPip(key, multiCrewPip);
      }
    };
  }

  /**
   * Handle Key Down events. The arrow keys, in combination with the CTRL/CMD key change the main pips
   * @param  {Event} event Keyboard event
   */
  _onKeyDown(event) {
    if (!event.target.tagName.toLowerCase() === 'body') return; // ignore when an element other than body has the focus
    if (!event.ctrlKey && !event.metaKey) return // ignore key-down events without the CTRL/CMD modifier depressed

    switch (event.keyCode) {
      case 37:     // Left arrow == increase SYS
        event.preventDefault();
        this._incrementPip('sys', false);
        break;
      case 38:     // Up arrow == increase ENG
        event.preventDefault();
        this._incrementPip('eng', false);
        break;
      case 39:     // Right arrow == increase WEP
        event.preventDefault();
        this._incrementPip('wep', false);
        break;
      case 40:     // Down arrow == Reset
        event.preventDefault();
        this._resetPips();
        break;
    }
  }

  /**
   * Increases a given capacitor
   * @param {String} key Pip name to increase. Valid values are 'sys', 'eng', and 'wep'
   * @param {Boolean} multiCrewPip True when a multi-crew pip is clicked, false otherwise
   */
  _incrementPip(key, multiCrewPip) {
    if (!['sys', 'eng', 'wep'].includes(key)) {
      return;
    }

    let { sys, eng, wep, mcSys, mcEng, mcWep } = this.props;
    let mc = key == 'sys' ? mcSys : (key == 'eng' ? mcEng : mcWep);
    let pips = this.props[key] - mc;
    let other1 = key == 'sys' ? eng - mcEng : sys - mcSys;
    let other2 = key == 'wep' ? eng - mcEng : wep - mcWep;

    const required = Math.min(1, 4 - mc - pips);
    if (multiCrewPip) {
      // We can only set full pips in multi-crew also we can only set two pips
      if (required > 0.5 && mcSys + mcEng + mcWep < 2) {
        if (key == 'sys') {
          mcSys += 1;
        } else if (key == 'eng') {
          mcEng += 1;
        } else {
          mcWep += 1;
        }
      }
    } else if (required > 0) {
      if (required == 0.5) {
        // Take from whichever is larger
        if (other1 > other2) {
          other1 -= 0.5;
        } else {
          other2 -= 0.5;
        }
        pips += 0.5;
      } else {
        // Required is 1 - take from both if possible
        if (other1 == 0) {
          other2 -= 1;
        } else if (other2 == 0) {
          other1 -= 1;
        } else {
          other1 -= 0.5;
          other2 -= 0.5;
        }
        pips += 1;
      }
    }

    sys = mcSys + (key == 'sys' ? pips : other1);
    eng = mcEng + (key == 'eng' ? pips : (key == 'sys' ? other1 : other2));
    wep = mcWep + (key == 'wep' ? pips : other2);
    this.props.onChange(sys, eng, wep, mcSys, mcEng, mcWep);
  }

  /**
   * Reset the capacitor
   * @param multiCrewPip True when resetting the multi-crew pips, false otherwise
   * @private
   */
  _resetPips(multiCrewPip) {
    let { sys, eng, wep, mcSys, mcEng, mcWep } = this.props;

    if (multiCrewPip && (mcSys || mcEng || mcWep)) { // If there are no multi-crew pips to reset, reset default pips instead
      sys -= mcSys;
      eng -= mcEng;
      wep -= mcWep;
      this.props.onChange(sys, eng, wep, 0, 0, 0);
    } else if (sys != 2 || eng != 2 || wep != 2) { // reset the default pips, if needed
      sys = eng = wep = 2;
      this.props.onChange(sys + mcSys, eng + mcEng, wep + mcWep, mcSys, mcEng, mcWep);
    }
  }

  /**
   * Set up the rendering for pips
   * @param   {Number} sys the SYS pips
   * @param   {Number} eng the ENG pips
   * @param   {Number} wep the WEP pips
   * @param   {Number} mcSys SYS pips from multi-crew
   * @param   {Number} mcEng ENG pips from multi-crew
   * @param   {Number} mcWep WEP pips from multi-crew
   * @returns {Object} Object containing the rendering for the pips
   */
  _renderPips(sys, eng, wep, mcSys, mcEng, mcWep) {
    const pipsSvg = {
      SYS: [],
      ENG: [],
      WEP: [],
    };

    // Multi-crew pipsSettings actually are included in the overall pip count therefore
    // we can consider [0, sys - mcSys] as normal pipsSettings whilst [sys - mcSys, sys]
    // are the multi-crew pipsSettings in what follows.

    let pipsSettings = {
      SYS: [sys, mcSys],
      ENG: [eng, mcEng],
      WEP: [wep, mcWep],
    };

    for (let pipName in pipsSettings) {
      let [pips, mcPips] = pipsSettings[pipName];
      for (let i = 0; i < Math.floor(pips - mcPips); i++) {
        pipsSvg[pipName].push(<Pip key={i} className='full' />);
      }
      if (pips > Math.floor(pips)) {
        pipsSvg[pipName].push(<Pip className='half' key={'half'} />);
      }
      for (let i = pips - mcPips; i < Math.floor(pips); i++) {
        pipsSvg[pipName].push(<Pip key={i} className='mc' />);
      }
      for (let i = Math.floor(pips + 0.5); i < 4; i++) {
        pipsSvg[pipName].push(<Pip className='empty' key={i} />);
      }
    }

    return pipsSvg;
  }

  /**
   * Render pips component
   * @return {React.Component} contents
   */
  render() {
    const { tooltip, termtip } = this.context;
    const { formats, translate, units } = this.context.language;
    const { sys, eng, wep, mcSys, mcEng, mcWep } = this.props;

    const pipsSvg = this._renderPips(sys, eng, wep, mcSys, mcEng, mcWep);
    return (
      <span id='pips'>
        <table>
          <tbody>
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td className='clickable' onClick={this._onPipClick('eng', false)}
                onContextMenu={this._onPipClick('eng', true)}>{pipsSvg['ENG']}</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td className='clickable' onClick={this._onPipClick('sys', false)}
                onContextMenu={this._onPipClick('sys', true)}>{pipsSvg['SYS']}</td>
              <td className='clickable' onClick={this._onPipClick('eng', false)}
                onContextMenu={this._onPipClick('eng', true)}>{translate('ENG')}</td>
              <td className='clickable' onClick={this._onPipClick('wep', false)}
                onContextMenu={this._onPipClick('wep', true)}>{pipsSvg['WEP']}</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td className='clickable' onClick={this._onPipClick('sys', false)}
                onContextMenu={this._onPipClick('sys', true)}>{translate('SYS')}</td>
              <td className='clickable' onClick={this._onPipClick('rst', false)}>
                {translate('RST')}
              </td>
              <td className='clickable' onClick={this._onPipClick('wep', false)}
                onContextMenu={this._onPipClick('wep', true)}>{translate('WEP')}</td>
            </tr>
            <tr>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td className='clickable secondary' onClick={this._onPipClick('rst', true)}
                onMouseEnter={termtip.bind(null, 'PHRASE_MULTI_CREW_CAPACITOR_POINTS')}
                onMouseLeave={tooltip.bind(null, null)}>
                {translate('RST')}
              </td>
              <td>&nbsp;</td>
            </tr>
          </tbody>
        </table>
      </span>
    );
  }
}
