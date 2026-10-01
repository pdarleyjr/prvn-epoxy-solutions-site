# PRVN HighLevel chat integration

The integration is disabled until PRVN supplies the exact installation snippet and completes real-widget preview acceptance. No customer-facing placeholder, fake ID, CRM credential, or widget network request is shipped while disabled.

## Configuration and activation

Copy **HighLevel → Sites → Chat Widget → PRVN Widget → Get Code**. Preserve that snippet's format. The environment keys are:

| Key                                | Value                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `PUBLIC_LEADCONNECTOR_ENABLED`     | `false` until acceptance, then `true`                                                         |
| `PUBLIC_LEADCONNECTOR_EMBED`       | `legacy` for `<chat-widget location-id>`; `gtm` for the supplied `data-chat-widget` container |
| `PUBLIC_LEADCONNECTOR_LOCATION_ID` | Exact PRVN location ID from Get Code                                                          |
| `PUBLIC_LEADCONNECTOR_WIDGET_ID`   | Exact widget ID for GTM format; unnecessary for legacy                                        |

Only client-visible installation identifiers belong in these keys. Never enter API keys, access tokens, or HighLevel credentials. Enabled with missing/invalid configuration renders nothing and warns only in development. Unsupported future snippet formats require review before activation.

Local Astro builds read these variables from the environment or `.env`. GitHub's direct-upload preview/production jobs read these four keys from the **existing** `prvn-epoxy-solutions-site` Pages project's corresponding preview/production configuration before building. The Pages Function does not dynamically configure a static Astro build. Changing Pages variables requires a new build/deployment. Unconfigured production stays disabled.

## Implementation

- `src/components/integrations/LeadConnectorWidget.astro` owns the exact selected embed and a `transition:persist="prvn-leadconnector-chat"` wrapper near the end of the body.
- `src/utils/leadconnector.ts` validates configuration and allows only PRVN customer routes, including service and service-area slugs. Unknown, admin, API, share, print, and diagnostic routes fail closed. Layouts also accept `chat={false}` for future private documents; use `data-astro-reload` on links crossing such custom boundaries.
- The component emits one async official loader inside the wrapper in the initial HTML, allowing ClientRouter to record it before navigation. `src/scripts/leadconnector.ts` detects existing loader/initialization, tracks `LC_chatWidgetLoaded`, and delegates `data-open-prvn-chat` clicks. Missing or throwing provider APIs fail silently. Custom triggers are implemented but unused to avoid adding another CTA.
- Public/private route boundaries force a full document navigation. Removing a script or hiding a launcher cannot unload code that already executed; a new document keeps it out of authenticated pages.
- Phone app navigation retains its existing reload behavior when chat is disabled. With a configured widget it uses ClientRouter across public pages so the wrapper can persist.
- Chat-enabled phone navigation skips native page-transition snapshots while retaining ClientRouter's document swap and persistent widget. This avoids the fixed-overlay snapshot crash observed in Windows WebKit. The adapter handles the native animation's rejected `ready` promise when a transition is skipped; document-swap and script errors remain visible.

Astro warns that persistent DOM does not guarantee iframe continuity. HighLevel cleans up resources when its custom element disconnects. The browser contract tests verify wrapper identity and single-loader behavior with a local test double; real conversation continuity must also be verified using PRVN's actual widget.

## Mobile collision handling

PRVN's own fixed wrapper creates a containing block for the provider's fixed content. The adapter measures the visible conversion dock, phone section controls, and optional `[data-chat-clearance]` consent UI, reserving their occupied area plus 12px. CSS supplies an initial safe-area fallback and hides chat in print. ResizeObserver and viewport resize handling update the clearance. There are no generated-class selectors, shadow DOM overrides, invented provider attributes, or `!important` rules.

The local provider test double exercises fixed launcher placement at 320, 375, 390, 430, 768, and 1440px. **Real provider launcher, open panel, keyboard, toolbar, safe-area, and conversation behavior remain pending** the actual snippet. Review the real widget's dimensions/settings before enabling production.

## HighLevel owner settings and acceptance

Use **Sites → Chat Widget → PRVN widget → Customization/settings → Enable Load on User Interaction**. This is a HighLevel setting; no unsupported loader attribute simulates it. The documented strategy includes a fallback load after about eight seconds.

Recommended settings: bottom-right Sticky placement, primary `#0B54FF`, darker blue `#0A3FBD`, dark surfaces `#05070A` / `#0C1118`, text `#F5F7FB`, and concise welcome copy: “Need a floor estimate? Tell us about your project.” Avoid large mobile prompt bubbles. No account settings have been changed without access to PRVN's widget.

Review its contact fields, SMS consent, unchecked consent choices, privacy/terms links, acknowledgement, inactivity settings, and mobile/desktop dimensions against the existing quote form. Existing legal text is unchanged.

Before activation, run the actual widget on the Cloudflare preview; inspect its network/CSP behavior; open, close, send one clearly identified test chat, and confirm it in the **correct PRVN Conversations inbox**. Test Home → Services → Gallery → Quote → Home with chat open and closed, browser Back, excluded routes, mobile keyboard, and Call/Text/Quote controls. Never equate the local test double with successful inbox delivery.

No CSP currently exists in `public/_headers`; its existing security headers are preserved. No guessed provider origins or wildcard policy changes were added. Add a minimal allowlist only if actual PRVN widget traffic and an existing future policy require it.

## Verification commands

```sh
npm ci
npm run check
npm run test:unit
npm run build
npm run test:e2e
PLAYWRIGHT_CHAT_DISABLED=true npm run test:e2e -- tests/e2e/leadconnector-disabled.spec.ts
PRVN_CHAT_TEST_EMBED=legacy npm run test:e2e -- tests/e2e/leadconnector.spec.ts
LIVE_SITE_URL=https://the-existing-project-preview.pages.dev npm run test:e2e -- tests/e2e/leadconnector-disabled.spec.ts
```

The enabled Playwright fixture uses explicitly local test identifiers and intercepts the provider request. Those environment values are confined to the local test web server; deploy jobs rebuild from actual Pages configuration. Chromium, mobile Chrome emulation, and mobile Safari/WebKit emulation run these tests. Physical iPhone/Android/Samsung acceptance requires the real widget and devices.

## References

- [HighLevel installation](https://help.gohighlevel.com/support/solutions/articles/155000005067-getting-started-setup-live-chat-widget)
- [HighLevel public APIs and readiness event](https://help.gohighlevel.com/support/solutions/articles/48001191051-web-chat-widget-advanced-configurations-public-api-events)
- [HighLevel customization and loading settings](https://help.gohighlevel.com/support/solutions/articles/155000002960-overview-of-chat-widget-customizations)
- [Astro persistence and lifecycle](https://docs.astro.build/en/guides/view-transitions/)
- [Astro navigation events](https://docs.astro.build/en/reference/modules/astro-transitions/)
