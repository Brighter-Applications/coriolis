import React from 'react';
import PropTypes from 'prop-types';
import TranslatedComponent from './TranslatedComponent';
import request from 'superagent';
import Persist from '../stores/Persist';
import { fetchBuilds, fetchMaterials, fetchShips } from '../utils/CmdrApi';
const zlib = require('zlib');
const base64url = require('base64url');

/**
 * Material display name → category lookup.
 * Used to group shopping list materials into Raw / Manufactured / Encoded.
 */
const RAW_MATS = new Set([
  'Antimony', 'Arsenic', 'Boron', 'Cadmium', 'Carbon', 'Chromium', 'Germanium',
  'Iron', 'Lead', 'Manganese', 'Mercury', 'Molybdenum', 'Nickel', 'Niobium',
  'Phosphorus', 'Polonium', 'Rhenium', 'Ruthenium', 'Selenium', 'Sulphur',
  'Technetium', 'Tellurium', 'Tin', 'Tungsten', 'Vanadium', 'Yttrium', 'Zinc',
  'Zirconium',
]);

const ENCODED_MATS = new Set([
  'Aberrant Shield Pattern Analysis', 'Abnormal Compact Emissions Data',
  'Adaptive Encryptors Capture', 'Adaptive Encyptors Capture',
  'Anomalous Bulk Scan Data', 'Anomalous FSD Telemetry',
  'Atypical Disrupted Wake Echoes', 'Atypical Encryption Archives',
  'Classified Scan Databanks', 'Classified Scan Fragment',
  'Cracked Industrial Firmware', 'Datamined Wake Exceptions',
  'Decoded Emission Data', 'Distorted Shield Cycle Recordings',
  'Divergent Scan Data', 'Eccentric Hyperspace Trajectories',
  'Exceptional Scrambled Emission Data', 'Guardian Module Blueprint Segment',
  'Guardian Vessel Blueprint Segment', 'Guardian Weapon Blueprint Segment',
  'Inconsistent Shield Soak Analysis', 'Irregular Emission Data',
  'Modified Consumer Firmware', 'Modified Embedded Firmware',
  'Open Symmetric Keys', 'Peculiar Shield Frequency Data',
  'Security Firmware Patch', 'Specialised Legacy Firmware',
  'Strange Wake Solutions', 'Tagged Encryption Codes',
  'Unexpected Emission Data', 'Unidentified Scan Archives',
  'Untypical Shield Scans', 'Unusual Encrypted Files',
]);

function matCategory(name) {
  if (RAW_MATS.has(name)) return 'raw';
  if (ENCODED_MATS.has(name)) return 'encoded';
  return 'manufactured';
}

const TRUNCATE_LIMIT = 10;

/**
 * Permalink modal
 */
export default class ModalShoppingList extends TranslatedComponent {

  static propTypes = {
    ship: PropTypes.object.isRequired,
    buildName: PropTypes.string
  };

  /**
   * Constructor
   * @param  {Object} props   React Component properties
   */
  constructor(props) {
    super(props);
    this.state = {
      matsList: '',
      matsRaw: [],
      matsMfg: [],
      matsEnc: [],
      mats: {},
      failed: false,
      cmdrName: Persist.getCmdr().selected,
      cmdrs: Persist.getCmdr().cmdrs,
      matsPerGrade: Persist.getRolls(),
      blueprints: [],
      cmdrLinked: false,
      buildLinked: false,
      remainingRaw: [],
      remainingMfg: [],
      remainingEnc: [],
      expandedRaw: false,
      expandedMfg: false,
      expandedEnc: false,
    };
  }

  /**
   * React component did mount
   */
  componentDidMount() {
    this.renderMats();
    if (this.checkBrowserIsCompatible()) {
      this.getCommanders();
      this.registerBPs();
    }
    this._checkCmdrLink();
  }

  /**
   * Check if user has a linked CMDR and if the current build is linked to a ship.
   * If so, fetch materials and compute remaining mats.
   */
  _checkCmdrLink() {
    const link = Persist.getActiveCmdrLink();
    console.log('[Shopping List] CMDR link:', link);
    if (!link) {
      console.log('[Shopping List] No CMDR link found - user not logged in to CMDR Coriolis');
      return;
    }

    this.setState({ cmdrLinked: true });

    Promise.all([
      fetchBuilds(link),
      fetchMaterials(link),
      fetchShips(link),
    ]).then(([buildsResp, matsResp, shipsResp]) => {
      const builds = buildsResp.builds || [];
      const shipId = this.props.ship.id;
      const buildName = this.props.buildName;

      // Find a build matching this ship type + name that is linked to a ship
      const linkedBuild = builds.find(
        b => b.shipType === shipId && b.buildName === buildName && b.linkedShip
      );

      console.log('[Shopping List] All builds:', builds.map(b => ({ shipType: b.shipType, buildName: b.buildName, linkedShip: b.linkedShip })));
      console.log('[Shopping List] Looking for:', { shipId, buildName });
      console.log('[Shopping List] Found build:', linkedBuild);

      if (!linkedBuild) {
        console.log('[Shopping List] No linked build found');
        return;
      }

      this.setState({ buildLinked: true });

      // Build material inventory lookup: { lowerName: count }
      const inventory = {};
      const materials = matsResp.materials || {};
      for (const category of ['raw', 'manufactured', 'encoded']) {
        const catMats = materials[category] || {};
        for (const name in catMats) {
          // Normalize: lowercase and remove spaces to match lookup format
          inventory[name.toLowerCase().replace(/ /g, '')] = catMats[name];
        }
      }

      // Find the linked ship's loadout
      const ships = shipsResp.ships || [];
      const linkedShipId = linkedBuild.linkedShip?.id || linkedBuild.linkedShip;
      const linkedShip = ships.find(s => s.id === linkedShipId);

      // Compute remaining mats, comparing with the ship's current loadout
      this._computeRemaining(inventory, linkedShip);
    }).catch(err => {
      console.warn('CMDR link check failed:', err);
    });
  }

  /**
   * Check if two modules have identical engineering states.
   * @param {Object} targetModule  Module from Coriolis build
   * @param {Object} currentModule Module from CMDR ship loadout slot
   * @return {boolean} True if engineering is identical
   */
  _modulesMatch(targetModule, currentModule) {
    if (!targetModule || !currentModule) return false;

    const targetBlueprint = targetModule.blueprint;

    // Handle both Companion API format (engineer/recipeName) and EDMC format (engineering/blueprintName)
    const currentEngineering = currentModule.engineering || currentModule.engineer;
    const currentSpecial = currentModule.specialModifications;

    // If target has no engineering, match only if current has no engineering
    if (!targetBlueprint || !targetBlueprint.grade) {
      return !currentEngineering;
    }

    // If target has engineering but current doesn't, no match
    if (!currentEngineering) return false;

    // Get blueprint name from either format
    const currentBlueprintName = currentEngineering.blueprintName || currentEngineering.recipeName;
    const currentGrade = currentEngineering.level || currentEngineering.recipeLevel;

    // Compare blueprint fdname and grade
    if (targetBlueprint.fdname !== currentBlueprintName) return false;
    if (targetBlueprint.grade !== currentGrade) return false;

    // Compare special effects
    const targetSpecial = targetBlueprint.special ? targetBlueprint.special.edname : null;

    // Handle both EDMC format (experimentalEffect string) and Companion format (specialModifications object)
    let currentSpecialName = null;
    if (currentEngineering.experimentalEffect) {
      currentSpecialName = currentEngineering.experimentalEffect;
    } else if (currentSpecial && currentSpecial.length > 0) {
      currentSpecialName = Object.keys(currentSpecial[0])[0];
    }

    if (targetSpecial !== currentSpecialName) return false;

    return true;
  }

  /**
   * Compute materials needed by comparing target build with current ship loadout.
   * @param {Object} inventory    { lowerName: count } Material inventory
   * @param {Object} linkedShip   Ship data from CMDR API (optional)
   */
  _computeRemaining(inventory, linkedShip) {
    // Calculate materials needed only for modules that differ from the current ship
    const matsNeeded = this._calculateMaterialsForDifferences(linkedShip);

    let raw = [], mfc = [], enc = [];
    for (const name in matsNeeded) {
      if (!matsNeeded.hasOwnProperty(name)) continue;
      const needed = matsNeeded[name];
      // Normalize display name to match fdname format (lowercase, no spaces)
      const key = name.toLowerCase().replace(/ /g, '');
      const have = inventory[key] || 0;
      const diff = needed - have;
      if (diff > 0) {
        const entry = { name, count: diff, need: needed, have };
        const cat = matCategory(name);
        if (cat === 'raw') raw.push(entry);
        else if (cat === 'encoded') enc.push(entry);
        else mfc.push(entry);
      }
    }
    this.setState({ remainingRaw: raw, remainingMfg: mfc, remainingEnc: enc });
  }

  /**
   * Calculate materials needed only for modules that differ between target and current ship.
   * @param {Object} linkedShip  Ship data from CMDR API (optional)
   * @return {Object} Materials needed { materialName: count }
   */
  _calculateMaterialsForDifferences(linkedShip) {
    const ship = this.props.ship;
    let mats = {};

    // If no linked ship, calculate all materials (original behavior)
    if (!linkedShip || !linkedShip.loadout) {
      console.log('[Shopping List] No linked ship or loadout, using all materials');
      return this.state.mats;
    }

    // Build a lookup of current modules by their FD name (symbol)
    // Store as arrays to handle duplicate modules (multiple of the same type)
    const currentModules = {};
    const loadout = linkedShip.loadout;

    // Handle both array format (EDMC) and object format (Companion API)
    if (Array.isArray(loadout)) {
      // EDMC format: array of {slot, item, engineering, ...}
      for (const slotData of loadout) {
        if (slotData && slotData.item) {
          const fdName = slotData.item.toLowerCase();
          if (!currentModules[fdName]) {
            currentModules[fdName] = [];
          }
          currentModules[fdName].push(slotData);
        }
      }
    } else {
      // Companion API format: {slotName: {module: {name, ...}}}
      for (const slotName in loadout) {
        const slot = loadout[slotName];
        if (slot && slot.module) {
          const fdName = slot.module.name.toLowerCase();
          if (!currentModules[fdName]) {
            currentModules[fdName] = [];
          }
          currentModules[fdName].push(slot);
        }
      }
    }

    // Track which current modules have been matched (to handle duplicates)
    const matchedIndices = {};

    // Iterate through target build modules and compare
    let matchCount = 0;
    let differCount = 0;
    for (const module of ship.costList) {
      if (module.type === 'SHIP') continue;
      if (!module.m || !module.m.blueprint) continue;
      if (!module.m.blueprint.grade || !module.m.blueprint.grades) continue;

      // Find corresponding current module(s)
      const fdName = module.m.symbol ? module.m.symbol.toLowerCase() : null;
      const currentSlots = fdName ? currentModules[fdName] : null;

      // Find the current state of this module
      let currentSlot = null;
      let currentEngineering = null;
      let currentBlueprint = null;
      let currentGrade = 0;
      let currentExperimental = null;

      if (currentSlots && currentSlots.length > 0) {
        // Initialize tracking for this module type if needed
        if (!matchedIndices[fdName]) {
          matchedIndices[fdName] = new Set();
        }

        // Find an unmatched module of this type
        for (let i = 0; i < currentSlots.length; i++) {
          if (matchedIndices[fdName].has(i)) continue;

          currentSlot = currentSlots[i];
          matchedIndices[fdName].add(i);

          // Extract current engineering state
          currentEngineering = currentSlot.engineering || currentSlot.engineer;
          if (currentEngineering) {
            currentBlueprint = currentEngineering.blueprintName || currentEngineering.recipeName;
            currentGrade = currentEngineering.level || currentEngineering.recipeLevel || 0;

            if (currentEngineering.experimentalEffect) {
              currentExperimental = currentEngineering.experimentalEffect;
            } else if (currentSlot.specialModifications && currentSlot.specialModifications.length > 0) {
              currentExperimental = Object.keys(currentSlot.specialModifications[0])[0];
            }
          }
          break;
        }
      }

      const targetBlueprint = module.m.blueprint.fdname;
      const targetGrade = module.m.blueprint.grade;
      const targetExperimental = module.m.blueprint.special ? module.m.blueprint.special.edname : null;

      // Determine what materials are needed based on current vs target state
      let startGrade = 1; // Default: start from grade 1
      let needExperimental = false;

      if (!currentEngineering) {
        // Case: No engineering on current module → need everything
        startGrade = 1;
        needExperimental = !!targetExperimental;
      } else if (currentBlueprint !== targetBlueprint) {
        // Case 1: Blueprint TYPE changed → start from scratch (grade 1), experimental is wiped
        startGrade = 1;
        needExperimental = !!targetExperimental;
      } else if (currentGrade < targetGrade) {
        // Case 2: Same blueprint, GRADE increased → only need missing grades
        startGrade = currentGrade + 1;
        // Experimental: need it if different or missing
        needExperimental = targetExperimental !== currentExperimental;
      } else if (currentGrade === targetGrade && currentExperimental !== targetExperimental) {
        // Case 3: Same blueprint, same grade, different/missing experimental
        startGrade = targetGrade + 1; // Don't calculate any blueprint grades
        needExperimental = !!targetExperimental;
      } else {
        // Case 4: Everything matches
        matchCount++;
        continue;
      }

      differCount++;

      // Calculate materials for blueprint grades (from startGrade to targetGrade)
      for (let g in module.m.blueprint.grades) {
        if (!module.m.blueprint.grades.hasOwnProperty(g)) continue;
        const gradeNum = Number(g);
        if (gradeNum < startGrade || gradeNum > targetGrade) continue;

        for (let i in module.m.blueprint.grades[g].components) {
          if (!module.m.blueprint.grades[g].components.hasOwnProperty(i)) continue;

          if (mats[i]) {
            mats[i] += module.m.blueprint.grades[g].components[i] * this.state.matsPerGrade[g];
          } else {
            mats[i] = module.m.blueprint.grades[g].components[i] * this.state.matsPerGrade[g];
          }
        }
      }

      // Calculate materials for experimental (if needed)
      if (needExperimental && module.m.blueprint.special) {
        for (const j in module.m.blueprint.special.components) {
          if (!module.m.blueprint.special.components.hasOwnProperty(j)) continue;

          if (mats[j]) {
            mats[j] += module.m.blueprint.special.components[j];
          } else {
            mats[j] = module.m.blueprint.special.components[j];
          }
        }
      }
    }

    // Store match counts for display in UI
    this._moduleMatchCount = matchCount;
    this._moduleDifferCount = differCount;

    return mats;
  }

  /**
   * Find all blueprints needed to make a build.
   */
  registerBPs() {
    const ship = this.props.ship;
    let blueprints = [];
    for (const module of ship.costList) {
      if (module.type === 'SHIP') {
        continue;
      }
      if (module.m && module.m.blueprint) {
        if (!module.m.blueprint.grade || !module.m.blueprint.grades) {
          continue;
        }
        if (module.m.blueprint.special) {
          blueprints.push({ uuid: module.m.blueprint.special.uuid, number: 1 });
        }
        for (const g in module.m.blueprint.grades) {
          if (!module.m.blueprint.grades.hasOwnProperty(g)) {
            continue;
          }
          if (g > module.m.blueprint.grade) {
            continue;
          }
          blueprints.push({ uuid: module.m.blueprint.grades[g].uuid, number: this.state.matsPerGrade[g] });
        }
      }
    }
    this.setState({ blueprints });
  }

  /**
   * Check browser isn't firefox.
   * @return {boolean} true if compatible, false if not.
   */
  checkBrowserIsCompatible() {
    // Firefox 1.0+
    return typeof InstallTrigger === 'undefined';
  }

  /**
   * Get a list of commanders from EDEngineer.
   */
  getCommanders() {
    request
      .get('http://localhost:44405/commanders')
      .end((err, res) => {
        this.display = 'block';
        if (err) {
          console.log(err);
          this.display = 'none';
          return this.setState({ failed: true });
        }
        const cmdrs = JSON.parse(res.text);
        if (!this.state.cmdrName) {
          this.setState({ cmdrName: cmdrs[0] });
        }
        this.setState({ cmdrs }, () => {
          Persist.setCmdr({ selected: this.state.cmdrName, cmdrs });
        });
      });
  }

  /**
   * Send all blueprints to ED Engineer
   * @param {Event} event React event
   */
  sendToEDEng(event) {
    event.preventDefault();
    let translate = this.context.language.translate;
    const target = event.target;
    target.disabled = this.state.blueprints.length > 0;
    if (this.state.blueprints.length === 0) {
      target.innerText = translate('No modded components.');
      target.disabled = true;
      setTimeout(() => {
        target.innerText = translate('Send to EDEngineer');
        target.disabled = false;
      }, 3000);
    } else {
      target.innerText = translate('Sending...');
    }
    let countSent = 0;
    let countTotal = this.state.blueprints.length;

    for (const i of this.state.blueprints) {
      request
        .patch(`http://localhost:44405/${this.state.cmdrName}/shopping-list`)
        .field('uuid', i.uuid)
        .field('size', i.number)
        .end(err => {
          if (err) {
            console.log(err);
            if (err.message !== 'Bad Request') {
              this.setState({ failed: true });
            }
          }
          countSent++;
          if (countSent === countTotal) {
            target.disabled = false;
            target.innerText = translate('Send to EDEngineer');
          }
        });
    }
  }

  /**
   * Fix issues with the item name for bulkheads when sending to EDOMH
   * @param {*} ship Ship object
   * @param {*} item Item name
   * @returns updated item name
   */
  fixArmourItemNameForEDOMH(ship, item) {
    // The module blueprint fdname contains "Armour_" it's a bulkhead and we need to pre-populate the item field with the correct name from the ship object
    // If the bulkhead has a symbol (fdname), use it directly (e.g. Caspian Explorer)
    if (ship.bulkheads.m.symbol) {
      return ship.bulkheads.m.symbol;
    }
    switch (ship.bulkheads.m.name){
      case "Lightweight Alloy":
        item = ship.id + "_Armour_Grade1";
        break;
      case "Reinforced Alloy":
        item = ship.id + "_Armour_Grade2";
        break;
      case "Military Grade Composite":
        item = ship.id + "_Armour_Grade3";
        break;
      case "Mirrored Surface Composite":
        item = ship.id + "_Armour_Mirrored";
        break;
      case "Reactive Surface Composite":
        item = ship.id + "_Armour_Reactive";
        break;
    }
    return item;
  }

  /**
 * Send all blueprints to EDOMH. This is a modified copy of registerBPs because this.state.blueprints was empty when I tried to modify sendToEDEng and I couldn't figure out why
 * @param {Event} event React event
 */
  sendToEDOMH(event) {
    event.preventDefault();
    const ship = this.props.ship;
    const buildName = this.props.buildName;
    let blueprints = [];

    //create the json
    for (const module of ship.costList) {
      if (module.type === 'SHIP') {
        continue;
      }
      if (module.m && module.m.blueprint) {
        if (!module.m.blueprint.grade || !module.m.blueprint.grades) {
          continue;
        }
        if (module.m.blueprint.special) {
          let item = "";
          // If the module blueprint fdname contains "Armour_" it's a bulkhead and we need to pre-populate the item field with the correct name from the ship object
          if (module.m.blueprint.fdname.includes("Armour_")) {
            item = this.fixArmourItemNameForEDOMH(ship, item)
          }
          else {
            item = module.m.symbol;
          }

          blueprints.push({
            "item": item,
            "blueprint": module.m.blueprint.special.edname
          });
        }
        for (let g in module.m.blueprint.grades) {
          if (!module.m.blueprint.grades.hasOwnProperty(g)) {
            continue;
          }
          // We only want the grade that the module is currently at, not every grade up to that point
          if (Number(g) !== module.m.blueprint.grade) {
            continue;
          }
          let item = "";
          // If the module blueprint fdname contains "Armour_" it's a bulkhead and we need to pre-populate the item field with the correct name from the ship object
          if (module.m.blueprint.fdname.includes("Armour_")) {
            item = this.fixArmourItemNameForEDOMH(ship, item)
          }
          else {
            item = module.m.symbol;
          }
          blueprints.push({
            "item": item,
            "blueprint": module.m.blueprint.fdname,
            "grade": module.m.blueprint.grade,
            "highestGradePercentage":1.0
          });
        }
      }
    }

    let shipName = buildName + " - " + ship.name;

    //create JSON to encode
    let baseJson = {
      "version":1,
      "name": shipName, // TO-DO: Import build name and put that here correctly
      "items": blueprints
    }

    let JSONString = JSON.stringify(baseJson)
    let deflated = zlib.deflateSync(JSONString)

    //actually encode
    let link = base64url.encode(deflated)
    link = "edomh://coriolis/?" + link;

    window.open(link, "_self")
  }

  /**
   * Convert mats object to string
   */
  renderMats() {
    const ship = this.props.ship;
    let mats = {};
    for (const module of ship.costList) {
      if (module.type === 'SHIP') {
        continue;
      }
      if (module.m && module.m.blueprint) {
        if (!module.m.blueprint.grade || !module.m.blueprint.grades) {
          continue;
        }
        for (let g in module.m.blueprint.grades) {
          if (!module.m.blueprint.grades.hasOwnProperty(g)) {
            continue;
          }
          // Ignore grades higher than the grade selected
          if (Number(g) > module.m.blueprint.grade) {
            continue;
          }
          for (let i in module.m.blueprint.grades[g].components) {
            if (!module.m.blueprint.grades[g].components.hasOwnProperty(i)) {
              continue;
            }
            if (mats[i]) {
              mats[i] += module.m.blueprint.grades[g].components[i] * this.state.matsPerGrade[g];
            } else {
              mats[i] = module.m.blueprint.grades[g].components[i] * this.state.matsPerGrade[g];
            }
          }
        }
        if (module.m.blueprint.special) {
          for (const j in module.m.blueprint.special.components) {
            if (!module.m.blueprint.special.components.hasOwnProperty(j)) {
              continue;
            }
            if (mats[j]) {
              mats[j] += module.m.blueprint.special.components[j];
            } else {
              mats[j] = module.m.blueprint.special.components[j];
            }
          }
        }
      }
    }
    let matsString = '';
    let raw = [], mfc = [], enc = [];
    for (const i in mats) {
      if (!mats.hasOwnProperty(i)) {
        continue;
      }
      if (mats[i] === 0) {
        delete mats[i];
        continue;
      }
      matsString += `${i}: ${mats[i]}\n`;
      const entry = { name: i, count: mats[i] };
      const cat = matCategory(i);
      if (cat === 'raw') raw.push(entry);
      else if (cat === 'encoded') enc.push(entry);
      else mfc.push(entry);
    }
    this.setState({ matsList: matsString, matsRaw: raw, matsMfg: mfc, matsEnc: enc, mats });
  }

  /**
   * Handler for changing roll amounts
   * @param {SyntheticEvent} e React Event
   */
  changeHandler(e) {
    let grade = e.target.id;
    let newState = this.state.matsPerGrade;
    newState[grade] = parseInt(e.target.value);
    this.setState({ matsPerGrade: newState });
    Persist.setRolls(newState);
    this.renderMats();
    this.registerBPs();
  }

  /**
   * Handler for changing cmdr name
   * @param {SyntheticEvent} e React Event
   */
  cmdrChangeHandler(e) {
    let cmdrName = e.target.value;
    this.setState({ cmdrName }, () => {
      Persist.setCmdr({ selected: this.state.cmdrName, cmdrs: this.state.cmdrs });
    });
  }

  /**
   * Toggle expanded state for a material category column.
   * @param {string} key  One of 'expandedRaw', 'expandedMfg', 'expandedEnc'
   */
  toggleExpand(key) {
    this.setState(prev => ({ [key]: !prev[key] }));
  }

  /**
   * Render a single material column with optional truncation.
   * @param {string}  title      Column heading
   * @param {Array}   items      Array of {name, count[, need, have]}
   * @param {string}  expandKey  State key for expanded toggle
   * @param {boolean} showDetail  Whether to show need/have detail column
   * @return {React.Component|null}
   */
  renderColumn(title, items, expandKey, showDetail) {
    if (!items.length) return null;
    const translate = this.context.language.translate;
    const expanded = this.state[expandKey];
    const truncated = !expanded && items.length > TRUNCATE_LIMIT;
    const visible = truncated ? items.slice(0, TRUNCATE_LIMIT) : items;
    const remaining = items.length - TRUNCATE_LIMIT;

    return <div className='mats-col'>
      <h4>{translate(title)}</h4>
      <table className='mats-table'><tbody>
        {visible.map(m => <tr key={m.name}>
          <td className='mat-name'>{m.name}</td>
          <td className='mat-count'>{m.count}</td>
          {showDetail ? <td className='mat-detail'>({m.need}/{m.have})</td> : null}
        </tr>)}
      </tbody></table>
      {truncated ? <a className='mats-show-more' onClick={() => this.toggleExpand(expandKey)}>{translate('show')} {remaining} {translate('more')}...</a> : null}
      {expanded && items.length > TRUNCATE_LIMIT ? <a className='mats-show-more' onClick={() => this.toggleExpand(expandKey)}>{translate('show less')}</a> : null}
    </div>;
  }

  /**
   * Render the modal
   * @return {React.Component} Modal Content
   */
  render() {
    let translate = this.context.language.translate;
    this.changeHandler = this.changeHandler.bind(this);
    const compatible = this.checkBrowserIsCompatible();
    this.cmdrChangeHandler = this.cmdrChangeHandler.bind(this);
    this.sendToEDEng = this.sendToEDEng.bind(this);
    this.sendToEDOMH = this.sendToEDOMH.bind(this);
    return <div className='modal modal-wide' onClick={ (e) => e.stopPropagation() }>
      {this.state.cmdrLinked && this.state.buildLinked ? (
        <div>
          <h3>CMDR Coriolis — {translate('PHRASE_CMDR_SHOPPING_MATS')}</h3>
          {this.state.remainingRaw.length || this.state.remainingMfg.length || this.state.remainingEnc.length ? (
            <div className='mats-columns'>
              {this.renderColumn('Raw', this.state.remainingRaw, 'expandedRaw', true)}
              {this.renderColumn('Manufactured', this.state.remainingMfg, 'expandedMfg', true)}
              {this.renderColumn('Encoded', this.state.remainingEnc, 'expandedEnc', true)}
            </div>
          ) : (
            this._moduleDifferCount === 0 ? (
              <p>Your ship matches your build!</p>
            ) : (
              <p>You have all the materials needed to complete this build!</p>
            )
          )}
        </div>
      ) : (
        <div>
          <h3>{translate('PHRASE_SHOPPING_MATS')}</h3>
          <div className='mats-columns'>
            {this.renderColumn('Raw', this.state.matsRaw, 'expandedRaw', false)}
            {this.renderColumn('Manufactured', this.state.matsMfg, 'expandedMfg', false)}
            {this.renderColumn('Encoded', this.state.matsEnc, 'expandedEnc', false)}
          </div>
          <hr />
          <h3>CMDR Coriolis</h3>
          {this.state.cmdrLinked ? (
          <p>{translate('PHRASE_LINK_BUILD')}</p>
          ) : (
          <p>{translate('PHRASE_SIGN_UP_CMDR')}</p>
          )}
        </div>
      )}
      <a href="https://inara.cz/elite/nearest-stations/?formbrief=1&pa1[]=25&ps1=" target="_blank" rel="noopener" className={'l cb cap'}>{translate('FIND_MATERIAL_TRADER')}</a><br />

      <div id='edengineer' display={this.display} hidden={!!this.state.failed && !compatible}>
      <hr />
        <h3>ED Engineer</h3>
        <h4 hidden={compatible} id={'browserbad'} className={'l'}>{translate('PHRASE_FIREFOX_EDENGINEER')}</h4>
        <h4 hidden={!this.state.failed} id={'failed'} className={'l'}>{translate('PHRASE_FAILED_TO_FIND_EDENGINEER')}</h4>
        <label for='cmdr-select' hidden={!!this.state.failed || !compatible} className={'l cap'}>{translate('CMDR Name:')}</label>
        <select id='cmdr-select' hidden={!!this.state.failed || !compatible} className={'cmdr-select l cap'} onChange={this.cmdrChangeHandler} defaultValue={this.state.cmdrName}>
          {this.state.cmdrs.map(e => <option key={e}>{e}</option>)}
        </select>
        <br/>
          <button className={'l cb dismiss cap'} disabled={!!this.state.failed || !compatible} onClick={this.sendToEDEng}>{translate('Send to EDEngineer')}</button>
      </div>
      <div id='edomh'>
      <hr />
        <h3>ED Odyssey Materials Helper</h3>
        <p>{translate('PHRASE_ENSURE_EDOMH')}</p>
        <button className={'l cb dismiss cap'} onClick={this.sendToEDOMH}>{translate('Send to EDOMH')}</button>
      </div>
      <hr />
      <button className={'r dismiss cap'} onClick={this.context.hideModal}>{translate('close')}</button>
    </div>;
  }
}
