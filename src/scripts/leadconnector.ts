import { isLeadConnectorPublicRoute } from '~/utils/leadconnector';
import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';

interface ChatWidgetApi {
  openWidget?: () => void;
  closeWidget?: () => void;
  isActive?: () => boolean;
}

declare global {
  interface Window {
    leadConnector?: { chatWidget?: ChatWidgetApi };
  }
}

const loaderUrl = 'https://widgets.leadconnectorhq.com/loader.js';

/** A non-critical enhancement: blocked or throwing provider APIs never interrupt PRVN. */
export function openPrvnChat(): boolean {
  if (typeof document === 'undefined' || !isLeadConnectorPublicRoute(window.location.pathname)) return false;
  const root = document.querySelector<HTMLElement>('[data-leadconnector-root]');
  const api = window.leadConnector?.chatWidget;
  if (!root || root.hidden || root.dataset.ready !== 'true' || !api?.openWidget) return false;
  try {
    api.openWidget();
    return true;
  } catch {
    return false;
  }
}

function initializeIntegration() {
  let observer: ResizeObserver | undefined;
  let frame: number | undefined;

  const updateClearance = () => {
    const root = document.querySelector<HTMLElement>('[data-leadconnector-root]');
    if (!root) return;
    // Account for the app deck as well as the Call/Text/Quote dock and optional consent controls.
    const controls = document.querySelectorAll<HTMLElement>(
      '[data-conversion-dock], [data-sticky-cta], [data-mobile-app-deck], [data-chat-clearance]'
    );
    const top = Array.from(controls).reduce((highest, control) => {
      const rect = control.getBoundingClientRect();
      const style = getComputedStyle(control);
      return rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.position === 'fixed'
        ? Math.min(highest, rect.top)
        : highest;
    }, window.innerHeight);
    root.style.setProperty(
      '--prvn-chat-clearance',
      `${Math.max(0, window.innerHeight - top + (top < window.innerHeight ? 12 : 0))}px`
    );
  };

  const scheduleClearance = () => {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(() => {
      frame = undefined;
      updateClearance();
    });
  };

  const setReady = () => {
    const root = document.querySelector<HTMLElement>('[data-leadconnector-root]');
    if (root && window.leadConnector?.chatWidget?.openWidget) root.dataset.ready = 'true';
  };

  const reconcile = () => {
    observer?.disconnect();
    const root = document.querySelector<HTMLElement>('[data-leadconnector-root]');
    if (!root || !isLeadConnectorPublicRoute(window.location.pathname)) return;
    updateClearance();
    if (typeof ResizeObserver !== 'undefined') {
      observer ??= new ResizeObserver(scheduleClearance);
      document
        .querySelectorAll('[data-conversion-dock], [data-sticky-cta], [data-mobile-app-deck], [data-chat-clearance]')
        .forEach((control) => observer!.observe(control));
    }
    const initialized = Boolean(window.leadConnector?.chatWidget?.openWidget);
    if (initialized) setReady();
    const existingLoader = Array.from(document.scripts).find((script) => script.src === loaderUrl);
    if (!existingLoader || root.dataset.loaderStarted === 'true') return;
    root.dataset.loaderStarted = 'true';
    existingLoader.addEventListener(
      'error',
      () => {
        root.dataset.ready = 'false';
      },
      { once: true }
    );
    // The component emits the loader in HTML so Astro records it before transitions.
    // Dynamically appended scripts can be replayed by ClientRouter on the first swap.
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-open-prvn-chat]') && openPrvnChat()) event.preventDefault();
  });
  window.addEventListener('LC_chatWidgetLoaded', setReady);
  document.addEventListener('astro:page-load', reconcile);
  document.addEventListener('astro:before-swap', (event) => {
    if (!document.querySelector('[data-leadconnector-root]')) return;
    const swap = event as TransitionBeforeSwapEvent;
    // Skipped native animations reject `ready`; the document swap still succeeds.
    // Handle that non-critical animation promise without hiding swap or script errors.
    void swap.viewTransition.ready.catch(() => {});
    if (document.documentElement.classList.contains('mobile-app-mode')) {
      // A direct ClientRouter swap avoids WebKit snapshot crashes with fixed phone UI.
      swap.viewTransition.skipTransition();
    }
  });
  document.addEventListener('astro:before-preparation', (event) => {
    const preparation = event as TransitionBeforePreparationEvent;
    const destination = preparation.to;
    if (!destination || !preparation.from) return;
    // On Back/Forward the address bar already contains the destination URL.
    const fromPublic = isLeadConnectorPublicRoute(preparation.from.pathname);
    const toPublic = isLeadConnectorPublicRoute(destination.pathname);
    if (fromPublic === toPublic) return;
    event.preventDefault();
    // Removing a script cannot unload already executing provider code. Isolate private routes.
    const root = document.querySelector<HTMLElement>('[data-leadconnector-root]');
    if (root) root.hidden = true;
    try {
      window.leadConnector?.chatWidget?.closeWidget?.();
    } catch {
      /* Provider failure is non-critical. */
    }
    window.location.assign(destination.href);
  });
  window.addEventListener('resize', scheduleClearance, { passive: true });
  window.visualViewport?.addEventListener('resize', scheduleClearance, { passive: true });
  reconcile();
}

// Astro's bundled modules execute once per document, including across ClientRouter swaps.
if (typeof window !== 'undefined') initializeIntegration();
