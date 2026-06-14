import { inView } from 'motion';

import { onMotionPreferenceChange, setMotionPreferenceClass } from './ReducedMotionGuard';

type Cleanup = () => void;

let cleanups: Cleanup[] = [];
let lightboxApi: { open: (items: HTMLButtonElement[], index: number) => void } | undefined;

const cleanup = () => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
};

const isFinePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const initReveal = (reduced: boolean) => {
  const revealElements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

  if (reduced) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  revealElements.forEach((element) => element.classList.remove('is-visible'));

  const stop = inView(
    revealElements,
    (element) => {
      const target = element as HTMLElement;
      const delay = Number(target.dataset.revealDelay || 0);
      target.classList.add('is-visible');
      target.animate(
        [
          { opacity: 0, transform: 'translateY(18px)' },
          { opacity: 1, transform: 'translateY(0px)' },
        ],
        { duration: 700, delay: delay * 1000, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
      );
    },
    { amount: 0.16, margin: '0px 0px -8% 0px' }
  );

  cleanups.push(stop);
};

const initCounters = (reduced: boolean) => {
  const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-counter]'));

  counters.forEach((counter) => {
    const value = Number(counter.dataset.counter || 0);
    const suffix = counter.dataset.counterSuffix || '';
    if (!Number.isFinite(value)) return;
    counter.textContent = `0${suffix}`;

    if (reduced) {
      counter.textContent = `${value}${suffix}`;
      return;
    }

    const stop = inView(counter, () => {
      const start = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / 1100);
        const eased = 1 - Math.pow(1 - progress, 4);
        counter.textContent = `${Math.round(value * eased)}${suffix}`;
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
  const onPointerMove = (event: PointerEvent) => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      hero.style.setProperty('--glare-x', `${x}%`);
      hero.style.setProperty('--glare-y', `${y}%`);
    });
  };

  const onPointerLeave = () => {
    hero.style.removeProperty('--glare-x');
    hero.style.removeProperty('--glare-y');
  };

  hero.addEventListener('pointermove', onPointerMove);
  hero.addEventListener('pointerleave', onPointerLeave);
  cleanups.push(() => {
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    window.cancelAnimationFrame(frame);
  });
};

const initTiltCards = (reduced: boolean) => {
  if (reduced || !isFinePointer()) return;

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    const onPointerMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`);
      card.style.setProperty('--tilt-y', `${(x * 7).toFixed(2)}deg`);
      card.style.setProperty('--shine-x', `${((x + 0.5) * 100).toFixed(1)}%`);
    };

    const onPointerLeave = () => {
      card.style.removeProperty('--tilt-x');
      card.style.removeProperty('--tilt-y');
      card.style.removeProperty('--shine-x');
    };

    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerleave', onPointerLeave);
    cleanups.push(() => {
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerleave', onPointerLeave);
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
    const total = rect.height + viewport * 0.45;
    const progress = Math.min(1, Math.max(0, (viewport * 0.78 - rect.top) / total));
    timeline.style.setProperty('--progress', progress.toFixed(3));
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

const setFilter = (filter: string, gallery: HTMLElement) => {
  let visibleCount = 0;
  gallery.querySelectorAll<HTMLElement>('[data-gallery-item]').forEach((item) => {
    const categories = (item.dataset.categories || '').split(',').filter(Boolean);
    const visible = filter === 'all' || categories.includes(filter);
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  const empty = gallery.querySelector<HTMLElement>('[data-gallery-empty]');
  if (empty) empty.hidden = visibleCount > 0;
};

const createLightbox = () => {
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
      <figure>
        <img alt="" data-lightbox-image />
        <figcaption>
          <span data-lightbox-badge></span>
          <strong data-lightbox-caption></strong>
        </figcaption>
      </figure>
      <button class="lightbox-nav lightbox-next" type="button" data-lightbox-next aria-label="Next image">›</button>
    </div>`;
  document.body.append(shell);
  return shell;
};

const getLightboxApi = () => {
  if (lightboxApi) return lightboxApi;

  const lightbox = createLightbox();
  const image = lightbox.querySelector<HTMLImageElement>('[data-lightbox-image]');
  const caption = lightbox.querySelector<HTMLElement>('[data-lightbox-caption]');
  const badge = lightbox.querySelector<HTMLElement>('[data-lightbox-badge]');
  const prev = lightbox.querySelector<HTMLButtonElement>('[data-lightbox-prev]');
  const next = lightbox.querySelector<HTMLButtonElement>('[data-lightbox-next]');
  let activeItems: HTMLButtonElement[] = [];
  let activeIndex = 0;
  let touchStart = 0;

  const open = (items: HTMLButtonElement[], index: number) => {
    activeItems = items;
    activeIndex = index;
    const item = activeItems[activeIndex];
    if (!item || !image || !caption || !badge) return;
    image.src = item.dataset.full || '';
    image.alt = item.dataset.alt || '';
    caption.textContent = item.dataset.caption || '';
    badge.textContent = item.dataset.badge || '';
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    lightbox.querySelector<HTMLButtonElement>('[data-lightbox-close]')?.focus();
  };

  const close = () => {
    lightbox.hidden = true;
    document.body.classList.remove('lightbox-open');
    activeItems[activeIndex]?.focus();
  };

  const show = (direction: number) => {
    if (!activeItems.length) return;
    activeIndex = (activeIndex + direction + activeItems.length) % activeItems.length;
    open(activeItems, activeIndex);
  };

  lightbox.querySelectorAll('[data-lightbox-close]').forEach((element) => element.addEventListener('click', close));
  prev?.addEventListener('click', () => show(-1));
  next?.addEventListener('click', () => show(1));
  document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') show(-1);
    if (event.key === 'ArrowRight') show(1);
  });
  lightbox.addEventListener('touchstart', (event) => {
    touchStart = event.touches[0]?.clientX || 0;
  });
  lightbox.addEventListener('touchend', (event) => {
    const end = event.changedTouches[0]?.clientX || 0;
    if (Math.abs(end - touchStart) > 48) show(end > touchStart ? -1 : 1);
  });

  lightboxApi = { open };
  return lightboxApi;
};

const initGallery = () => {
  document.querySelectorAll<HTMLElement>('[data-gallery]').forEach((gallery) => {
    const filterButtons = Array.from(gallery.querySelectorAll<HTMLButtonElement>('[data-gallery-filter]'));
    filterButtons.forEach((button) => {
      const onClick = () => {
        const filter = button.dataset.galleryFilter || 'all';
        filterButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        setFilter(filter, gallery);
      };
      button.addEventListener('click', onClick);
      cleanups.push(() => button.removeEventListener('click', onClick));
    });

    setFilter('all', gallery);
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
};

if (typeof window !== 'undefined') {
  onMotionPreferenceChange(() => init());
  document.addEventListener('DOMContentLoaded', init, { once: true });
  document.addEventListener('astro:page-load', init);
  init();
}
