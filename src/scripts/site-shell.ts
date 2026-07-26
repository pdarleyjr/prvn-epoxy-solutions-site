type Cleanup = () => void;

let activeCleanup: Cleanup | undefined;

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const setupSiteShell = () => {
  activeCleanup?.();

  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const toggleButton = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const drawer = document.querySelector<HTMLElement>('[data-mobile-drawer]');
  const dock = document.querySelector<HTMLElement>('[data-conversion-dock]');
  const background = [header, document.querySelector('main'), document.querySelector('footer'), dock].filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  );

  let scrollTicking = false;
  let keyboardFocused = false;
  let lockedOverflow = '';
  let locked = false;

  const updateHeader = () => {
    scrollTicking = false;
    header?.classList.toggle('is-scrolled', window.scrollY > 40);
  };

  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateHeader);
  };

  const updateDockForKeyboard = () => {
    if (!(dock instanceof HTMLElement)) return;
    const viewport = window.visualViewport;
    const keyboardOpen =
      keyboardFocused && Boolean(viewport) && window.innerHeight - (viewport?.height ?? window.innerHeight) > 120;
    dock.classList.toggle('is-keyboard-open', keyboardOpen);
  };

  const setBackgroundInert = (isInert: boolean) => {
    background.forEach((element) => {
      element.toggleAttribute('inert', isInert);
      element.setAttribute('aria-hidden', String(isInert));
    });
  };

  const unlockScroll = () => {
    if (!locked) return;
    document.body.style.overflow = lockedOverflow;
    locked = false;
  };

  const closeDrawer = (restoreFocus = true) => {
    if (!(drawer instanceof HTMLElement) || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    toggleButton?.setAttribute('aria-expanded', 'false');
    toggleButton?.setAttribute('aria-label', 'Open navigation');
    setBackgroundInert(false);
    unlockScroll();
    if (restoreFocus) toggleButton?.focus({ preventScroll: true });
  };

  const openDrawer = () => {
    if (!(drawer instanceof HTMLElement) || !(toggleButton instanceof HTMLButtonElement)) return;
    lockedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    locked = true;
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('is-open');
    toggleButton.setAttribute('aria-expanded', 'true');
    toggleButton.setAttribute('aria-label', 'Close navigation');
    setBackgroundInert(true);
    const initialFocus = drawer.querySelector<HTMLElement>('[data-drawer-close], .mobile-drawer-nav a');
    window.requestAnimationFrame(() => initialFocus?.focus({ preventScroll: true }));
  };

  const onToggle = () => {
    if (drawer?.classList.contains('is-open')) closeDrawer();
    else openDrawer();
  };

  const onDrawerClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-drawer-close], .mobile-drawer-nav a, .mobile-drawer-actions a')) {
      closeDrawer(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!drawer?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !element.hasAttribute('hidden')
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;
    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onFocusIn = (event: FocusEvent) => {
    keyboardFocused = event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName);
    updateDockForKeyboard();
  };

  const onFocusOut = () => {
    window.setTimeout(() => {
      keyboardFocused = false;
      updateDockForKeyboard();
    }, 0);
  };
  const onOrientationChange = () => closeDrawer(false);

  toggleButton?.addEventListener('click', onToggle);
  drawer?.addEventListener('click', onDrawerClick);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('focusin', onFocusIn);
  window.addEventListener('focusout', onFocusOut);
  window.visualViewport?.addEventListener('resize', updateDockForKeyboard, { passive: true });
  window.addEventListener('orientationchange', onOrientationChange);
  updateHeader();
  updateDockForKeyboard();

  activeCleanup = () => {
    toggleButton?.removeEventListener('click', onToggle);
    drawer?.removeEventListener('click', onDrawerClick);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('focusin', onFocusIn);
    window.removeEventListener('focusout', onFocusOut);
    window.visualViewport?.removeEventListener('resize', updateDockForKeyboard);
    window.removeEventListener('orientationchange', onOrientationChange);
    closeDrawer(false);
    dock?.classList.remove('is-keyboard-open');
  };
};

if (typeof window !== 'undefined') {
  document.addEventListener('astro:before-swap', () => activeCleanup?.());
  document.addEventListener('astro:page-load', setupSiteShell);
  setupSiteShell();
}
