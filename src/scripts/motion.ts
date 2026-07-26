import { inView } from 'motion';

import { buildConfiguratorQuoteUrl, getConfiguratorRecommendation, isConfiguratorSelection } from './configurator';
import { onMotionPreferenceChange, setMotionPreferenceClass } from './ReducedMotionGuard';

type Cleanup = () => void;
type LightboxApi = {
  open: (items: HTMLButtonElement[], index: number) => void;
  destroy: () => void;
  shell: HTMLElement;
};

let cleanups: Cleanup[] = [];
let lightboxApi: LightboxApi | undefined;

const cleanup = () => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
  lightboxApi?.destroy();
  lightboxApi = undefined;
};

const isFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const initReveal = (reduced: boolean) => {
  const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (reduced) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  elements.forEach((element) => element.classList.remove('is-visible'));
  const stop = inView(
    elements,
    (element) => {
      const target = element as HTMLElement;
      const delay = Number(target.dataset.revealDelay || 0);
      target.classList.add('is-visible');
      target.animate(
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 700, delay: delay * 1000, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
      );
    },
    { amount: 0.16, margin: '0px 0px -8% 0px' }
  );
  cleanups.push(stop);
};

const initCounters = (reduced: boolean) => {
  document.querySelectorAll<HTMLElement>('[data-counter]').forEach((counter) => {
    const value = Number(counter.dataset.counter || 0);
    const suffix = counter.dataset.counterSuffix || '';
    if (!Number.isFinite(value)) return;
    counter.textContent = `0${suffix}`;
    if (reduced) {
      counter.textContent = `${value}${suffix}`;
      return;
    }

    const stop = inView(counter, () => {
      const startedAt = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / 1100);
        counter.textContent = `${Math.round(value * (1 - (1 - progress) ** 4))}${suffix}`;
        if (progress < 1) frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
      return () => window.cancelAnimationFrame(frame);
    });
    cleanups.push(stop);
  });
};

const initHeroGlare = (reduced: boolean) => {
  const hero = document.querySelector<HTMLElement>('[data-hero-media]');
  if (!hero || reduced || !isFinePointer()) return;
  let frame = 0;
  const onMove = (event: PointerEvent) => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      hero.style.setProperty('--glare-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      hero.style.setProperty('--glare-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    });
  };
  const reset = () => {
    hero.style.removeProperty('--glare-x');
    hero.style.removeProperty('--glare-y');
  };
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', reset);
  cleanups.push(() => {
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', reset);
    window.cancelAnimationFrame(frame);
    reset();
  });
};

const initTiltCards = (reduced: boolean) => {
  if (reduced || !isFinePointer()) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    const onMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(x * 7).toFixed(2)}deg`);
      card.style.setProperty('--shine-x', `${((x + 0.5) * 100).toFixed(1)}%`);
    };
    const reset = () => {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
      card.style.removeProperty('--shine-x');
    };
    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerleave', reset);
    cleanups.push(() => {
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerleave', reset);
      reset();
    });
  });
};

const initProcessProgress = (reduced: boolean) => {
  const timeline = document.querySelector<HTMLElement>('[data-process-timeline]');
  if (!timeline || reduced) {
    timeline?.style.setProperty('--progress', '1');
    return;
  }
  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = timeline.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    timeline.style.setProperty(
      '--progress',
      String(Math.min(1, Math.max(0, (viewport * 0.78 - rect.top) / (rect.height + viewport * 0.45))))
    );
  };
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };
  update();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  cleanups.push(() => {
    window.removeEventListener('scroll', requestUpdate);
    window.removeEventListener('resize', requestUpdate);
  });
};

const initBeforeAfter = () => {
  document.querySelectorAll<HTMLElement>('[data-before-after]').forEach((slider) => {
    const input = slider.querySelector<HTMLInputElement>('input[type="range"]');
    if (!input) return;
    const sync = () => {
      slider.style.setProperty('--split', `${input.value}%`);
      input.setAttribute('aria-valuetext', `${input.value}% before image visible`);
    };
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    sync();
    cleanups.push(() => {
      input.removeEventListener('input', sync);
      input.removeEventListener('change', sync);
    });
  });
};

const setGalleryFilter = (filter: string, gallery: HTMLElement) => {
  let visible = 0;
  gallery.querySelectorAll<HTMLElement>('[data-gallery-item]').forEach((item) => {
    const matches = filter === 'all' || (item.dataset.categories || '').split(',').includes(filter);
    item.hidden = !matches;
    if (matches) visible += 1;
  });
  const empty = gallery.querySelector<HTMLElement>('[data-gallery-empty]');
  if (empty) empty.hidden = visible > 0;
};

const getLightboxApi = (): LightboxApi => {
  if (lightboxApi?.shell.isConnected) return lightboxApi;
  lightboxApi?.destroy();

  const shell = document.createElement('div');
  shell.className = 'lightbox';
  shell.hidden = true;
  shell.setAttribute('role', 'dialog');
  shell.setAttribute('aria-modal', 'true');
  shell.setAttribute('aria-label', 'Gallery image viewer');
  shell.innerHTML = `
    <div class="lightbox-backdrop" data-lightbox-close></div>
    <div class="lightbox-panel">
      <button class="lightbox-close" type="button" data-lightbox-close aria-label="Close gallery image">Close</button>
      <button class="lightbox-nav lightbox-prev" type="button" data-lightbox-prev aria-label="Previous image">‹</button>
      <figure><img alt="" data-lightbox-image /><figcaption><span data-lightbox-badge></span><strong data-lightbox-caption></strong></figcaption></figure>
      <button class="lightbox-nav lightbox-next" type="button" data-lightbox-next aria-label="Next image">›</button>
    </div>`;
  document.body.append(shell);

  const image = shell.querySelector<HTMLImageElement>('[data-lightbox-image]');
  const caption = shell.querySelector<HTMLElement>('[data-lightbox-caption]');
  const badge = shell.querySelector<HTMLElement>('[data-lightbox-badge]');
  let items: HTMLButtonElement[] = [];
  let index = 0;
  let origin: HTMLElement | undefined;
  let touchStart = 0;
  let previousOverflow = '';

  const show = (direction = 0) => {
    if (!items.length || !image || !caption || !badge) return;
    index = (index + direction + items.length) % items.length;
    const item = items[index];
    image.src = item.dataset.full || '';
    image.alt = item.dataset.alt || '';
    caption.textContent = item.dataset.caption || '';
    badge.textContent = item.dataset.badge || '';
  };
  const close = () => {
    shell.hidden = true;
    document.body.classList.remove('lightbox-open');
    document.body.style.overflow = previousOverflow;
    if (origin?.isConnected) origin.focus({ preventScroll: true });
  };
  const open = (nextItems: HTMLButtonElement[], nextIndex: number) => {
    items = nextItems;
    index = nextIndex;
    origin = items[index];
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    show();
    shell.hidden = false;
    document.body.classList.add('lightbox-open');
    shell.querySelector<HTMLButtonElement>('[data-lightbox-close]')?.focus({ preventScroll: true });
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (shell.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') show(-1);
    if (event.key === 'ArrowRight') show(1);
  };
  const onClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-lightbox-close]')) close();
    if (target.closest('[data-lightbox-prev]')) show(-1);
    if (target.closest('[data-lightbox-next]')) show(1);
  };
  const onTouchStart = (event: TouchEvent) => {
    touchStart = event.touches[0]?.clientX || 0;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const end = event.changedTouches[0]?.clientX || 0;
    if (Math.abs(end - touchStart) > 48) show(end > touchStart ? -1 : 1);
  };

  shell.addEventListener('click', onClick);
  shell.addEventListener('touchstart', onTouchStart, { passive: true });
  shell.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('keydown', onKeyDown);
  lightboxApi = {
    shell,
    open,
    destroy: () => {
      shell.removeEventListener('click', onClick);
      shell.removeEventListener('touchstart', onTouchStart);
      shell.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('keydown', onKeyDown);
      close();
      shell.remove();
    },
  };
  return lightboxApi;
};

const initGallery = () => {
  document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((gallery) => {
    const buttons = Array.from(gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-filter]'));
    buttons.forEach((button) => {
      const onClick = () => {
        const filter = button.dataset.galleryFilter || 'all';
        buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        setGalleryFilter(filter, gallery);
      };
      button.addEventListener('click', onClick);
      cleanups.push(() => button.removeEventListener('click', onClick));
    });
    setGalleryFilter('all', gallery);
  });

  const items = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-gallery-item]'));
  if (!items.length) return;
  const api = getLightboxApi();
  items.forEach((item, index) => {
    const onClick = () => api.open(items, index);
    item.addEventListener('click', onClick);
    cleanups.push(() => item.removeEventListener('click', onClick));
  });
};

const initFinishScroll = () => {
  const scroll = document.querySelector<HTMLElement>('[data-finish-scroll]');
  const dots = document.querySelector<HTMLElement>('[data-finish-dots]');
  if (!scroll || !dots) return;
  const cards = Array.from(scroll.querySelectorAll<HTMLElement>('.finish-card'));
  const dotElements = Array.from(dots.querySelectorAll<HTMLElement>('span'));
  const update = () => {
    const width = cards[0]?.offsetWidth;
    if (!width) return;
    const active = Math.round(scroll.scrollLeft / (width + 16));
    dotElements.forEach((dot, index) => dot.classList.toggle('is-active', index === active));
  };
  scroll.addEventListener('scroll', update, { passive: true });
  update();
  cleanups.push(() => scroll.removeEventListener('scroll', update));
};

const initFindFinish = () => {
  const container = document.querySelector<HTMLElement>('[data-find-finish]');
  if (!container) return;
  const selection = { space: 'garage', finish: 'flake', style: 'clean' };
  const image = container.querySelector<HTMLImageElement>('[data-result-image]');
  const system = container.querySelector<HTMLElement>('[data-result-system]');
  const description = container.querySelector<HTMLElement>('[data-result-description]');
  const uses = container.querySelector<HTMLElement>('[data-result-uses]');
  const quote = container.querySelector<HTMLAnchorElement>('[data-result-quote]');

  try {
    const saved = JSON.parse(localStorage.getItem('prvn-finish-pref') || 'null');
    if (isConfiguratorSelection(saved)) Object.assign(selection, saved);
  } catch {
    // Corrupt local storage is deliberately ignored.
  }

  const render = () => {
    const recommendation = getConfiguratorRecommendation(selection);
    if (image) image.src = recommendation.image;
    if (system) system.textContent = recommendation.system;
    if (description) description.textContent = recommendation.description;
    if (uses) uses.textContent = recommendation.uses;
    if (quote) quote.href = buildConfiguratorQuoteUrl(selection);
    container.querySelectorAll<HTMLButtonElement>('[data-selector]').forEach((button) => {
      const selected = button.dataset.value === selection[button.dataset.selector as keyof typeof selection];
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    try {
      localStorage.setItem('prvn-finish-pref', JSON.stringify(selection));
    } catch {
      // Storage can be unavailable in privacy-restricted browsing modes.
    }
  };

  container.querySelectorAll<HTMLButtonElement>('[data-selector]').forEach((button) => {
    const onClick = () => {
      const key = button.dataset.selector as keyof typeof selection | undefined;
      const value = button.dataset.value;
      if (!key || !value) return;
      const next = { ...selection, [key]: value };
      if (!isConfiguratorSelection(next)) return;
      Object.assign(selection, next);
      render();
    };
    button.addEventListener('click', onClick);
    cleanups.push(() => button.removeEventListener('click', onClick));
  });
  render();
};

const init = () => {
  cleanup();
  const reduced = setMotionPreferenceClass();
  document.documentElement.classList.add('motion-initialized');
  initReveal(reduced);
  initCounters(reduced);
  initHeroGlare(reduced);
  initTiltCards(reduced);
  initProcessProgress(reduced);
  initBeforeAfter();
  initGallery();
  initFinishScroll();
  initFindFinish();
};

if (typeof window !== 'undefined') {
  onMotionPreferenceChange(init);
  document.addEventListener('astro:before-swap', cleanup);
  document.addEventListener('astro:page-load', init);
  init();
}
