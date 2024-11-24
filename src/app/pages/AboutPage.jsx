import React from 'react';
import Page from './Page';
import { CoriolisLogo, GitHub } from '../components/SvgIcons';

/**
 * About Page
 */
export default class AboutPage extends Page {
  /**
   * Constructor
   * @param  {Object} props   React Component properties
   */
  constructor(props) {
    super(props);
    this.state = {
      title: 'About Coriolis'
    };
  }

  /**
   * Render the Page
   * @return {React.Component} The page contents
   */
  renderPage() {
    return (
      <div
        className={'page'}
        style={{ textAlign: 'left', maxWidth: 800, margin: '0 auto' }}
      >
        <h1>
          <CoriolisLogo style={{ marginRight: '0.4em' }} className="xl" />
          <span className="warning">Coriolis EDCD Edition</span>
        </h1>

        <p>
          This is now the only active version of the Coriolis project. The original author has handed over the maintenance of the project to the {' '}
          <a href="http://edcd.github.io/">EDCD community</a>.
        </p>
        <h3>Expectations</h3>
        <p>
          Although every attempt is made to update the data as soon as possible, following the release of new modules and ships, there may be a delay, of up-to a few days, before the data is available. Wherever possible, the current maintainers aim to keep this delay to a minimum. Please be aware that the project maintainers are volunteers and have real lives to attend to, so please be patient. If you would like to help with the maintenance of the project, please see the link to the EDCD Discord Server below, where you can get involved.
        </p>
        <p>
          There are, some missing modules from the time where the project was essentially not being maintained. These modules are gradually being added to the Coriolis database as and when the maintainers have the time to do so.
        </p>
        <p>
          Please check the {' '} <a href="https://github.com/EDCD/coriolis/issues/" target="_blank" >Github Issues List</a> for any specific modules you cannot find and see if there is an open request for them. If not, please feel free to open a new issue, however, please note that there is an existing issue open for the addition of pre-engineered modules, so please do not open a new issue for these.
        </p>
        <h3>Donations</h3>
        <p>
          If you would like to donate to the project, in order to help with the costs of hosting and maintainence, please see the link to the {' '}
          <a href="https://github.com/Brighter-Applications/coriolis" target="_blank">Current Maintainers version of the Git Repository</a> and use the 'Sponsor' button at the top of the page.
        </p>
        <h3>History</h3>
        <p>
          The Coriolis project was inspired by 'E:D Shipyard' (Now Defunct) and, of course,{' '}
          <a href="http://www.elitedangerous.com" target="_blank">
            Elite Dangerous
          </a>
          . The ultimate goal of Coriolis is to provide rich features to support
          in-game play and planning while engaging the E:D community to support
          its development.
        </p>
        <p>
          Coriolis was created using assets and imagery from Elite: Dangerous,
          with the permission of Frontier Developments plc, for non-commercial
          purposes. It is not endorsed by nor reflects the views or opinions of
          Frontier Developments. A number of assets were sourced from{' '}
          <a href="http://edassets.org" target="_blank">
            ED Assets
          </a>
        </p>

        <a
          style={{ display: 'block', textDecoration: 'none' }}
          href="https://github.com/EDCD/coriolis"
          target="_blank"
          title="Coriolis Github Project"
        >
          <GitHub style={{ margin: '0.4em' }} className="l fg xl" />
          <h2 style={{ margin: 0, textDecoration: 'none' }}>Github</h2>
          github.com/EDCD/coriolis
        </a>

        <p>
          Coriolis is an open source project. Checkout the list of upcoming
          features and to-do list on github. Any and all contributions and
          feedback are welcome. If you encounter any bugs please report them and
          provide as much detail as possible.
        </p>

        <h3>Chat</h3>
        <p>
          You can chat to us on our{' '}
          <a href="https://discord.gg/0uwCh6R62aPRjk9w" target="_blank">
            EDCD Discord server
          </a>
          .
        </p>
      </div>
    );
  }
}
