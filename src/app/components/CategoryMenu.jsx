import React from 'react';
import cn from 'classnames';
import TranslatedComponent from './TranslatedComponent';
import { stopCtxPropagation } from '../utils/UtilityFunctions';

/**
 * An overlay menu that shows module categories for a slot
 */
export default class CategoryMenu extends TranslatedComponent {
  /**
   * Render the list of categories
   * @return {React.Component} List
   */
  render() {
    const translate = this.context.language.translate;
    const { categories, onSelect, onClose } = this.props;

    return (
      <div
        className={cn('select', this.props.className)}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={stopCtxPropagation}
      >
        <div className='select-header cap'>{translate('select category')}</div>
        <div className='select-list-container'>
          <ul className='select-list'>
            {Object.keys(categories).sort().map(category => (
              <li key={category} className='lc' onClick={() => onSelect(category)}>
                <div className='l cap'>{translate(category)}</div>
              </li>
            ))}
          </ul>
        </div>
        <div className='close' onClick={onClose}>&times;</div>
      </div>
    );
  }
}