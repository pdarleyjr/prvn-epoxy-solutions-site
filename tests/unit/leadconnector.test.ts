import { describe, expect, it } from 'vitest';

import { isLeadConnectorPublicRoute, resolveLeadConnectorConfig } from '../../src/utils/leadconnector';

describe('LeadConnector configuration', () => {
  it('renders nothing when disabled, even if identifiers exist', () => {
    for (const enabled of [undefined, '', 'false']) {
      const result = resolveLeadConnectorConfig({
        PUBLIC_LEADCONNECTOR_ENABLED: enabled,
        PUBLIC_LEADCONNECTOR_EMBED: 'gtm',
        PUBLIC_LEADCONNECTOR_LOCATION_ID: 'local-test-location-id',
        PUBLIC_LEADCONNECTOR_WIDGET_ID: 'local-test-widget-id',
      });
      expect(result.enabled).toBe(false);
      expect(result.warning).toBeUndefined();
    }
  });

  it('preserves the supplied legacy format without requiring a widget ID', () => {
    expect(
      resolveLeadConnectorConfig({
        PUBLIC_LEADCONNECTOR_ENABLED: 'true',
        PUBLIC_LEADCONNECTOR_EMBED: 'legacy',
        PUBLIC_LEADCONNECTOR_LOCATION_ID: 'local-test-location-id',
      })
    ).toMatchObject({ enabled: true, embed: 'legacy', locationId: 'local-test-location-id' });
  });

  it('preserves both identifiers for the supplied GTM format', () => {
    expect(
      resolveLeadConnectorConfig({
        PUBLIC_LEADCONNECTOR_ENABLED: 'true',
        PUBLIC_LEADCONNECTOR_EMBED: 'gtm',
        PUBLIC_LEADCONNECTOR_LOCATION_ID: 'local-test-location-id',
        PUBLIC_LEADCONNECTOR_WIDGET_ID: 'local-test-widget-id',
      })
    ).toMatchObject({
      enabled: true,
      embed: 'gtm',
      locationId: 'local-test-location-id',
      widgetId: 'local-test-widget-id',
    });
  });

  it('fails closed when enabled without an explicit format or its required identifiers', () => {
    const incompleteConfigurations = [
      {},
      { PUBLIC_LEADCONNECTOR_LOCATION_ID: 'local-test-location-id' },
      { PUBLIC_LEADCONNECTOR_EMBED: 'legacy' },
      { PUBLIC_LEADCONNECTOR_EMBED: 'gtm', PUBLIC_LEADCONNECTOR_LOCATION_ID: 'local-test-location-id' },
      { PUBLIC_LEADCONNECTOR_EMBED: 'gtm', PUBLIC_LEADCONNECTOR_WIDGET_ID: 'local-test-widget-id' },
    ];

    for (const configuration of incompleteConfigurations) {
      const result = resolveLeadConnectorConfig({ PUBLIC_LEADCONNECTOR_ENABLED: 'true', ...configuration });
      expect(result.enabled).toBe(false);
      expect(result.warning).toEqual(expect.any(String));
    }
  });

  it('rejects values that cannot be public widget identifiers', () => {
    for (const invalidId of ['<script>', 'https://example.com', 'token with spaces', 'id"injected', '']) {
      const result = resolveLeadConnectorConfig({
        PUBLIC_LEADCONNECTOR_ENABLED: 'true',
        PUBLIC_LEADCONNECTOR_EMBED: 'gtm',
        PUBLIC_LEADCONNECTOR_LOCATION_ID: invalidId,
        PUBLIC_LEADCONNECTOR_WIDGET_ID: 'local-test-widget-id',
      });
      expect(result.enabled).toBe(false);
      expect(result.warning).toEqual(expect.any(String));
    }
  });
});

describe('LeadConnector public route policy', () => {
  it.each([
    '/',
    '/services',
    '/services/',
    '/services/metallic-epoxy',
    '/gallery',
    '/process',
    '/about',
    '/contact',
    '/quote?finish=metallic#project',
    '/service-areas',
    '/service-areas/confirmed-city',
    '/privacy',
    '/terms',
  ])('allows customer-facing route %s', (route) => {
    expect(isLeadConnectorPublicRoute(route)).toBe(true);
  });

  it.each([
    '/admin',
    '/admin/',
    '/admin/login',
    '/admin/estimates',
    '/admin/estimate-builder',
    '/admin/settings',
    '/ADMIN/login',
    '/api/quote',
    '/estimate/private-share',
    '/estimates/customer-document',
    '/print/estimate',
    '/pdf/estimate',
    '/diagnostics',
    '/test',
    '/404',
    '/unknown',
    '/services/../admin',
    '/services/%2e%2e/admin',
    '/services%2fadmin',
    '/services%5cadmin',
    '/services\\admin',
    '/services/%broken',
  ])('excludes private, nonpublic, and ambiguous route %s', (route) => {
    expect(isLeadConnectorPublicRoute(route)).toBe(false);
  });
});
