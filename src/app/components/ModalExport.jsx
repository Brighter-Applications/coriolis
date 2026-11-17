import React from 'react';
import PropTypes from 'prop-types';
import TranslatedComponent from './TranslatedComponent';
import { fetchBuilds } from '../utils/CmdrApi';

/**
 * Export Modal with support for multiple formats
 */
export default class ModalExport extends TranslatedComponent {

  static propTypes = {
    title: PropTypes.string,
    generator: PropTypes.func,
    data: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array]),
    formats: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      data: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.array]).isRequired
    })),
    // Saved build synced to cmdr.coriolis.io; when set, the export API links are shown
    cmdrBuild: PropTypes.shape({
      link: PropTypes.object.isRequired,
      shipId: PropTypes.string.isRequired,
      buildName: PropTypes.string.isRequired
    })
  };

  /**
   * Constructor
   * @param  {Object} props   React Component properties
   */
  constructor(props) {
    super(props);

    let exportJson;
    let formats = [];

    if (props.formats) {
      // Multiple formats provided
      formats = props.formats;
      exportJson = typeof formats[0].data === 'string' ? formats[0].data : JSON.stringify(formats[0].data, null, 2);
    } else if (props.generator) {
      exportJson = 'Generating...';
    } else if(typeof props.data == 'string') {
      exportJson = props.data;
    } else {
      exportJson = JSON.stringify(this.props.data, null, 2);
    }

    this.state = {
      exportJson,
      formats,
      selectedFormat: 0,
      // cmdr.coriolis.io export API: null (not offered), 'loading', 'ready', 'missing' or 'error'
      cmdrStatus: props.cmdrBuild ? 'loading' : null,
      cmdrUrls: {}
    };
  }

  /**
   * Look up the synced build on cmdr.coriolis.io to get its export API URLs
   */
  _loadCmdrUrls() {
    const { link, shipId, buildName } = this.props.cmdrBuild;
    fetchBuilds(link).then(resp => {
      if (!this._mounted) return;
      const build = (resp.builds || []).find(b => b.shipType === shipId && b.buildName === buildName);
      const urls = build && build.exportUrls ? build.exportUrls : {};
      this.setState({ cmdrStatus: Object.keys(urls).length ? 'ready' : 'missing', cmdrUrls: urls });
    }).catch(err => {
      console.warn('[ModalExport] could not fetch cmdr.coriolis.io builds', err);
      if (this._mounted) this.setState({ cmdrStatus: 'error' });
    });
  }

  /**
   * Render the cmdr.coriolis.io export API section
   * @param  {Function} translate Translate function
   * @return {React.Component}    Section, or null if not offered
   */
  _renderCmdrApi(translate) {
    const { cmdrStatus, cmdrUrls } = this.state;
    if (!cmdrStatus) return null;
    let body;
    if (cmdrStatus === 'loading') {
      body = <div>{translate('PHRASE_CMDR_EXPORT_LOADING')}</div>;
    } else if (cmdrStatus === 'error') {
      body = <div className='warning'>{translate('PHRASE_CMDR_EXPORT_ERROR')}</div>;
    } else if (cmdrStatus === 'missing') {
      body = <div>{translate('PHRASE_CMDR_EXPORT_MISSING')}</div>;
    } else {
      const exampleUrl = cmdrUrls.slef || cmdrUrls.json;
      body = <div>
        <div>{translate('PHRASE_CMDR_EXPORT_DESC')}</div>
        {['slef', 'json'].filter(fmt => cmdrUrls[fmt]).map(fmt => (
          <div key={fmt} style={{ marginTop: '0.3em' }}>
            <span className='cap' style={{ display: 'inline-block', width: '3.5em' }}>{fmt.toUpperCase()}</span>
            <input className='cmdr-export-url' type='text' readOnly value={cmdrUrls[fmt]} onFocus={e => e.target.select()} style={{ width: '80%' }} />
          </div>
        ))}
        <div style={{ marginTop: '0.3em' }}>
          {translate('example')}: <code>{`curl -H "Authorization: Bearer YOUR_API_KEY" ${exampleUrl}`}</code>
        </div>
      </div>;
    }
    return <div className='cmdr-export-api' style={{ marginTop: '0.8em' }}>
      <h3>{translate('PHRASE_CMDR_EXPORT_TITLE')}</h3>
      {body}
    </div>;
  }

  /**
   * If generator is provided, execute on mount
   */
  UNSAFE_componentWillMount() {
    if (this.props.generator) {
      this.props.generator((str) => this.setState({ exportJson: str }));
    }
  }

  /**
   * Focus on textarea and select all
   */
  componentDidMount() {
    this._mounted = true;
    if (this.exportField) {
      this.exportField.focus();
      this.exportField.select();
    }
    if (this.props.cmdrBuild) {
      this._loadCmdrUrls();
    }
  }

  /**
   * Stop pending cmdr.coriolis.io lookups from updating an unmounted modal
   */
  componentWillUnmount() {
    this._mounted = false;
  }

  /**
   * Handle format selection change
   * @param {number} index Format index
   */
  _selectFormat(index) {
    const format = this.state.formats[index];
    const exportJson = typeof format.data === 'string' ? format.data : JSON.stringify(format.data, null, 2);
    this.setState({ selectedFormat: index, exportJson }, () => {
      if (this.exportField) {
        this.exportField.focus();
        this.exportField.select();
      }
    });
  }

  /**
   * Render the modal
   * @return {React.Component} Modal Content
   */
  render() {
    let translate = this.context.language.translate;
    let description;

    if (this.props.description) {
      description = <div>{translate(this.props.description)}</div>;
    }

    let formatButtons = null;
    if (this.state.formats.length > 1) {
      formatButtons = (
        <div className='format-selector' style={{ marginBottom: '0.5em' }}>
          {this.state.formats.map((format, index) => (
            <button
              key={index}
              className={this.state.selectedFormat === index ? 'selected' : ''}
              onClick={() => this._selectFormat(index)}
              style={{
                marginRight: '0.5em',
                fontWeight: this.state.selectedFormat === index ? 'bold' : 'normal'
              }}
            >
              {format.name}
            </button>
          ))}
        </div>
      );
    }

    return <div className='modal' onClick={ (e) => e.stopPropagation() }>
      <h2>{translate(this.props.title || 'Export')}</h2>
      {description}
      {formatButtons}
      <div>
        <textarea className='cb json' ref={node => this.exportField = node} readOnly value={this.state.exportJson} />
      </div>
      {this._renderCmdrApi(translate)}
      <button className='r dismiss cap' onClick={this.context.hideModal}>{translate('close')}</button>
    </div>;
  }
}
