import React from 'react';
import TranslatedComponent from './TranslatedComponent';
import cn from 'classnames';

function getVersionPrefix() {
  const host = window.location.hostname;
  if (host.includes('alpha')) return 'Alpha v';
  if (host.includes('beta')) return 'Beta v';
  return 'v';
}

/**
 * Modal showing version announcements with links to changelog
 */
export default class ModalAnnouncements extends TranslatedComponent {

  render() {
    const { announcements } = this.props;
    const translate = this.context.language.translate;
    const prefix = getVersionPrefix();

    return (
      <div className='modal' onClick={(e) => e.stopPropagation()}>
        <h2>{translate('announcements')}</h2>
        <div className='announcement-list'>
          {announcements.slice(0, 7).map((a, i) => (
            <a key={a.id} href={`/changelog#v${a.version}`} className={cn('announcement-entry', { latest: i === 0 })}>
              <span className='announcement-version'>{prefix}{a.version}</span>
              <span className='announcement-text'>{a.text}</span>
            </a>
          ))}
        </div>
        <button className='r dismiss cap' onClick={this.context.hideModal}>{translate('close')}</button>
      </div>
    );
  }
}
