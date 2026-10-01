import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadPagesChatConfig, readPublicChatConfig } from '../../scripts/load-leadconnector-pages-config.mjs';

const projectName = 'prvn-epoxy-solutions-site';
const publicKeys = [
  'PUBLIC_LEADCONNECTOR_ENABLED',
  'PUBLIC_LEADCONNECTOR_EMBED',
  'PUBLIC_LEADCONNECTOR_LOCATION_ID',
  'PUBLIC_LEADCONNECTOR_WIDGET_ID',
];
const fictionalCredentials = {
  CLOUDFLARE_ACCOUNT_ID: '00000000000000000000000000000000',
  CLOUDFLARE_API_TOKEN: 'fictional-test-token-not-a-credential',
};
const emptyConfig = {
  PUBLIC_LEADCONNECTOR_ENABLED: 'false',
  PUBLIC_LEADCONNECTOR_EMBED: '',
  PUBLIC_LEADCONNECTOR_LOCATION_ID: '',
  PUBLIC_LEADCONNECTOR_WIDGET_ID: '',
};
const plaintext = (value: string) => ({ type: 'plain_text', value });
const enabledBindings = () => ({
  PUBLIC_LEADCONNECTOR_ENABLED: plaintext('true'),
  PUBLIC_LEADCONNECTOR_EMBED: plaintext('gtm'),
  PUBLIC_LEADCONNECTOR_LOCATION_ID: plaintext('fictional-location-id'),
  PUBLIC_LEADCONNECTOR_WIDGET_ID: plaintext('fictional-widget-id'),
});
const project = (production = {}, preview = {}) => ({
  name: projectName,
  deployment_configs: {
    production: { env_vars: production },
    preview: { env_vars: preview },
  },
});

afterEach(() => vi.restoreAllMocks());

describe('Pages chat configuration export security', () => {
  it('reads only the four allowlisted public settings without accessing unrelated secrets', () => {
    const bindings = enabledBindings();
    Object.defineProperty(bindings, 'CRM_API_TOKEN', {
      get() {
        throw new Error('An unrelated secret binding was accessed');
      },
    });
    Object.defineProperty(bindings, 'PUBLIC_UNRELATED_SETTING', {
      get() {
        throw new Error('An unrelated public binding was accessed');
      },
    });
    const config = readPublicChatConfig(project(bindings), 'production');
    expect(Object.keys(config)).toEqual(publicKeys);
    expect(config).toEqual({
      PUBLIC_LEADCONNECTOR_ENABLED: 'true',
      PUBLIC_LEADCONNECTOR_EMBED: 'gtm',
      PUBLIC_LEADCONNECTOR_LOCATION_ID: 'fictional-location-id',
      PUBLIC_LEADCONNECTOR_WIDGET_ID: 'fictional-widget-id',
    });
  });

  it.each(publicKeys)('never reads a secret_text value stored under %s', (key) => {
    const bindings = {
      ...enabledBindings(),
      [key]: {
        type: 'secret_text',
        get value() {
          throw new Error('A private value was accessed');
        },
      },
    };
    const config = readPublicChatConfig(project(bindings), 'production');
    expect(config.PUBLIC_LEADCONNECTOR_ENABLED).toBe('false');
    expect(config[key]).toBe(key === 'PUBLIC_LEADCONNECTOR_ENABLED' ? 'false' : '');
    expect(Object.keys(config)).toEqual(publicKeys);
  });

  it.each(publicKeys)('fails closed for newline injection in %s', (key) => {
    const bindings = { ...enabledBindings(), [key]: plaintext('valid\nNODE_OPTIONS=untrusted') };
    const config = readPublicChatConfig(project(bindings), 'production');
    expect(config.PUBLIC_LEADCONNECTOR_ENABLED).toBe('false');
    expect(config[key]).toBe(key === 'PUBLIC_LEADCONNECTOR_ENABLED' ? 'false' : '');
    for (const value of Object.values(config)) expect(value).not.toMatch(/[\r\n]/);
  });

  it('exports explicit disabled and blank defaults when configuration is absent', () => {
    expect(readPublicChatConfig(project(), 'production')).toEqual(emptyConfig);
  });

  it('selects production and preview without copying settings from the other environment', () => {
    const production = enabledBindings();
    const preview = {
      PUBLIC_LEADCONNECTOR_ENABLED: plaintext('true'),
      PUBLIC_LEADCONNECTOR_EMBED: plaintext('legacy'),
      PUBLIC_LEADCONNECTOR_LOCATION_ID: plaintext('fictional-preview-location'),
    };
    const configuredProject = project(production, preview);
    expect(readPublicChatConfig(configuredProject, 'production')).toMatchObject({
      PUBLIC_LEADCONNECTOR_EMBED: 'gtm',
      PUBLIC_LEADCONNECTOR_LOCATION_ID: 'fictional-location-id',
      PUBLIC_LEADCONNECTOR_WIDGET_ID: 'fictional-widget-id',
    });
    expect(readPublicChatConfig(configuredProject, 'preview')).toEqual({
      PUBLIC_LEADCONNECTOR_ENABLED: 'true',
      PUBLIC_LEADCONNECTOR_EMBED: 'legacy',
      PUBLIC_LEADCONNECTOR_LOCATION_ID: 'fictional-preview-location',
      PUBLIC_LEADCONNECTOR_WIDGET_ID: '',
    });
  });

  it('rejects a returned project outside the existing PRVN resource', () => {
    expect(() => readPublicChatConfig({ ...project(), name: 'fictional-other-project' }, 'production')).toThrow(
      'Cloudflare returned an unexpected Pages project.'
    );
  });

  it('rejects missing selected deployment configuration rather than falling back to production', () => {
    expect(() =>
      readPublicChatConfig({ name: projectName, deployment_configs: { production: {} } }, 'preview')
    ).toThrow('The PRVN Pages preview configuration is unavailable.');
  });
});

describe('Pages configuration API failure handling', () => {
  it('requests only the fixed PRVN project and forwards the explicit environment selection', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ success: true, result: project(enabledBindings()) }));
    expect(await loadPagesChatConfig('preview', fictionalCredentials, fetcher)).toEqual(emptyConfig);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      `https://api.cloudflare.com/client/v4/accounts/${fictionalCredentials.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}`,
      {
        headers: { Authorization: `Bearer ${fictionalCredentials.CLOUDFLARE_API_TOKEN}` },
        signal: expect.any(AbortSignal),
      }
    );
  });

  it('stops on HTTP 401 without exposing the token or reading an error response body', async () => {
    const response = new Response('fictional-private-response-body', { status: 401 });
    const readBody = vi.spyOn(response, 'json');
    const log = vi.spyOn(console, 'log');
    const errorLog = vi.spyOn(console, 'error');
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(loadPagesChatConfig('production', fictionalCredentials, fetcher)).rejects.toMatchObject({
      message: 'Cloudflare PRVN Pages configuration read failed (HTTP 401).',
    });
    expect(readBody).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('stops on a network error with a fixed message that excludes token and response details', async () => {
    const log = vi.spyOn(console, 'log');
    const errorLog = vi.spyOn(console, 'error');
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error(`${fictionalCredentials.CLOUDFLARE_API_TOKEN}: fictional-private-response-body`));
    await expect(loadPagesChatConfig('production', fictionalCredentials, fetcher)).rejects.toMatchObject({
      message: 'Could not read PRVN Pages configuration from Cloudflare.',
    });
    expect(log).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('does not relay API error objects from an unsuccessful JSON response', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ success: false, errors: [{ message: fictionalCredentials.CLOUDFLARE_API_TOKEN }] })
      );
    await expect(loadPagesChatConfig('production', fictionalCredentials, fetcher)).rejects.toMatchObject({
      message: 'Cloudflare did not confirm the PRVN Pages configuration read.',
    });
  });
});
