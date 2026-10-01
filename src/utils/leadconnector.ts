export interface LeadConnectorEnvironment {
  PUBLIC_LEADCONNECTOR_ENABLED?: string;
  PUBLIC_LEADCONNECTOR_EMBED?: string;
  PUBLIC_LEADCONNECTOR_LOCATION_ID?: string;
  PUBLIC_LEADCONNECTOR_WIDGET_ID?: string;
}

export interface LeadConnectorConfig {
  enabled: boolean;
  embed?: 'legacy' | 'gtm';
  locationId: string;
  widgetId: string;
  warning?: string;
}

const publicRoutes = new Set([
  '/',
  '/services',
  '/gallery',
  '/process',
  '/about',
  '/contact',
  '/quote',
  '/service-areas',
  '/privacy',
  '/terms',
]);

/** Fail closed for future private documents, diagnostics, and unknown routes. */
export function isLeadConnectorPublicRoute(value: string): boolean {
  try {
    if (value.includes('\\') || /%2f|%5c/i.test(value)) return false;
    const pathname = decodeURIComponent(new URL(value, 'https://prvn.invalid').pathname).replace(/\/+$/, '') || '/';
    return publicRoutes.has(pathname) || /^\/(services|service-areas)\/[a-z0-9-]+$/.test(pathname);
  } catch {
    return false;
  }
}

export function resolveLeadConnectorConfig(env: LeadConnectorEnvironment): LeadConnectorConfig {
  const config: LeadConnectorConfig = {
    enabled: false,
    embed:
      env.PUBLIC_LEADCONNECTOR_EMBED === 'legacy' || env.PUBLIC_LEADCONNECTOR_EMBED === 'gtm'
        ? env.PUBLIC_LEADCONNECTOR_EMBED
        : undefined,
    locationId: env.PUBLIC_LEADCONNECTOR_LOCATION_ID || '',
    widgetId: env.PUBLIC_LEADCONNECTOR_WIDGET_ID || '',
  };
  if (env.PUBLIC_LEADCONNECTOR_ENABLED !== 'true') return config;
  const validId = (id: string) => /^[A-Za-z0-9_-]+$/.test(id);
  if (!config.embed || !validId(config.locationId) || (config.embed === 'gtm' && !validId(config.widgetId))) {
    config.warning =
      'PRVN chat is disabled: supply the exact HighLevel Get Code embed format and its required public identifiers.';
    return config;
  }
  config.enabled = true;
  return config;
}
