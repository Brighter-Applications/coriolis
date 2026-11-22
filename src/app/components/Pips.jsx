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
   * @param {string} name The name of the pips to change. Valid values are 'sys', 'eng', 'wep', and 'rst'
   * @param {boolean} multiCrewPip True when a multi-crew pip is clicked, false otherwise
   * @returns {void}
   */
  _onPipClick(name, multiCrewPip) {
    return (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (name == 'rst') {
        this._resetPips(multiCrewPip);
      } else {
        this._incrementPipValue(name, multiCrewPip);
      }
    };
  }

  /**
   * Handle Key Down events. The arrow keys, in combination with the CTRL/CMD key change the main pips
   * @param  {Event} event Keyboard event
   */
  _onKeyDown(event) {
    if (!event.ctrlKey && !event.metaKey) return; // ignore key-down events without the CTRL/CMD modifier depressed

    switch (event.keyCode) {
      case 37:     // Left arrow == increase SYS
        event.preventDefault();
        this._incrementPipValue('sys', false);
        break;
      case 38:     // Up arrow == increase ENG
        event.preventDefault();
        this._incrementPipValue('eng', false);
        break;
      case 39:     // Right arrow == increase WEP
        event.preventDefault();
        this._incrementPipValue('wep', false);
        break;
      case 40:     // Down arrow == Reset
        event.preventDefault();
        this._resetPips();
        break;
    }
  }

  /**
   * Increases a given capacitor.
   * @param {'sys'|'eng'|'wep'} name Pip name to increase.
   * @param {boolean} multiCrewPip True when a multi-crew pip is clicked.
   */
  _incrementPipValue(name, multiCrewPip) {
    const pips = ['sys', 'eng', 'wep'];
    if (!pips.includes(name)) {
      return;
    }

    const pipTotals = {
      sys: this.props.sys,
      eng: this.props.eng,
      wep: this.props.wep,
    };
    const multiCrewPips = {
      sys: this.props.mcSys,
      eng: this.props.mcEng,
      wep: this.props.mcWep,
    };

    // Main pips are the total pips minus the multi-crew pips
    const mainPips = {};
    pips.forEach((pip) => {
      mainPips[pip] = pipTotals[pip] - multiCrewPips[pip];
    });

    const neededForMaxPips = 4 - multiCrewPips[name] - mainPips[name]; // the pips needed to reach 4 pips
    const pipChangeValue = Math.min(neededForMaxPips, 1); // Pips still needed to reach the maximum of 4

    let newMultiCrew = multiCrewPips;
    let newMain = mainPips;
    if (multiCrewPip) {
      newMultiCrew = this._getMultiCrewPips(name, multiCrewPips, pipChangeValue);
    } else if (pipChangeValue > 0) {
      newMain = this._getMainPips(name, mainPips, pipChangeValue);
    }

    this.props.onChange(
      newMain.sys + newMultiCrew.sys,
      newMain.eng + newMultiCrew.eng,
      newMain.wep + newMultiCrew.wep,
      newMultiCrew.sys,
      newMultiCrew.eng,
      newMultiCrew.wep,
    );
  }

  /**
   * Gets the updated values for the multi-crew pips.
   * @param {String} name Pip name to increase
   * @param {{sys: Number, eng: Number, wep: Number}} multiCrew Current multi-crew pip values
   * @param {Number} pipChangeValue Amount of pip change available
   * @returns {{sys: Number, eng: Number, wep: Number}} Updated multi-crew pip values
   */
  _getMultiCrewPips(name, multiCrew, pipChangeValue) {
    if (pipChangeValue < 1 || multiCrew.sys + multiCrew.eng + multiCrew.wep === 2) { // In multi-crew, only full pips can be set, and only up to two pips in total
      return multiCrew;
    }

    const updatedMultiCrew = {
      sys: multiCrew.sys,
      eng: multiCrew.eng,
      wep: multiCrew.wep,
    };
    updatedMultiCrew[name] += 1;

    return updatedMultiCrew;
  }

  /**
   * Gets the updated values for the main pips
   * @param {String} name Pip name to increase
   * @param {{sys: Number, eng: Number, wep: Number}} mainPips Current main pip values
   * @param {Number} pipChangeValue Amount of pip change to apply (0.5 or 1)
   * @returns {{sys: Number, eng: Number, wep: Number}} Updated main pip values
   */
  _getMainPips(name, mainPips, pipChangeValue) {
    const otherPips = {
      sys: ['eng', 'wep'],
      eng: ['sys', 'wep'],
      wep: ['sys', 'eng'],
    };
    const [other1, other2] = otherPips[name];

    const changedPips = {
      sys: mainPips.sys,
      eng: mainPips.eng,
      wep: mainPips.wep,
    };

    // Compared to ED, we use a simplified method, where we always take either 1 or 0.5 pips.
    if (pipChangeValue === 0.5) {
      // Take from whichever of the other pips is larger (ties go to the second one)
      if (mainPips[other1] > mainPips[other2]) {
        changedPips[other1] -= 0.5;
      } else {
        changedPips[other2] -= 0.5;
      }
      changedPips[name] += 0.5;
    } else {
      // A full pip is required: take from both if possible, otherwise from the one with pips
      if (mainPips[other1] === 0) {
        changedPips[other2] -= 1;
      } else if (mainPips[other2] === 0) {
        changedPips[other1] -= 1;
      } else {
        changedPips[other1] -= 0.5;
        changedPips[other2] -= 0.5;
      }
      changedPips[name] += 1;
    }

    return changedPips;
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
   * Set up the rendering for pips.
   * @param {number} sys the main sys pips
   * @param {number} eng the main eng pips
   * @param {number} wep the main wep pips
   * @param {number} mcSys the multi-crew sys pips
   * @param {number} mcEng the multi-crew eng pips
   * @param {number} mcWep the multi-crew wep pips
   * @returns {Object} Object containing the rendering for the pips
   */
  _renderPips(sys, eng, wep, mcSys, mcEng, mcWep) {
    const pipsSvg = {
      SYS: [],
      ENG: [],
      WEP: [],
    };

    const pipValues = {
      SYS: [sys, mcSys],
      ENG: [eng, mcEng],
      WEP: [wep, mcWep],
    };

    for (const pipName in pipValues) {
      const [totalPips, multiCrewPips] = pipValues[pipName];
      const mainPips = totalPips - multiCrewPips;

      // Render full main pips
      for (let index = 0; index < Math.floor(mainPips) && index < 4; index++) {
        pipsSvg[pipName].push(<Pip className="full" key={`full-${index}`} />);
      }

      // Render a half pip when the main pips have a fractional value
      if (mainPips > Math.floor(mainPips)) {
        pipsSvg[pipName].push(<Pip className="half" key="half" />);
      }

      // Render the multi-crew pips
      for (let index = Math.max(mainPips, 0); index < Math.floor(totalPips) && index < 4; index++) {
        pipsSvg[pipName].push(<Pip className="mc" key={`mc-${index}`} />);
      }

      // Fill any remaining slots with empty pips, so there are never more than 4 slots
      for (let index = pipsSvg[pipName].length; index < 4; index++) {
        pipsSvg[pipName].push(<Pip className="empty" key={`empty-${index}`} />);
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
