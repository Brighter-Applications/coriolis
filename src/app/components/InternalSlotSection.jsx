import React from 'react';
import SlotSection from './SlotSection';
import InternalSlot from './InternalSlot';
import * as ModuleUtils from '../shipyard/ModuleUtils';
import { stopCtxPropagation } from '../utils/UtilityFunctions';
import { canMount } from '../utils/SlotFunctions';
import AvailableModulesMenu from './AvailableModulesMenu';
import CategoryMenu from './CategoryMenu';

/**
 * Internal slots section
 */
export default class InternalSlotSection extends SlotSection {

  /**
   * Constructor
   * @param  {Object} props   React Component properties
   * @param  {Object} context React Component context
   */
  constructor(props, context) {
    super(props, context, 'internal', 'optional internal');
    this._empty = this._empty.bind(this);
    this._fillWithCargo = this._fillWithCargo.bind(this);
    this._fillWithCells = this._fillWithCells.bind(this);
    this._fillWithArmor = this._fillWithArmor.bind(this);
    this._fillWithModuleReinforcementPackages = this._fillWithModuleReinforcementPackages.bind(this);
    this._fillWithFuelTanks = this._fillWithFuelTanks.bind(this);
    this._fillWithLuxuryCabins = this._fillWithLuxuryCabins.bind(this);
    this._fillWithFirstClassCabins = this._fillWithFirstClassCabins.bind(this);
    this._fillWithBusinessClassCabins = this._fillWithBusinessClassCabins.bind(this);
    this._fillWithEconomyClassCabins = this._fillWithEconomyClassCabins.bind(this);
    this.selectedRefId = null;
    this.firstRefId = 'emptyall';
    this.lastRefId = this.sectionRefArr['pcq'] ? 'pcq' : 'pcm';
    this.state = {
      selectedCategory: null,
      originSlot: null,
      targetSlot: null
    };
    this._onCategorySelect = this._onCategorySelect.bind(this);
  }

  /**
   * Open a menu for a slot and reset the selected category
   * @param  {Object} slot    The slot object
   * @param  {Object} event   The event
   */
  _openMenu(slot, event) {
    // Stop the event from propagating further. This is the key to preventing
    // the "click-through" race condition that was causing the CategoryMenu
    // to be skipped.
    event.stopPropagation();
    event.persist();

    if (this.props.currentMenu === slot) {
      // If the menu for this slot is already open, just close it.
      super._openMenu(slot, event);
    } else {
      // If opening a new menu, first reset the category state,
      // then open the menu in the setState callback to ensure correct order.
      this.setState({ selectedCategory: null }, () => {
        super._openMenu(slot, event);
      });
    }
  }

  /**
   * Set the selected category
// ...existing code...
   * @return {React.Component} The menu component
   */
  _getMenu(slot, onSelect, warningFunc, availableModules) {
    const { ship } = this.props;
    const { selectedCategory } = this.state;
    // getInts returns an object of module groups
    const availableModuleGroups = availableModules.getInts(ship, slot.maxClass, slot.eligible);

    if (slot.m === null && selectedCategory === null) {
      // Slot is empty and no category is selected: show CategoryMenu
      const categoriesForSlot = ModuleUtils.getIntCategoriesForSlot(slot);
      return <CategoryMenu
        className='internal'
        categories={categoriesForSlot}
        onSelect={this._onCategorySelect.bind(this, onSelect)}
        onClose={this._close}
      />;
    } else {
      // A category has been selected, or the slot is populated.
      // Pass the full list of modules and the selected category to the menu.
      return <AvailableModulesMenu
        ship={ship}
        slot={slot}
        m={slot.m}
        modules={availableModuleGroups}
        onSelect={onSelect}
        warning={warningFunc}
        onClose={this._close}
        selectedCategory={selectedCategory}
      />;
    }
  }

  /**
   * Set the selected category
   * @param {string} category The selected category
   */
  _onCategorySelect(onSelect, category) {
    console.log(`Category selected: ${category}`);
    this.setState({ selectedCategory: category });
  }

  /**
   * Select a module for a slot and reset the selected category
   * @param  {Object} slot    The slot object
   * @param  {Object} module  The module object to fit
   * @param  {Object} event   The event
   */
  _selectModule(slot, module, event) {
    super._selectModule(slot, module, event);
  }

  /**
   * Handle focus when component updates
   * @param {Object} prevProps React Component properties
   */
  componentDidUpdate(prevProps) {
    this._handleSectionFocus(prevProps,this.firstRefId, this.lastRefId);
  }

  /**
   * Empty all slots
   */
  _empty() {
    this.selectedRefId = 'emptyall';
    this.props.ship.emptyInternal();
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with cargo racks
   * @param  {SyntheticEvent} event Event
   */
  _fillWithCargo(event) {
    this.selectedRefId = 'cargo';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    ship.internal.forEach((slot) => {
      if ((clobber || !slot.m) && canMount(ship, slot, 'cr')) {
        ship.use(slot, ModuleUtils.findInternal('cr', slot.maxClass, 'E'));
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with fuel tanks
   * @param  {SyntheticEvent} event Event
   */
  _fillWithFuelTanks(event) {
    this.selectedRefId = 'ft';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    ship.internal.forEach((slot) => {
      if ((clobber || !slot.m) && canMount(ship, slot, 'ft')) {
        ship.use(slot, ModuleUtils.findInternal('ft', slot.maxClass, 'C'));
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with luxury passenger cabins
   * @param  {SyntheticEvent} event Event
   */
  _fillWithLuxuryCabins(event) {
    this.selectedRefId = 'pcq';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    ship.internal.forEach((slot) => {
      if ((clobber || !slot.m) && canMount(ship, slot, 'pcq')) {
        ship.use(slot, ModuleUtils.findInternal('pcq', Math.min(slot.maxClass, 6), 'B')); // Passenger cabins top out at 6
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with first class passenger cabins
   * @param  {SyntheticEvent} event Event
   */
  _fillWithFirstClassCabins(event) {
    this.selectedRefId = 'pcm';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    ship.internal.forEach((slot) => {
      if ((clobber || !slot.m) && canMount(ship, slot, 'pcm')) {
        ship.use(slot, ModuleUtils.findInternal('pcm', Math.min(slot.maxClass, 6), 'C')); // Passenger cabins top out at 6
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with business class passenger cabins
   * @param  {SyntheticEvent} event Event
   */
  _fillWithBusinessClassCabins(event) {
    this.selectedRefId = 'pci';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    ship.internal.forEach((slot) => {
      if ((clobber || !slot.m) && canMount(ship, slot, 'pci')) {
        ship.use(slot, ModuleUtils.findInternal('pci', Math.min(slot.maxClass, 6), 'D')); // Passenger cabins top out at 6
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with economy class passenger cabins
   * @param  {SyntheticEvent} event Event
   */
  _fillWithEconomyClassCabins(event) {
    this.selectedRefId = 'pce';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    ship.internal.forEach((slot) => {
      if ((clobber || !slot.m) && canMount(ship, slot, 'pce')) {
        ship.use(slot, ModuleUtils.findInternal('pce', Math.min(slot.maxClass, 6), 'E')); // Passenger cabins top out at 6
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with Shield Cell Banks
   * @param  {SyntheticEvent} event Event
   */
  _fillWithCells(event) {
    this.selectedRefId = 'scb';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    let chargeCap = 0; // Capacity of single activation
    ship.internal.forEach(function(slot) {
      if ((clobber && !(slot.m && ModuleUtils.isShieldGenerator(slot.m.grp)) || !slot.m) && canMount(ship, slot, 'scb')) {
        ship.use(slot, ModuleUtils.findInternal('scb', slot.maxClass, 'A'));
        ship.setSlotEnabled(slot, chargeCap <= ship.shieldStrength); // Don't waste cell capacity on overcharge
        chargeCap += slot.m.recharge;
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with Hull Reinforcement Packages
   * @param  {SyntheticEvent} event Event
   */
  _fillWithArmor(event) {
    this.selectedRefId = 'hr';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    ship.internal.forEach((slot) => {
      if ((clobber || !slot.m) && canMount(ship, slot, 'hr')) {
        ship.use(slot, ModuleUtils.findInternal('hr', Math.min(slot.maxClass, 5), 'D')); // Hull reinforcements top out at 5D
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Fill all slots with Module Reinforcement Packages
   * @param  {SyntheticEvent} event Event
   */
  _fillWithModuleReinforcementPackages(event) {
    this.selectedRefId = 'mrp';
    let clobber = event.getModifierState('Alt');
    let ship = this.props.ship;
    ship.internal.forEach((slot) => {
      if ((clobber || !slot.m) && canMount(ship, slot, 'mrp')) {
        ship.use(slot, ModuleUtils.findInternal('mrp', Math.min(slot.maxClass, 5), 'D')); // Module reinforcements top out at 5D
      }
    });
    this.props.onChange();
    this._close();
  }

  /**
   * Empty all on section header right click
   */
  _contextMenu() {
    this._empty();
  }

  /**
   * Generate the slot React Components
   * @return {Array} Array of Slots
   */
  _getSlots() {
    let slots = [];
    let { currentMenu, ship } = this.props;
    let { originSlot, targetSlot } = this.state;
    let { internal, fuelCapacity } = ship;
    let availableModules = ship.getAvailableModules();

    for (let i = 0, l = internal.length; i < l; i++) {
      let s = internal[i];
      let menu;
      if (currentMenu === s) {
        // Pass the availableModules object to _getMenu
        menu = this._getMenu(s, this._selectModule.bind(this, s), null, availableModules);
      }

      slots.push(<InternalSlot
        key={i}
        id={s.id}
        maxClass={s.maxClass}
        availableModules={() => availableModules.getInts(ship, s.maxClass, s.eligible)}
        onOpen={this._openMenu.bind(this,s)}
        onChange={this.props.onChange}
        onSelect={this._selectModule.bind(this, s)}
        selected={currentMenu == s}
        eligible={s.eligible}
        m={s.m}
        menu={menu}
        drag={this._drag.bind(this, s)}
        dragOver={this._dragOverSlot.bind(this, s)}
        drop={this._drop}
        dropClass={this._dropClass(s, originSlot, targetSlot)}
        fuel={fuelCapacity}
        ship={ship}
        enabled={s.enabled ? true : false}
      />);
    }

    return slots;
  }

  /**
   * Generate the section drop-down menu
   * @param  {Function} translate Translate function
   * @param  {Function} ship      The ship
   * @return {React.Component}    Section menu
   */
  _getSectionMenu(translate, ship) {
    return <div className='select' onClick={e => e.stopPropagation()} onContextMenu={stopCtxPropagation}>
      <ul>
        <li className='lc' tabIndex='0' onClick={this._empty} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['emptyall'] = smRef}>{translate('empty all')}</li>
        <li className='lc' tabIndex='0' onClick={this._fillWithCargo} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['cargo'] = smRef}>{translate('cargo')}</li>
        <li className='lc' tabIndex='0' onClick={this._fillWithCells} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['scb'] = smRef}>{translate('scb')}</li>
        <li className='lc' tabIndex='0' onClick={this._fillWithArmor} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['hr'] = smRef}>{translate('hr')}</li>
        <li className='lc' tabIndex='0' onClick={this._fillWithModuleReinforcementPackages} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['mrp'] = smRef}>{translate('mrp')}</li>
        <li className='lc' tabIndex='0' onClick={this._fillWithFuelTanks} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['ft'] = smRef}>{translate('ft')}</li>
        <li className='lc' tabIndex='0' onClick={this._fillWithEconomyClassCabins} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['pce'] = smRef}>{translate('pce')}</li>
        <li className='lc' tabIndex='0' onClick={this._fillWithBusinessClassCabins} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['pci'] = smRef}>{translate('pci')}</li>
        <li className='lc' tabIndex='0' onClick={this._fillWithFirstClassCabins} onKeyDown={ship.luxuryCabins ? '' : this._keyDown} ref={smRef => this.sectionRefArr['pcm'] = smRef}>{translate('pcm')}</li>
	{ ship.luxuryCabins ? <li className='lc' tabIndex='0' onClick={this._fillWithLuxuryCabins} onKeyDown={this._keyDown} ref={smRef => this.sectionRefArr['pcq'] = smRef}>{translate('pcq')}</li> : ''}
        <li className='optional-hide' style={{ textAlign: 'center', marginTop: '1em' }}>{translate('PHRASE_ALT_ALL')}</li>
      </ul>
    </div>;
  }
}
