import { isLeadConnectorPublicRoute } from '~/utils/leadconnector';
import type { TransitionBeforePreparationEvent } from 'astro:transitions/client';

const hasInstallation = () =>
  Boolean(document.querySelector('script[src="https://widgets.leadconnectorhq.com/loader.js"]'));

/** Chat is optional: unavailable or throwing provider APIs never interrupt PRVN. */
export function openPrvnChat(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (!hasInstallation() || !isLeadConnectorPublicRoute(window.location.pathname)) return false;
    const api = window.leadConnector?.chatWidget;
    if (!api?.openWidget) return false;
    api.openWidget();
    return true;
  } catch {
    return false;
  }
}

// Astro bundles this module once per document. No provider loading or positioning is recreated here.
if (typeof window !== 'undefined') {
  document.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('[data-open-prvn-chat]') && openPrvnChat()) {
      event.preventDefault();
    }
  });

  // A fresh document isolates private routes. No attempt to surgically unload vendor state.
  document.addEventListener('astro:before-preparation', (event) => {
    const { to } = event as TransitionBeforePreparationEvent;
    if (!hasInstallation() || isLeadConnectorPublicRoute(to.pathname)) return;
    event.preventDefault();
    window.location.assign(to.href);
  });
}
