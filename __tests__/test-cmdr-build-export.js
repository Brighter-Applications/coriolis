/**
 * cmdr.coriolis.io build sync and export API (EDCD/coriolis#864):
 *  - synced builds carry their SLEF and detailed JSON exports
 *  - deleting a synced build removes it from the server
 *  - the export modal shows the API links only for synced, saved builds
 */
import React from 'react';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import { AppContext } from '../src/app/AppContext';
import { getLanguage } from '../src/app/i18n/Language';
import { Ships } from 'coriolis-data/dist';
import Ship from '../src/app/shipyard/Ship';
import ModalExport from '../src/app/components/ModalExport';
import { syncSingleBuild, deleteSyncedBuild, buildExports } from '../src/app/utils/BuildSync';

const LINK = { host: 'https://cmdr.example', apiKey: 'abcdEFGH12345678' };

function stockCode(shipId) {
  const ship = new Ship(shipId, Ships[shipId].properties, Ships[shipId].slots);
  ship.buildWith(Ships[shipId].defaults);
  return ship.toString();
}

function mockFetch(responseBody) {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(responseBody) }));
  return global.fetch;
}

// Let pending fetch promise chains settle
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

afterEach(() => {
  cleanup();
  delete global.fetch;
});

describe('Build sync exports', function() {
  it('generates SLEF and detailed JSON for a build', function() {
    const { slef, json } = buildExports('anaconda', 'Test Build', stockCode('anaconda'));
    expect(Array.isArray(slef)).toBe(true);
    expect(slef[0].data.Ship).toBe('anaconda');
    expect(slef[0].data.Modules.length).toBeGreaterThan(0);
    expect(json.name).toBe('Test Build');
  });

  it('returns no exports for an unknown ship', function() {
    expect(buildExports('not_a_ship', 'x', 'abc')).toEqual({});
  });

  it('sends the exports with the synced build', async function() {
    const fetch = mockFetch({ ok: true, created: true, id: 1 });
    const code = stockCode('anaconda');
    syncSingleBuild(LINK, 'anaconda', 'Test Build', code);
    await flush();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('https://cmdr.example/api/builds/');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({ shipType: 'anaconda', buildName: 'Test Build', code });
    expect(body.slef[0].data.Ship).toBe('anaconda');
    expect(body.json.name).toBe('Test Build');
  });

  it('deletes a synced build by ship and name, escaping the name', async function() {
    const fetch = mockFetch({ ok: true, deleted: 1 });
    deleteSyncedBuild(LINK, 'anaconda', 'PvE & Mining #2');
    await flush();

    const [url, opts] = fetch.mock.calls[0];
    expect(opts.method).toBe('DELETE');
    expect(opts.headers['X-Api-Key']).toBe(LINK.apiKey);
    expect(url).toBe('https://cmdr.example/api/builds/?shipType=anaconda&buildName=PvE%20%26%20Mining%20%232');
  });
});

describe('Export modal cmdr.coriolis.io API links', function() {
  const mockContext = {
    language: getLanguage('en'),
    sizeRatio: 1,
    openMenu: jest.fn(),
    closeMenu: jest.fn(),
    showModal: jest.fn(),
    hideModal: jest.fn(),
    tooltip: jest.fn(),
    termtip: jest.fn(),
    onWindowResize: jest.fn()
  };
  const formats = [{ name: 'JSON', data: { a: 1 } }, { name: 'SLEF', data: [{ b: 2 }] }];
  const cmdrBuild = { link: LINK, shipId: 'anaconda', buildName: 'Test Build' };

  function renderModal(props) {
    let result;
    act(() => {
      result = render(
        <AppContext.Provider value={mockContext}>
          <ModalExport formats={formats} {...props} />
        </AppContext.Provider>
      );
    });
    return result.container;
  }

  it('shows no API section when the build is not synced', function() {
    global.fetch = jest.fn();
    const container = renderModal({});
    expect(container.querySelector('.cmdr-export-api')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('shows the export URLs and a bearer token example for a synced build', async function() {
    mockFetch({ builds: [
      { shipType: 'anaconda', buildName: 'Other', exportUrls: { slef: 'https://cmdr.example/api/builds/1/slef/' } },
      { shipType: 'anaconda', buildName: 'Test Build', exportUrls: {
        slef: 'https://cmdr.example/api/builds/7/slef/',
        json: 'https://cmdr.example/api/builds/7/json/'
      } }
    ] });
    const container = renderModal({ cmdrBuild });

    await waitFor(() => expect(container.querySelectorAll('.cmdr-export-url').length).toBe(2));
    const urls = Array.from(container.querySelectorAll('.cmdr-export-url')).map(i => i.value);
    expect(urls).toEqual(['https://cmdr.example/api/builds/7/slef/', 'https://cmdr.example/api/builds/7/json/']);
    const example = container.querySelector('.cmdr-export-api code').textContent;
    expect(example).toBe('curl -H "Authorization: Bearer YOUR_API_KEY" https://cmdr.example/api/builds/7/slef/');
    // The real API key is never shown
    expect(container.textContent).not.toContain(LINK.apiKey);
  });

  it('asks the user to save when the build has no stored exports yet', async function() {
    mockFetch({ builds: [{ shipType: 'anaconda', buildName: 'Test Build', exportUrls: {} }] });
    const container = renderModal({ cmdrBuild });
    await waitFor(() => expect(container.querySelector('.cmdr-export-api').textContent).toContain('Save the build'));
    expect(container.querySelector('.cmdr-export-url')).toBeNull();
  });

  it('reports when cmdr.coriolis.io cannot be reached', async function() {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline')));
    const container = renderModal({ cmdrBuild });
    await waitFor(() => expect(container.querySelector('.cmdr-export-api .warning')).not.toBeNull());
  });
});
