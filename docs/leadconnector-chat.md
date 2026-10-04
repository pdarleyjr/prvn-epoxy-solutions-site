# PRVN HighLevel installation preparation

Integration prepared but not activated. Exact HighLevel Get Code snippet is still required.

## Actual provider configuration

As of October 4, 2026, no complete PRVN installation HTML has been supplied. The earlier pasted JavaScript is the generic loader program; it has attribute names but no PRVN location or widget values. Sticky versus Embedded/Inline placement, actual embed format, provider resources/attributes, load strategy, and consent settings are **unknown**. No real launcher, conversation, inbox delivery, or visitor response has been verified.

Obtain **HighLevel → Sites → Chat Widget → PRVN widget → Save → Get Code → Copy**, and confirm its **Style → Widget Placement** setting. Sticky is the intended floating site-wide experience. If the client configured Embedded/Inline, report that mismatch before changing presentation.

When the snippet arrives, save the original HTML verbatim in implementation notes. Record placement, location/widget IDs, resources URL, every provider attribute/style/load/consent option, and every deliberate Astro difference. Preserve the generated format and unknown attributes. The current component is only a scaffold for the two originally supplied standard formats; it is not a substitute for the client's exact code.

## Minimal implementation

`src/layouts/Layout.astro` invokes `LeadConnectorWidget.astro` immediately before `</body>`, after PRVN's existing scripts. Its fragment emits the provider host and loader as direct body children. No content card, iframe, sized container, wrapper, custom CSS, transform, positioning, pointer-events changes, or clipping surround the provider. The external script has Astro's `is:inline` compiler directive; no custom loader ID, async flag, or simulated interaction-loading attribute is added.

The existing public-route allowlist and `chat={false}` layout opt-out remain. Missing/invalid configuration renders no provider markup. These client-visible build variables retain their existing meanings:

| Variable                           | Meaning                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `PUBLIC_LEADCONNECTOR_ENABLED`     | Keep `false` until actual preview acceptance.                     |
| `PUBLIC_LEADCONNECTOR_EMBED`       | Select `legacy` or `gtm` only after comparing the actual snippet. |
| `PUBLIC_LEADCONNECTOR_LOCATION_ID` | Exact location identifier from the snippet.                       |
| `PUBLIC_LEADCONNECTOR_WIDGET_ID`   | Exact widget identifier if supplied; not required for legacy.     |

Only public installation identifiers belong here. Never put CRM/API credentials in browser code. The Pages configuration reader selects only these four plaintext keys from the existing project's chosen environment. It retains secret/injection guards and sanitized errors; preview no longer makes an extra production-config read. Static builds require rebuilding after variable changes.

`src/scripts/leadconnector.ts` contains a guarded `openPrvnChat()` and one delegated `data-open-prvn-chat` handler. No extra chat CTA is rendered. The small private-route boundary guard requests a full document navigation when provider code is installed and the destination is excluded. Future private links should use `data-astro-reload`; no vendor state is surgically hidden, closed, or unloaded. Existing admin paths are currently 404s, not an implemented portal.

All speculative public-route persistence, readiness bookkeeping, loader initialization markers, ResizeObserver clearance, viewport handlers, and native transition manipulation were removed. PRVN's phone navigation is restored to its original behavior. Public SPA conversation continuity is **not established**. Do not activate this scaffold and assume it survives body swaps.

## Real-widget acceptance: pending

1. Confirm the exact snippet and Sticky/Embedded setting. Configure/build/deploy preview with that snippet.
2. Direct-load a public page. Verify launcher, open/close, fields/consent, no provider errors, and a real test conversation in the **correct PRVN Conversations inbox**. Have PRVN respond and confirm delivery to the visitor. Fix provider configuration first if direct loading fails.
3. Navigate Home → Services → Gallery → Contact → Quote → Home, with chat open and closed, plus Back/Forward. Observe actual resets, duplicates, loader count, API behavior, and conversation state. Only then add the lightest persistence or idempotency fix needed. Do not infer continuity from a test double.
4. Inspect 320×568, 375×667, 390×844, 430×932, and 768×1024, plus desktop. Verify keyboard, browser toolbars, safe areas, no overflow, and the Call/Text/Get Quote dock. If there is no collision, add no positioning changes. If there is one, use HighLevel placement/dimensions first, evaluate either corner, then consider PRVN's own dock before any supported host adjustment. Do not target undocumented Shadow DOM.
5. Verify no provider markup/code on admin/private/API/share/print/diagnostic routes, including public/private full-document boundaries.
6. Inspect actual provider network/CSP needs. Existing security headers remain unchanged; no CSP currently exists. Add no speculative or wildcard origins.
7. Only after real preview acceptance, deploy production and repeat real inbox/response and mobile acceptance.

Recommended branding remains an owner setting: cobalt `#0B54FF`, surfaces `#05070A` / `#0C1118`, light text `#F5F7FB`, and “Need a floor estimate? Tell us about your project.” In HighLevel's **Chat Window → Additional Options**, consider **Load on user interaction**. The documented strategy uses scroll/click/touch with about an eight-second fallback. No Astro JavaScript recreates this setting.

### SMS consent review

Current repository inspection found that the Quote wizard collects name, phone, and email and says PRVN will follow up by phone/text/email. It has no explicit SMS-consent checkbox or dedicated SMS-consent text. Contact offers call/text/email links and a Quote link; it has no separate signup form. The actual widget's fields/consent and the A2P-submitted page are unknown, so a competing-consent-form conflict cannot yet be determined. Review the actual widget and submitted page together; legal text was not changed and no compliance approval is claimed.

## Automated architecture checks

Default `npm run test:e2e` uses chat disabled. The separate `leadconnector-architecture.spec.ts` suite uses an explicitly local provider double only when `PRVN_CHAT_ARCHITECTURE=true`; it checks direct body-end markup, exclusion, safe API/failure behavior, and private document isolation. It has no fake launcher geometry, containing-block assertions, or simulated conversation-continuity acceptance. No Windows native-transition override remains.

```sh
npm ci
npm run check
npm run test:unit
npm run build
npm run test:e2e
PRVN_CHAT_ARCHITECTURE=true npm run test:e2e -- tests/e2e/leadconnector-architecture.spec.ts
PRVN_CHAT_ARCHITECTURE=true PRVN_CHAT_TEST_EMBED=legacy npm run test:e2e -- tests/e2e/leadconnector-architecture.spec.ts
# Set LIVE_SITE_URL to the immutable URL returned by the existing PRVN Pages project.
npm run test:e2e -- tests/e2e/leadconnector-disabled.spec.ts
```

Fixture results prove architecture only. Live disabled-site checks prove provider absence and existing public controls, not real HighLevel layout, positioning, consent, routing, or inbox delivery.

## Cloudflare deployment credential

The earlier GitHub token returned HTTP 401. Local Wrangler OAuth can deploy, but does not establish API-token management authority. Cloudflare documents **Account → Cloudflare Pages → Edit**, scoped to the existing account, as the minimum deployment permission. It permits Pages projects throughout that account; no documented Pages-project-only token scope was found. Do not claim an account-scoped token is restricted to PRVN alone.

The authenticated account inspection on October 4 found no PRVN-named user token or dedicated PRVN account token. The token behind GitHub's opaque secret could not be positively identified, so no existing token was rotated and no unrelated credential was changed. Automatic deployment still needs a securely updated credential.

Rotate only the positively identified dedicated token through an authorized account session, review/narrow its existing permissions, and securely update this repository's secret. Token rotation preserves permissions and immediately invalidates the prior value. Do not copy short-lived Wrangler OAuth into GitHub or introduce broader API-token-management credentials to work around missing access.

## Primary references

- [HighLevel setup and Get Code](https://help.gohighlevel.com/support/solutions/articles/155000005067-getting-started-setup-live-chat-widget)
- [HighLevel Sticky/Embedded customization](https://help.gohighlevel.com/support/solutions/articles/155000002960)
- [HighLevel load on interaction](https://help.gohighlevel.com/support/solutions/articles/155000004102-getting-started-with-chat-widget)
- [Astro script processing](https://docs.astro.build/en/guides/client-side-scripts/)
- [Astro ClientRouter lifecycle and persistence](https://docs.astro.build/en/guides/view-transitions/)
- [Cloudflare Pages CI permissions](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Cloudflare token permission scopes](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Cloudflare token rotation](https://developers.cloudflare.com/fundamentals/api/how-to/roll-token/)
