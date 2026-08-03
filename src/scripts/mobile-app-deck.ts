type Cleanup = () => void;

export type PhoneViewport = {
  coarsePointer: boolean;
  hoverNone: boolean;
  width: number;
  height: number;
};

export const isPhoneAppViewport = ({ coarsePointer, hoverNone, width, height }: PhoneViewport) =>
  coarsePointer && hoverNone && Math.min(width, height) <= 600;

let activeCleanup: Cleanup | undefined;

const getViewport = (): PhoneViewport => {
  const viewport = window.visualViewport;
  return {
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    hoverNone: window.matchMedia('(hover: none)').matches,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
};

const getSectionLabel = (section: HTMLElement, index: number) => {
  const labelledBy = section.getAttribute('aria-labelledby');
  const heading =
    (labelledBy ? document.getElementById(labelledBy) : undefined) ?? section.querySelector<HTMLElement>('h1, h2');
  return heading?.textContent?.trim() || section.dataset.section || `Section ${index + 1}`;
};

const isFormControl = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest('a, button, input, textarea, select, [contenteditable="true"]'));

const setupCollectionPager = (container: HTMLElement, parentLabel: string): Cleanup | undefined => {
  const items = Array.from(container.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
  if (items.length < 2) return undefined;

  container.setAttribute('data-mobile-app-collection', 'true');
  let index = 0;
  const nav = document.createElement('nav');
  nav.className = 'mobile-app-collection-nav';
  nav.setAttribute('aria-label', `${parentLabel} items`);
  nav.innerHTML = `
    <button type="button" data-mobile-collection-prev aria-label="Previous item">‹</button>
    <span data-mobile-collection-progress aria-live="polite"></span>
    <button type="button" data-mobile-collection-next aria-label="Next item">›</button>`;
  container.insertAdjacentElement('afterend', nav);

  const previous = nav.querySelector<HTMLButtonElement>('[data-mobile-collection-prev]');
  const next = nav.querySelector<HTMLButtonElement>('[data-mobile-collection-next]');
  const progress = nav.querySelector<HTMLElement>('[data-mobile-collection-progress]');

  const render = () => {
    items.forEach((item, itemIndex) => {
      item.toggleAttribute('data-mobile-app-item-hidden', itemIndex !== index);
      item.setAttribute('aria-hidden', String(itemIndex !== index));
    });
    if (progress) progress.textContent = `${index + 1} of ${items.length}`;
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === items.length - 1;
  };

  const onPrevious = () => {
    index = Math.max(0, index - 1);
    render();
  };
  const onNext = () => {
    index = Math.min(items.length - 1, index + 1);
    render();
  };

  previous?.addEventListener('click', onPrevious);
  next?.addEventListener('click', onNext);
  render();

  return () => {
    previous?.removeEventListener('click', onPrevious);
    next?.removeEventListener('click', onNext);
    nav.remove();
    container.removeAttribute('data-mobile-app-collection');
    items.forEach((item) => {
      item.removeAttribute('data-mobile-app-item-hidden');
      item.removeAttribute('aria-hidden');
    });
  };
};

const setupMobileAppDeck = (): Cleanup | undefined => {
  if (!isPhoneAppViewport(getViewport())) return undefined;

  const root = document.documentElement;
  const main = document.querySelector<HTMLElement>('main');
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const dock = document.querySelector<HTMLElement>('[data-conversion-dock]');
  const sections = Array.from(main?.querySelectorAll<HTMLElement>(':scope > section') ?? []);
  if (!main || !sections.length) return undefined;

  root.classList.add('mobile-app-mode');
  main.setAttribute('data-mobile-app-main', 'true');

  const nativeNavigationLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).filter((link) => {
    const target = new URL(link.href, window.location.href);
    return (
      link.dataset.astroReload === undefined &&
      (target.protocol === 'http:' || target.protocol === 'https:') &&
      target.origin === window.location.origin
    );
  });
  nativeNavigationLinks.forEach((link) => link.setAttribute('data-astro-reload', ''));

  const findFinishSelectors = main.querySelector<HTMLElement>('.find-finish-selectors');
  const findFinishResult = main.querySelector<HTMLElement>('.find-finish-result');
  const findFinishResultParent = findFinishResult?.parentElement;
  const findFinishResultNextSibling = findFinishResult?.nextSibling;
  if (findFinishSelectors && findFinishResult) findFinishSelectors.append(findFinishResult);

  const deck = document.createElement('nav');
  deck.className = 'mobile-app-deck';
  deck.setAttribute('data-mobile-app-deck', 'true');
  deck.setAttribute('aria-label', 'Page sections');
  deck.innerHTML = `
    <button type="button" data-mobile-app-previous aria-label="Previous section">‹</button>
    <span data-mobile-app-deck-progress aria-live="polite"></span>
    <button type="button" data-mobile-app-next aria-label="Next section">›</button>`;
  document.body.append(deck);

  const previous = deck.querySelector<HTMLButtonElement>('[data-mobile-app-previous]');
  const next = deck.querySelector<HTMLButtonElement>('[data-mobile-app-next]');
  const progress = deck.querySelector<HTMLElement>('[data-mobile-app-deck-progress]');
  const collectionCleanups = [
    ...Array.from(
      main.querySelectorAll<HTMLElement>(
        '.finish-scroll, .gallery-grid, .gallery-grid-full, .metrics-grid, .timeline, .styles-grid, .cards-grid, .find-finish-selectors, [data-section="before-after"] .split-grid'
      )
    ).map((collection) => setupCollectionPager(collection, getSectionLabel(collection.closest('section')!, 0))),
    ...Array.from(main.querySelectorAll<HTMLElement>('.split-grid'))
      .filter((collection) => Array.from(collection.children).every((child) => child.tagName === 'ARTICLE'))
      .map((collection) => setupCollectionPager(collection, getSectionLabel(collection.closest('section')!, 0))),
  ].filter((cleanup): cleanup is Cleanup => Boolean(cleanup));

  const containsOrMatches = (section: HTMLElement, selector: string) =>
    section.matches(selector) || Boolean(section.querySelector(selector));
  const fragment = window.location.hash.slice(1);
  const fragmentIndex = sections.findIndex(
    (section) => fragment && containsOrMatches(section, `#${CSS.escape(fragment)}`)
  );
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const routeSelector =
    pathname === '/quote' ? '[data-section="quote-form"]' : pathname === '/gallery' ? '[data-gallery-item]' : undefined;
  const routeIndex = routeSelector ? sections.findIndex((section) => containsOrMatches(section, routeSelector)) : -1;
  let index = fragmentIndex >= 0 ? fragmentIndex : Math.max(0, routeIndex);
  let touchStart: { x: number; y: number } | undefined;

  const syncLayout = () => {
    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const dockRect = dock?.getBoundingClientRect();
    const dockBottom = dockRect ? Math.max(12, window.innerHeight - dockRect.bottom) : 0;
    const bottomUi = (dockRect?.height ?? 0) + dockBottom + deck.getBoundingClientRect().height + 6;
    root.style.setProperty('--mobile-app-header-h', `${headerHeight}px`);
    root.style.setProperty('--mobile-app-bottom-ui', `${bottomUi}px`);
  };

  const fitCurrentSection = () => {
    const current = sections[index];
    if (!current) return;
    current.toggleAttribute('data-mobile-app-compact', current.scrollHeight > main.clientHeight + 1);
  };

  const show = (nextIndex: number) => {
    index = Math.min(Math.max(nextIndex, 0), sections.length - 1);
    sections.forEach((section, sectionIndex) => {
      const active = sectionIndex === index;
      section.hidden = !active;
      section.toggleAttribute('inert', !active);
      section.setAttribute('aria-hidden', String(!active));
    });
    const label = getSectionLabel(sections[index], index);
    if (progress) progress.textContent = `${index + 1} of ${sections.length} · ${label}`;
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === sections.length - 1;
    syncLayout();
    window.requestAnimationFrame(fitCurrentSection);
  };

  const onPrevious = () => show(index - 1);
  const onNext = () => show(index + 1);
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      isFormControl(document.activeElement) ||
      document.querySelector('[data-mobile-drawer].is-open, .lightbox:not([hidden])')
    ) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onPrevious();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      onNext();
    }
  };
  const onTouchStart = (event: TouchEvent) => {
    if (isFormControl(event.target)) return;
    const touch = event.touches[0];
    if (touch) touchStart = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (!touchStart || isFormControl(event.target)) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const xDelta = touch.clientX - touchStart.x;
    const yDelta = touch.clientY - touchStart.y;
    touchStart = undefined;
    if (Math.abs(xDelta) < 56 || Math.abs(xDelta) <= Math.abs(yDelta)) return;
    if (xDelta < 0) onNext();
    else onPrevious();
  };
  const onResize = () => {
    if (!isPhoneAppViewport(getViewport())) {
      activeCleanup?.();
      activeCleanup = undefined;
      return;
    }
    syncLayout();
    fitCurrentSection();
  };

  previous?.addEventListener('click', onPrevious);
  next?.addEventListener('click', onNext);
  document.addEventListener('keydown', onKeyDown);
  main.addEventListener('touchstart', onTouchStart, { passive: true });
  main.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize);
  window.visualViewport?.addEventListener('resize', onResize, { passive: true });
  show(index);

  return () => {
    previous?.removeEventListener('click', onPrevious);
    next?.removeEventListener('click', onNext);
    document.removeEventListener('keydown', onKeyDown);
    main.removeEventListener('touchstart', onTouchStart);
    main.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    window.visualViewport?.removeEventListener('resize', onResize);
    collectionCleanups.forEach((cleanup) => cleanup());
    if (findFinishResult && findFinishResultParent) {
      findFinishResultParent.insertBefore(findFinishResult, findFinishResultNextSibling ?? null);
    }
    nativeNavigationLinks.forEach((link) => link.removeAttribute('data-astro-reload'));
    deck.remove();
    sections.forEach((section) => {
      section.hidden = false;
      section.removeAttribute('inert');
      section.removeAttribute('aria-hidden');
      section.removeAttribute('data-mobile-app-compact');
    });
    main.removeAttribute('data-mobile-app-main');
    root.classList.remove('mobile-app-mode');
    root.style.removeProperty('--mobile-app-header-h');
    root.style.removeProperty('--mobile-app-bottom-ui');
  };
};

const initialize = () => {
  activeCleanup?.();
  activeCleanup = setupMobileAppDeck();
};

if (typeof window !== 'undefined') {
  document.addEventListener('astro:before-swap', () => activeCleanup?.());
  document.addEventListener('astro:page-load', initialize);
  initialize();
}
