import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TranslatedComponent from './TranslatedComponent';
import cn from 'classnames';
import { stopCtxPropagation } from '../utils/UtilityFunctions';
import { MountFixed, MountGimballed, MountTurret } from './SvgIcons';

const PRESS_THRESHOLD = 500; // mouse/touch down threshold

// Add these constants at the top of the file, after the imports (around line 8):

const GRPCAT = {
  'sg': 'shields',
  'bsg': 'shields',
  'psg': 'shields',
  'scb': 'shields',
  'cr': 'cargo racks',
  'crl': 'cargo racks',
  'cc': 'limpet controllers',
  'fx': 'limpet controllers',
  'hb': 'limpet controllers',
  'mlc': 'limpet controllers',
  'pc': 'limpet controllers',
  'rpl': 'limpet controllers',
  'pce': 'passenger cabins',
  'pci': 'passenger cabins',
  'pcm': 'passenger cabins',
  'pcq': 'passenger cabins',
  'fh': 'hangars',
  'pv': 'hangars',
  'fs': 'fuel',
  'ft': 'fuel',
  'hr': 'structural reinforcement',
  'mrp': 'structural reinforcement',
  'bl': 'lasers',
  'pl': 'lasers',
  'ul': 'lasers',
  'ml': 'lasers',
  'c': 'projectiles',
  'mc': 'projectiles',
  'advmc': 'projectiles',
  'axmc': 'experimental',
  'axmce': 'experimental',
  'ntp': 'experimental',
  'fc': 'projectiles',
  'rfl': 'experimental',
  'pa': 'projectiles',
  'rg': 'projectiles',
  'mr': 'ordnance',
  'amr': 'ordnance',
  'axmr': 'experimental',
  'axmre': 'experimental',
  'rcpl': 'experimental',
  'dtl': 'experimental',
  'tbsc': 'experimental',
  'tbem': 'experimental',
  'tbrfl': 'experimental',
  'mahr': 'experimental',
  'rsl': 'experimental',
  'tp': 'ordnance',
  'nl': 'ordnance',
  'sc': 'scanners',
  'ss': 'scanners',
  'cs': 'scanners',
  'kw': 'scanners',
  'ws': 'scanners',
  'xs': 'scanners',
  'ch': 'defence',
  'po': 'defence',
  'ec': 'defence',
  'sfn': 'defence',
  'gpp': 'guardian',
  'gpc': 'guardian',
  'gsrp': 'guardian',
  'ggc': 'guardian',
  'gfsb': 'guardian',
  'gmrp': 'guardian',
  'gsc': 'guardian',
  'ghrp': 'guardian',
  'scl': 'mining',
  'pwa': 'mining',
  'sdm': 'mining',
  'dc': 'flight assists',
  'sua': 'flight assists',
  'ews': 'weapon stabilizers',
};

const INTCAT = {
  'auto field-maintenance unit': ['am'],
  'cargo racks': ['cr', 'crl'],
  'fsd interdictor': ['fi'],
  'fuel': ['ft', 'fs'],
  'hangars': ['fh', 'pv'],
  'limpet controllers': ['cc', 'fx', 'hb', 'pc', 'rpl', 'mlc'],
  'passenger cabins': ['pce', 'pci', 'pcm', 'pcq'],
  'refineries': ['rf'],
  'shields': ['sg', 'bsg', 'psg', 'scb'],
  'structural reinforcement': ['hr', 'mrp'],
  'flight assists': ['dc', 'sua'],
  'scanners': ['ss'],
  'experimental': ['rcpl', 'dtl', 'mahr', 'rsl'],
  'weapon stabilizers': ['ews'],
  'guardian': ['gsrp', 'gfsb', 'ghrp', 'gmrp'],
};

const HPTCAT = {
  'lasers': ['pl', 'ul', 'bl'],
  'projectiles': ['mc', 'advmc', 'c', 'fc', 'pa', 'rg'],
  'ordnance': ['mr', 'amr', 'tp', 'nl'],
  'mining': ['ml', 'scl', 'sdm', 'abl'],
  'experimental': ['axmc', 'axmce', 'axmr', 'axmre', 'ntp','rfl', 'tbrfl', 'tbsc', 'tbem', 'xs', 'sfn'],
  'guardian': ['gpc', 'ggc', 'gsc'],
};

/**
 * Available modules menu
 */
export default class AvailableModulesMenu extends TranslatedComponent {

  static propTypes = {
    className: PropTypes.string,
    modules: PropTypes.array.isRequired,
    onSelect: PropTypes.func.isRequired,
    warning: PropTypes.func.isRequired,
    diffDetails: PropTypes.func.isRequired,
    m: PropTypes.object,
    eligible: PropTypes.func.isRequired
  };

  /**
   * Constructor
   * @param  {Object} props   React Component properties
   * @param  {Object} context React Component context
   */
  constructor(props, context) {
    super(props);
    this._hideDiff = this._hideDiff.bind(this);
    this._showSearch = this._showSearch.bind(this);
    this.state = this._initState(props, context);
    this.slotItems = new Map();
    this.groupElem = null;
    this.node = null;
  }

  /**
   * Init state based on module list
   * @param  {Object} props   React Component properties
   * @param  {Object} context React Component context
   * @return {Object}         Initial state
   */
  _initState(props, context) {
    let { language, termtip, tooltip } = context;
    let { modules, onSelect, m, eligible, warning } = props;
    let translate = language.translate;
    let list = [];
    let emptyId = 'empty';
    let firstSlotId, lastSlotId, activeSlotId;

    if (m) {
      activeSlotId = m.id;
    }

    // Check if this is a core internal slot (they can never be empty)
    const isCoreInternal = this.props.className && this.props.className.includes('standard');

    if (!isCoreInternal) {
      firstSlotId = emptyId;
      lastSlotId = emptyId;
    }

    // Collect all modules from any structure into a flat array
    let allModules = [];

    if (modules) {
      if (Array.isArray(modules)) {
        // Direct array of modules
        allModules = modules.filter(this._shouldIncludeModule);
      } else if (typeof modules === 'object') {
        // Object structure - extract all modules into flat array
        Object.keys(modules).forEach(groupKey => {
          const moduleGroup = modules[groupKey];

          if (Array.isArray(moduleGroup)) {
            // Filter modules in this group
            const filteredModules = moduleGroup.filter(this._shouldIncludeModule);
            allModules = allModules.concat(filteredModules);
          } else if (moduleGroup && typeof moduleGroup === 'object') {
            // Nested object structure like { 'cargo': { '1': mod1, '2': mod2 } }
            const filteredModules = Object.keys(moduleGroup)
              .map(modKey => moduleGroup[modKey])
              .filter(this._shouldIncludeModule);
            allModules = allModules.concat(filteredModules);
          }
        });
      }
    }

    // Process all modules with proper category grouping (no duplicate headers)
    if (allModules.length > 0) {
      this._processModules(allModules, list, onSelect, eligible, warning, termtip, tooltip, translate);

      allModules.forEach((mod) => {
        if (!firstSlotId) firstSlotId = mod.id;
        lastSlotId = mod.id;
      });
    }

    // Only add empty option for non-core internal slots
    if (!isCoreInternal) {
      list.unshift(this._createEmptySlotElement(emptyId, m, onSelect, translate));
    }

    this.activeSlotId = activeSlotId;
    this.firstSlotId = firstSlotId;
    this.lastSlotId = lastSlotId;

    return { list };
  }

  /**
   * Filter out unrecognised modules
   */
  _shouldIncludeModule = (mod) => {
    if (!mod || !mod.id) return false;

    // Filter out unrecognised modules
    if (mod.name && mod.name.toLowerCase().includes('unrecognised')) return false;
    if (mod.id && mod.id.toLowerCase().includes('unrecognised')) return false;
    if (mod.grp === 'unknown' || mod.grp === 'unrecognised') return false;

    return true;
  }

  /**
   * Sort modules by size (descending) then rating (ascending)
   */
  _sortModules = (a, b) => {
    const classA = a.class || 0;
    const classB = b.class || 0;
    if (classA !== classB) {
      return classB - classA; // Size descending: 6, 5, 4, 3, 2, 1
    }

    // Handle all possible ratings: A, B, C, D, E, F, G, H, I, etc.
    const ratingA = a.rating || 'Z';
    const ratingB = b.rating || 'Z';
    if (ratingA !== ratingB) {
      return ratingA.localeCompare(ratingB); // Rating ascending: A, B, C, D, E, F, G, H, I
    }

    const nameA = a.name || a.id || '';
    const nameB = b.name || b.id || '';
    return nameA.localeCompare(nameB);
  }

  /**
   * Determine if a module is compact (only size/class) or named
   */
  _isCompactModule = (mod) => {
    // Bulkheads are never compact
    const isBulkhead = mod.grp === 'bh' || mod.grp === 'armour' ||
                      (mod.name && mod.name.toLowerCase().includes('bulkhead'));

    if (isBulkhead) return false;

    // If it has no name, it's compact (just size/rating like "5A", "2F", "1I")
    if (!mod.name) return true;

    // If the name is just the class/rating repeated, it's compact
    if (mod.class && mod.rating && mod.name === `${mod.class}${mod.rating}`) return true;

    // Special/unique modules should NEVER be compact (like Disruptor, Pacifier, etc.)
    const specialModuleNames = [
      'disruptor',
      'pacifier',
      'retributor',
      'enforcer',
      'cytoscrambler',
      'advanced',
      'enhanced',
      'modified',
      'prismatic',
      'bi-weave',
      'guardian',
      'ax',
      'caustic',
      'enzyme',
      'nanite',
      'abrasion',
      'seismic',
      'sub-surface',
      'displacement',
      'mining',
      'detailed surface scanner',
      'supercruise assist',
      'docking computer',
      'fighter hangar',
      'planetary vehicle hangar',
      'corrosion resistant',
      'military grade',
      'lightweight',
      'reinforced',
      'mirrored',
      'reactive'
    ];

    if (mod.name) {
      const lowerName = mod.name.toLowerCase();
      const isSpecialModule = specialModuleNames.some(special => lowerName.includes(special));

      if (isSpecialModule) {
        return false; // Special modules are NEVER compact
      }
    }

    // Only very basic standard modules should be in grid format
    const basicGridModules = [
      'cargo rack',
      'fuel tank'
    ];

    if (mod.name) {
      const lowerName = mod.name.toLowerCase();
      const isBasicGridModule = basicGridModules.some(type => lowerName === type);

      if (isBasicGridModule) {
        return true; // Only exact matches for basic modules are compact
      }
    }

    // Everything else with a name should be in the named list
    return false;
  }

  /**
   * Create a compact module element for the grid
   */
  _createCompactModuleElement = (mod, onSelect, eligible, warning, termtip, tooltip, translate) => {
    if (!mod || !mod.id) {
      console.warn('Invalid module:', mod);
      return null;
    }

    let validSlot = eligible(mod);
    let isActive = this.props.m && this.props.m.id === mod.id;

    // Check if this is a hardpoint module
    const isHardpoint = mod.mount || (mod.grp && (mod.grp === 'wp' || mod.grp === 'ul'));

    let classNames = cn({
      'compact-module': !isHardpoint, // Use compact-module for non-hardpoint modules
      'hardpoint-module': isHardpoint, // Use hardpoint-module for hardpoint modules
      'c': validSlot,
      'disabled': !validSlot,
      'active': isActive
    });

    let warningIcon;
    if (validSlot && !isActive && warning) {
      warningIcon = warning(mod);
    }

    // Generate compact display name for all class/rating combinations
    let displayName;
    let mountIcon = null;

    // Check if this is a hardpoint module and get mount type icon
    if (mod.mount) {
      switch (mod.mount) {
        case 'F': // Fixed
          mountIcon = <MountFixed className="mount-icon" />;
          break;
        case 'G': // Gimballed
          mountIcon = <MountGimballed className="mount-icon" />;
          break;
        case 'T': // Turret
          mountIcon = <MountTurret className="mount-icon" />;
          break;
        default:
          mountIcon = null;
      }
    }

    if (mod.class && mod.rating) {
      displayName = `${mod.class}${mod.rating}`;
    } else if (mod.rating) {
      displayName = mod.rating;
    } else if (mod.class) {
      displayName = `${mod.class}`;
    } else {
      displayName = mod.id.toUpperCase().substring(0, 3);
    }

    return (
      <div key={mod.id}
           className={classNames}
           tabIndex={validSlot ? '0' : ''}
           data-id={mod.id}
           onClick={validSlot ? onSelect.bind(null, mod) : null}
           onKeyDown={validSlot ? this._keyDown.bind(this, onSelect.bind(null, mod)) : null}
           ref={slotItem => {
             if (slotItem) {
               this.slotItems.set(mod.id, slotItem);
             }
           }}>
        <div className="module-content">
          {mountIcon && <span className="module-mount">{mountIcon}</span>}
          <span className="module-text">{warningIcon} {displayName}</span>
        </div>
      </div>
    );
  }

  /**
   * Add named/special modules as grid elements (like Disruptor, Pacifier)
   */
  _addNamedModulesAsGrid(namedModules, list, onSelect, eligible, warning, termtip, tooltip, translate) {
    // Group named modules by size for consistent layout
    const modulesBySize = {};
    namedModules.forEach(mod => {
      const size = mod.class || 0;
      if (!modulesBySize[size]) {
        modulesBySize[size] = [];
      }
      modulesBySize[size].push(mod);
    });

    // Sort sizes in descending order (6, 5, 4, 3, 2, 1)
    const sizes = Object.keys(modulesBySize).map(Number).sort((a, b) => b - a);

    sizes.forEach(size => {
      const modulesInRow = modulesBySize[size];
      const moduleCount = modulesInRow.length;

      // Check if any module in this row is a hardpoint module
      const hasHardpointModules = modulesInRow.some(mod =>
        mod.mount || (mod.grp && (mod.grp === 'wp' || mod.grp === 'ul'))
      );

      // Use different row class based on module type
      const rowClassName = hasHardpointModules ? 'hardpoint-module-row' : 'compact-module-row';

      list.push(
        <div key={`named-size-${size}`}
             className={rowClassName}
             data-module-count={moduleCount}>
          {modulesInRow.map(mod =>
            this._createNamedModuleElement(mod, onSelect, eligible, warning, termtip, tooltip, translate)
          )}
        </div>
      );
    });
  }

  /**
   * Create a named module element (like Disruptor, Pacifier) with proper styling and mount icons
   */
  _createNamedModuleElement = (mod, onSelect, eligible, warning, termtip, tooltip, translate) => {
    if (!mod || !mod.id) {
      console.warn('Invalid module:', mod);
      return null;
    }

    let validSlot = eligible(mod);
    let isActive = this.props.m && this.props.m.id === mod.id;

    // Check if this is a hardpoint module
    const isHardpoint = mod.mount || (mod.grp && (mod.grp === 'wp' || mod.grp === 'ul'));

    let classNames = cn({
      'compact-module': !isHardpoint,
      'hardpoint-module': isHardpoint,
      'named-module': true,
      'c': validSlot,
      'disabled': !validSlot,
      'active': isActive
    });

    let warningIcon;
    if (validSlot && !isActive && warning) {
      warningIcon = warning(mod);
    }

    // Generate display name for named modules
    let displayName;
    let mountIcon = null;

    // Check if this is a hardpoint module and get mount type icon
    if (mod.mount) {
      switch (mod.mount) {
        case 'F': // Fixed
          mountIcon = <MountFixed className="mount-icon" />;
          break;
        case 'G': // Gimballed
          mountIcon = <MountGimballed className="mount-icon" />;
          break;
        case 'T': // Turret
          mountIcon = <MountTurret className="mount-icon" />;
          break;
        default:
          mountIcon = null;
      }
    }

    // For named modules, show the name (but shorter)
    if (mod.name) {
      // Shorten common long names for better fit
      let shortName = mod.name
        .replace('Fragment Cannon', 'Frag')
        .replace('Pulse Laser', 'Pulse')
        .replace('Multi-cannon', 'MC')
        .replace('Missile Rack', 'Missile');

      displayName = shortName.toUpperCase();
    } else {
      if (mod.class && mod.rating) {
        displayName = `${mod.class}${mod.rating}`;
      } else {
        displayName = mod.id.toUpperCase();
      }
    }

    return (
      <div key={mod.id}
           className={classNames}
           tabIndex={validSlot ? '0' : ''}
           data-id={mod.id}
           onClick={validSlot ? onSelect.bind(null, mod) : null}
           onKeyDown={validSlot ? this._keyDown.bind(this, onSelect.bind(null, mod)) : null}
           ref={slotItem => {
             if (slotItem) {
               this.slotItems.set(mod.id, slotItem);
             }
           }}>
        <div className="module-content">
          {mountIcon && <span className="module-mount">{mountIcon}</span>}
          <span className="module-text">{warningIcon} {displayName}</span>
        </div>
      </div>
    );
  }

  /**
   * Process modules by grouping them by main category and sub-category
   */
  _processModules(modules, list, onSelect, eligible, warning, termtip, tooltip, translate) {
    const sortedModules = modules.sort(this._sortModules);

    // Group modules by detailed sub-category
    const moduleGroups = this._groupModulesByType(sortedModules);

    // Organize into main categories and sub-categories
    const mainCategories = {
      'Shields': [],
      'Fuel': [],
      'Structural Reinforcement': [],
      'Hangars': [],
      'Lasers': [],
      'Projectiles': [],
      'Other Internal': [],
      'Other Hardpoints': []
    };

    Object.keys(moduleGroups).forEach(groupKey => {
      if (groupKey.includes('shields')) {
        mainCategories['Shields'].push({ key: groupKey, modules: moduleGroups[groupKey] });
      } else if (groupKey.includes('fuel')) {
        mainCategories['Fuel'].push({ key: groupKey, modules: moduleGroups[groupKey] });
      } else if (groupKey.includes('reinforcement')) {
        mainCategories['Structural Reinforcement'].push({ key: groupKey, modules: moduleGroups[groupKey] });
      } else if (groupKey.includes('hangars')) {
        mainCategories['Hangars'].push({ key: groupKey, modules: moduleGroups[groupKey] });
      } else if (groupKey.includes('lasers')) {
        mainCategories['Lasers'].push({ key: groupKey, modules: moduleGroups[groupKey] });
      } else if (groupKey.includes('projectiles')) {
        mainCategories['Projectiles'].push({ key: groupKey, modules: moduleGroups[groupKey] });
      } else if (groupKey.includes('internal')) {
        mainCategories['Other Internal'].push({ key: groupKey, modules: moduleGroups[groupKey] });
      } else if (groupKey.includes('hardpoint')) {
        mainCategories['Other Hardpoints'].push({ key: groupKey, modules: moduleGroups[groupKey] });
      }
    });

    // Render each main category with its sub-categories
    Object.keys(mainCategories).forEach(mainCategoryName => {
      const subCategories = mainCategories[mainCategoryName];

      if (subCategories.length > 0) {
        // Add main category header
        list.push(<div key={`main-${mainCategoryName}`} className="select-group cap">{mainCategoryName}</div>);

        // Add each sub-category
        subCategories.forEach(subCategory => {
          const { key: groupKey, modules: groupModules } = subCategory;

          // Add sub-category header
          const groupName = this._getGroupDisplayName(groupKey, translate);
          list.push(<div key={`sub-${groupKey}`} className="module-separator cap">{groupName}</div>);

          // Separate compact and named modules within this sub-group
          const compactModules = [];
          const namedModules = [];

          groupModules.forEach(mod => {
            if (this._isCompactModule(mod)) {
              compactModules.push(mod);
            } else {
              namedModules.push(mod);
            }
          });

          // Add compact modules as grid
          if (compactModules.length > 0) {
            this._addCompactModulesAsGrid(compactModules, list, onSelect, eligible, warning, termtip, tooltip, translate, groupKey);
          }

          // Add named modules
          if (namedModules.length > 0) {
            namedModules.forEach(mod => {
              this._addModuleToList(mod, list, onSelect, eligible, warning, termtip, tooltip, translate);
            });
          }
        });
      }
    });
  }

  /**
   * Add compact modules organized in rows by size
   */

  _addCompactModulesAsGrid(compactModules, list, onSelect, eligible, warning, termtip, tooltip, translate, groupKey = 'default') {
    // Check if we have a single-rating type (like all E-class cargo racks)
    const ratings = [...new Set(compactModules.map(mod => mod.rating))];
    const isSingleRatingType = ratings.length === 1;

    // Generate unique key based on module content
    const moduleIds = compactModules.map(mod => mod.id).sort().join('-');

    const gridKey = `compact-grid-${groupKey}-${moduleIds.slice(0, 30)}`; // Include group key

    if (isSingleRatingType) {
      // For single-rating types (like Cargo Racks), arrange them in one or more rows
      const maxPerRow = 6;
      const rows = [];
      for (let i = 0; i < compactModules.length; i += maxPerRow) {
        rows.push(compactModules.slice(i, i + maxPerRow));
      }

      list.push(
        <div key={gridKey} className="compact-module-grid">
          {rows.map((rowModules, rowIndex) => {
            const moduleCount = rowModules.length;

            // Check if any module in this row is a hardpoint module
            const hasHardpointModules = rowModules.some(mod =>
              mod.mount || (mod.grp && (mod.grp === 'wp' || mod.grp === 'ul'))
            );

            // Use different row class based on module type
            const rowClassName = hasHardpointModules ? 'hardpoint-module-row' : 'compact-module-row';

            return (
              <div key={`${gridKey}-row-${rowIndex}`}
                   className={rowClassName}
                   data-module-count={moduleCount}>
                {rowModules.map(mod =>
                  this._createCompactModuleElement(mod, onSelect, eligible, warning, termtip, tooltip, translate)
                )}
              </div>
            );
          })}
        </div>
      );
    } else {
      // For multi-rating types (like weapons), group by size as before
      const modulesBySize = {};
      compactModules.forEach(mod => {
        const size = mod.class || 0;
        if (!modulesBySize[size]) {
          modulesBySize[size] = [];
        }
        modulesBySize[size].push(mod);
      });

      // Sort sizes in descending order (6, 5, 4, 3, 2, 1)
      const sizes = Object.keys(modulesBySize).map(Number).sort((a, b) => b - a);

      list.push(
        <div key={gridKey} className="compact-module-grid">
          {sizes.map(size => {
            const modulesInRow = modulesBySize[size];
            const moduleCount = modulesInRow.length;

            // Check if any module in this row is a hardpoint module
            const hasHardpointModules = modulesInRow.some(mod =>
              mod.mount || (mod.grp && (mod.grp === 'wp' || mod.grp === 'ul'))
            );

            // Use different row class based on module type
            const rowClassName = hasHardpointModules ? 'hardpoint-module-row' : 'compact-module-row';

            return (
              <div key={`${gridKey}-size-${size}`}
                   className={rowClassName}
                   data-module-count={moduleCount}>
                {modulesInRow.map(mod =>
                  this._createCompactModuleElement(mod, onSelect, eligible, warning, termtip, tooltip, translate)
                )}
              </div>
            );
          })}
        </div>
      );
    }
  }

  /**
   * Add a module to the list (for named/special modules)
   */
  _addModuleToList(mod, list, onSelect, eligible, warning, termtip, tooltip, translate) {
    if (!mod || !mod.id) {
      console.warn('Invalid module:', mod);
      return;
    }

    let validSlot = eligible(mod);
    let isActive = this.props.m && this.props.m.id === mod.id;

    // Use special module styling with margins and borders
    let classNames = cn({
      'special-module': true, // Add special-module class for styling
      'c': validSlot,
      'disabled': !validSlot,
      'active': isActive
    });

    let warningIcon;
    if (validSlot && !isActive && warning) {
      warningIcon = warning(mod);
    }

    // Check if this is a hardpoint module and get mount type icon
    let mountIcon = null;
    if (mod.mount) {
      switch (mod.mount) {
        case 'F': // Fixed
          mountIcon = <MountFixed className="mount-icon" />;
          break;
        case 'G': // Gimballed
          mountIcon = <MountGimballed className="mount-icon" />;
          break;
        case 'T': // Turret
          mountIcon = <MountTurret className="mount-icon" />;
          break;
        default:
          mountIcon = null;
      }
    }

    // Generate proper display name for named modules
    let displayName;
    if (mod.name) {
      const isBulkhead = mod.grp === 'bh' || mod.grp === 'armour' ||
                        (mod.name && mod.name.toLowerCase().includes('bulkhead'));

      if (isBulkhead) {
        displayName = mod.name.toUpperCase();
      } else {
        if (mod.class && mod.rating) {
          displayName = `${mod.class}${mod.rating} ${mod.name}`.toUpperCase();
        } else {
          displayName = mod.name.toUpperCase();
        }
      }
    } else {
      if (mod.class && mod.rating) {
        displayName = `${mod.class}${mod.rating}`;
      } else {
        displayName = mod.id.toUpperCase();
      }
    }

    // Create the module element with box styling and margins
    list.push(
      <div key={mod.id}
           className={classNames}
           tabIndex={validSlot ? '0' : ''}
           data-id={mod.id}
           onClick={validSlot ? onSelect.bind(null, mod) : null}
           onKeyDown={validSlot ? this._keyDown.bind(this, onSelect.bind(null, mod)) : null}
           ref={slotItem => {
             if (slotItem) {
               this.slotItems.set(mod.id, slotItem);
             }
           }}>
        <div className="module-content">
          {mountIcon && <span className="module-mount">{mountIcon}</span>}
          <span className="module-text">{warningIcon} {displayName}</span>
        </div>
      </div>
    );
  }
  /**
   * Group modules by their type/category
   */
  _groupModulesByType(modules) {
    const groups = {};

    modules.forEach(mod => {
      let groupKey = this._getModuleGroupKey(mod);

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(mod);
    });

    return groups;
  }

  /**
   * Determine the group key for a module with proper sub-categorization
   */
  _getModuleGroupKey(mod) {
    if (!mod) return 'other';

    const grp = mod.grp || '';
    const name = (mod.name || '').toLowerCase();

    // Check if this is a hardpoint module
    const isHardpoint = mod.mount || (grp && (grp === 'wp' || grp === 'ul'));

    if (isHardpoint) {
      // Detailed hardpoint sub-categorization
      if (grp === 'pl' || grp === 'ul' || grp === 'bl') {
        if (name.includes('disruptor') || name.includes('retributor') || name.includes('cytoscrambler')) {
          return 'hardpoint-lasers-special';
        }
        if (grp === 'pl') return 'hardpoint-lasers-pulse';
        if (grp === 'ul') return 'hardpoint-lasers-burst';
        if (grp === 'bl') return 'hardpoint-lasers-beam';
        return 'hardpoint-lasers-other';
      }

      if (grp === 'mc' || grp === 'advmc' || grp === 'c' || grp === 'fc' || grp === 'pa' || grp === 'rg') {
        if (name.includes('pacifier') || name.includes('enforcer')) {
          return 'hardpoint-projectiles-special';
        }
        if (grp === 'mc' || grp === 'advmc') return 'hardpoint-projectiles-multicannon';
        if (grp === 'c') return 'hardpoint-projectiles-cannon';
        if (grp === 'fc') return 'hardpoint-projectiles-fragment';
        if (grp === 'pa') return 'hardpoint-projectiles-plasma';
        if (grp === 'rg') return 'hardpoint-projectiles-railgun';
        return 'hardpoint-projectiles-other';
      }

      if (grp === 'mr' || grp === 'amr' || grp === 'tp' || grp === 'nl') {
        return 'hardpoint-ordnance';
      }

      if (grp === 'ml' || grp === 'scl' || grp === 'sdm' || grp === 'abl') {
        return 'hardpoint-mining';
      }

      // Experimental weapons
      if (['axmc', 'axmce', 'axmr', 'axmre', 'ntp', 'rfl', 'tbrfl', 'tbsc', 'tbem', 'xs', 'sfn'].includes(grp)) {
        return 'hardpoint-experimental';
      }

      // Guardian weapons
      if (['gpc', 'ggc', 'gsc'].includes(grp)) {
        return 'hardpoint-guardian';
      }

      return 'hardpoint-other';
    } else {
      // Detailed internal sub-categorization
      if (['sg', 'bsg', 'psg', 'scb'].includes(grp)) {
        if (grp === 'sg') {
          if (name.includes('prismatic')) return 'internal-shields-prismatic';
          if (name.includes('bi-weave')) return 'internal-shields-biweave';
          return 'internal-shields-standard';
        }
        if (grp === 'bsg') return 'internal-shields-biweave';
        if (grp === 'psg') return 'internal-shields-prismatic';
        if (grp === 'scb') return 'internal-shields-cellbank';
      }

      if (['cr', 'crl'].includes(grp)) {
        return 'internal-cargo';
      }

      if (['ft', 'fs'].includes(grp)) {
        if (grp === 'ft') return 'internal-fuel-tanks';
        if (grp === 'fs') return 'internal-fuel-scoops';
      }

      if (['hr', 'mrp'].includes(grp)) {
        if (grp === 'hr') return 'internal-reinforcement-hull';
        if (grp === 'mrp') return 'internal-reinforcement-module';
      }

      if (['cc', 'fx', 'hb', 'pc', 'rpl', 'mlc'].includes(grp)) {
        return 'internal-limpets';
      }

      if (['pce', 'pci', 'pcm', 'pcq'].includes(grp)) {
        return 'internal-passengers';
      }

      if (['fh', 'pv'].includes(grp)) {
        if (grp === 'fh') return 'internal-hangars-fighter';
        if (grp === 'pv') return 'internal-hangars-srv';
      }

      // Use the original INTCAT lookup for other modules
      for (const [category, groups] of Object.entries(INTCAT)) {
        if (groups.includes(grp)) {
          return `internal-${category.replace(/\s+/g, '-')}`;
        }
      }

      return 'internal-other';
    }
  }

  /**
   * Get display name for module group with proper hierarchy
   */
  _getGroupDisplayName(groupKey, translate) {
    const groupNames = {
      // Shield sub-categories
      'internal-shields-standard': 'Shield Generators',
      'internal-shields-prismatic': 'Prismatic Shield Generators',
      'internal-shields-biweave': 'Bi-Weave Shield Generators',
      'internal-shields-cellbank': 'Shield Cell Banks',

      // Fuel sub-categories
      'internal-fuel-tanks': 'Fuel Tanks',
      'internal-fuel-scoops': 'Fuel Scoops',

      // Reinforcement sub-categories
      'internal-reinforcement-hull': 'Hull Reinforcement Packages',
      'internal-reinforcement-module': 'Module Reinforcement Packages',

      // Hangar sub-categories
      'internal-hangars-fighter': 'Fighter Hangars',
      'internal-hangars-srv': 'SRV Hangars',

      // Laser weapon sub-categories
      'hardpoint-lasers-pulse': 'Pulse Lasers',
      'hardpoint-lasers-burst': 'Burst Lasers',
      'hardpoint-lasers-beam': 'Beam Lasers',
      'hardpoint-lasers-special': 'Special Laser Weapons',
      'hardpoint-lasers-other': 'Other Lasers',

      // Projectile weapon sub-categories
      'hardpoint-projectiles-multicannon': 'Multi-Cannons',
      'hardpoint-projectiles-cannon': 'Cannons',
      'hardpoint-projectiles-fragment': 'Fragment Cannons',
      'hardpoint-projectiles-plasma': 'Plasma Accelerators',
      'hardpoint-projectiles-railgun': 'Rail Guns',
      'hardpoint-projectiles-special': 'Special Projectile Weapons',
      'hardpoint-projectiles-other': 'Other Projectiles',

      // Other categories (simplified)
      'internal-cargo': 'Cargo Racks',
      'internal-limpets': 'Limpet Controllers',
      'internal-passengers': 'Passenger Cabins',
      'internal-refineries': 'Refineries',
      'internal-fsd-interdictor': 'FSD Interdictors',
      'internal-flight-assists': 'Flight Assists',
      'internal-scanners': 'Scanners',
      'internal-experimental': 'Experimental Internal',
      'internal-weapon-stabilizers': 'Weapon Stabilizers',
      'internal-guardian': 'Guardian Technology',
      'internal-auto-field-maintenance-unit': 'Auto Field-Maintenance Units',
      'internal-other': 'Other Internal',

      'hardpoint-ordnance': 'Missiles & Torpedoes',
      'hardpoint-mining': 'Mining Equipment',
      'hardpoint-experimental': 'Experimental Weapons',
      'hardpoint-guardian': 'Guardian Weapons',
      'hardpoint-other': 'Other Hardpoints',

      'other': 'Other Modules'
    };

    return groupNames[groupKey] || groupKey.toUpperCase();
  }

  /**
   * Key down handler
   */
  _keyDown(cb, e) {
    if (e.keyCode === 13 || e.keyCode === 32) { // Enter or Space
      e.preventDefault();
      e.stopPropagation();
      cb();
    }
  }

  /**
   * Scroll to the currently fitted module
   */
  _scrollToActiveModule() {
    if (!this.props.m || !this.node) return;

    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      const activeElement = this.node.querySelector(`[data-id="${this.props.m.id}"]`);
      if (activeElement) {
        // Calculate the position to center the element in the scrollable container
        const containerHeight = this.node.clientHeight;
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.offsetHeight;

        // Center the element in the visible area
        const scrollPosition = elementTop - (containerHeight / 2) + (elementHeight / 2);

        // Smooth scroll to the position
        this.node.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    });
  }

  /**
   * Create empty slot element
   */
  _createEmptySlotElement(emptyId, m, onSelect, translate) {
    return (
      <div key={emptyId}
           className={cn('empty-slot', { 'active': !m })}
           tabIndex='0'
           data-id={emptyId}
           onClick={onSelect.bind(null, null)}
           onKeyDown={this._keyDown.bind(this, onSelect.bind(null, null))}
           ref={slotItem => {
             if (slotItem) {
               this.slotItems.set(emptyId, slotItem);
             }
           }}>
        {translate('empty')}
      </div>
    );
  }

  /**
   * Hide the diff details popup
   */
  _hideDiff() {
    if (this.node) {
      this.node.classList.remove('show-diff');
    }
  }

  /**
   * Show the search/filter input
   */
  _showSearch() {
    this.setState({ searchActive: true }, () => {
      if (this.node) {
        let input = this.node.querySelector('.module-search input');
        if (input) {
          input.focus();
        }
      }
    });
  }

  /**
   * Update state based on context changes
   */
  componentDidMount() {
    this._scrollToActiveModule(); // Scroll to the currently fitted module
  }

  /**
   * Handle component updates
   */
  componentDidUpdate(prevProps) {
    // If the fitted module changed, scroll to the new active module
    if (prevProps.m !== this.props.m) {
      this._scrollToActiveModule();
    }
  }

  /**
   * Render component
   * @return {Object} React component
   */
  render() {
    let { className } = this.props;
    let { list } = this.state;

    let classes = cn('select', className);

    return (
      <div className={classes}
           ref={node => { this.node = node; }}
           onContextMenu={stopCtxPropagation}>
        {list}
      </div>
    );
  }
}
