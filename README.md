# PRVN Epoxy Solutions Site

Standalone AstroWind/Astro/Tailwind site for PRVN Epoxy Solutions, deployed with Cloudflare Pages and a Pages Function quote endpoint.

## Local development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run check
npm run build
```

## Cloudflare Pages

- Build command: `npm run build`
- Build output: `dist`
- Production branch: `main`
- Functions directory: `functions`
- Pages project: `prvn-epoxy-solutions-site`

The first production deployment was created with Wrangler direct upload. GitHub-driven deploys are prepared in `.github/workflows/actions.yaml`; add these repository secrets to enable automatic deploys on pushes to `main`:

```text
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=265122b6d6f29457b0ca950c55f3ac6e
```

## Environment variables

Required for live quote email delivery:

```text
QUOTE_TO_EMAIL=PRVNEPOXY@OUTLOOK.COM
QUOTE_FROM_EMAIL=
RESEND_API_KEY=
TURNSTILE_SECRET_KEY=
PUBLIC_TURNSTILE_SITE_KEY=
```

`QUOTE_FROM_EMAIL` must be a Resend-verified sender or domain address. The quote API returns a configuration error instead of pretending email delivery works when `RESEND_API_KEY` or `QUOTE_FROM_EMAIL` is missing.

## Launch details still needed

- Production domain and DNS preference
- Legal business name and address/service-area display preference
- Confirmed cities or service radius
- Google Business Profile, Instagram, and Facebook URLs
- License, insurance, warranty, and care details
- Approved reviews and before/after photos
