import { appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const projectName = 'prvn-epoxy-solutions-site';
const publicKeys = [
  'PUBLIC_LEADCONNECTOR_ENABLED',
  'PUBLIC_LEADCONNECTOR_EMBED',
  'PUBLIC_LEADCONNECTOR_LOCATION_ID',
  'PUBLIC_LEADCONNECTOR_WIDGET_ID',
];

// Only the four public chat settings are read. Never export other Pages bindings.
export function readPublicChatConfig(project, environment) {
  if (project?.name !== projectName) {
    throw new Error('Cloudflare returned an unexpected Pages project.');
  }
  const deployment = project.deployment_configs?.[environment];
  if (!deployment || typeof deployment !== 'object') {
    throw new Error(`The PRVN Pages ${environment} configuration is unavailable.`);
  }
  const bindings = deployment.env_vars ?? {};
  const values = Object.fromEntries(
    publicKeys.map((key) => {
      const binding = bindings[key];
      const value = binding?.type === 'plain_text' && typeof binding.value === 'string' ? binding.value : '';
      return [key, value];
    })
  );
  const validId = (value) => /^[A-Za-z0-9_-]+$/.test(value);
  const embed = ['legacy', 'gtm'].includes(values.PUBLIC_LEADCONNECTOR_EMBED) ? values.PUBLIC_LEADCONNECTOR_EMBED : '';
  const locationId = validId(values.PUBLIC_LEADCONNECTOR_LOCATION_ID) ? values.PUBLIC_LEADCONNECTOR_LOCATION_ID : '';
  const widgetId = validId(values.PUBLIC_LEADCONNECTOR_WIDGET_ID) ? values.PUBLIC_LEADCONNECTOR_WIDGET_ID : '';
  const requested = values.PUBLIC_LEADCONNECTOR_ENABLED === 'true';
  const enabled = requested && Boolean(embed && locationId && (embed !== 'gtm' || widgetId));

  return {
    PUBLIC_LEADCONNECTOR_ENABLED: String(enabled),
    PUBLIC_LEADCONNECTOR_EMBED: embed,
    PUBLIC_LEADCONNECTOR_LOCATION_ID: locationId,
    PUBLIC_LEADCONNECTOR_WIDGET_ID: widgetId,
  };
}

export async function loadPagesChatConfig(environment, env = process.env, fetcher = fetch) {
  if (!['production', 'preview'].includes(environment)) {
    throw new Error('Specify exactly one Pages environment: production or preview.');
  }
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !/^[a-fA-F0-9]{32}$/.test(accountId) || !token) {
    throw new Error('Valid Cloudflare deployment credentials are required to inspect PRVN Pages.');
  }
  let response;
  try {
    response = await fetcher(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30_000),
      }
    );
  } catch {
    throw new Error('Could not read PRVN Pages configuration from Cloudflare.');
  }
  if (!response.ok) {
    throw new Error(`Cloudflare PRVN Pages configuration read failed (HTTP ${response.status}).`);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Cloudflare returned an unreadable PRVN Pages configuration response.');
  }
  if (payload.success !== true || !payload.result) {
    throw new Error('Cloudflare did not confirm the PRVN Pages configuration read.');
  }
  return readPublicChatConfig(payload.result, environment);
}

async function main() {
  if (process.argv.length !== 3) {
    throw new Error('Usage: node scripts/load-leadconnector-pages-config.mjs production|preview');
  }
  const environment = process.argv[2];
  const config = await loadPagesChatConfig(environment);
  if (!process.env.GITHUB_ENV) {
    throw new Error('GITHUB_ENV is required to pass inspected public chat settings to the build.');
  }
  await appendFile(process.env.GITHUB_ENV, publicKeys.map((key) => `${key}=${config[key]}\n`).join(''), 'utf8');
  // Logs disclose only status, never identifiers, other bindings, or API response bodies.
  console.log(
    `PRVN Pages ${environment} chat configuration inspected: enabled=${config.PUBLIC_LEADCONNECTOR_ENABLED}, embed=${config.PUBLIC_LEADCONNECTOR_EMBED || 'unset'}, location=${config.PUBLIC_LEADCONNECTOR_LOCATION_ID ? 'present' : 'missing or unreadable'}, widget=${config.PUBLIC_LEADCONNECTOR_WIDGET_ID ? 'present' : 'missing or unreadable'}.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
