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
      <button class="lightbox-nav lightbox-prev" type="button" data-lightbox-prev aria-label="Previous image">\u2039</button>
      <figure>
        <img alt="" data-lightbox-image />
        <figcaption>
          <span data-lightbox-badge></span>
          <strong data-lightbox-caption></strong>
        </figcaption>
      </figure>
      <button class="lightbox-nav lightbox-next" type="button" data-lightbox-next aria-label="Next image">\u203A</button>
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

const initFinishScroll = () => {
  const scroll = document.querySelector<HTMLElement>('[data-finish-scroll]');
  const dots = document.querySelector<HTMLElement>('[data-finish-dots]');
  if (!scroll || !dots) return;

  const cards = Array.from(scroll.querySelectorAll<HTMLElement>('.finish-card'));
  const dotElements = Array.from(dots.querySelectorAll<HTMLElement>('span'));
  if (!cards.length) return;

  let ticking = false;
  const updateDots = () => {
    ticking = false;
    const scrollLeft = scroll.scrollLeft;
    const cardWidth = cards[0].offsetWidth + 16;
    const activeIndex = Math.round(scrollLeft / cardWidth);
    dotElements.forEach((dot, index) => dot.classList.toggle('is-active', index === activeIndex));
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateDots);
  };

  scroll.addEventListener('scroll', requestUpdate, { passive: true });
  cleanups.push(() => scroll.removeEventListener('scroll', requestUpdate));
};

const initFindFinish = () => {
  const container = document.querySelector<HTMLElement>('[data-find-finish]');
  if (!container) return;

  const selectors = container.querySelectorAll<HTMLButtonElement>('[data-selector]');
  const resultImage = container.querySelector<HTMLImageElement>('[data-result-image]');
  const resultSystem = container.querySelector<HTMLElement>('[data-result-system]');
  const resultDescription = container.querySelector<HTMLElement>('[data-result-description]');
  const resultUses = container.querySelector<HTMLElement>('[data-result-uses]');
  const resultQuote = container.querySelector<HTMLAnchorElement>('[data-result-quote]');

  const selections: Record<string, string> = {
    space: 'garage',
    finish: 'flake',
    style: 'clean',
  };

  const recommendations: Record<string, { system: string; image: string; description: string; uses: string }> = {
    'garage-flake-clean': {
      system: 'PRVN Flake System',
      image: '/assets/style-flake.webp',
      description: 'Clean chip broadcast with a neutral palette for a sharp, organized garage.',
      uses: 'Daily parking, storage, workshop areas',
    },
    'garage-flake-industrial': {
      system: 'PRVN Flake System',
      image: '/assets/style-flake.webp',
      description: 'Heavy-duty flake system with extra texture for tools, vehicles, and work traffic.',
      uses: 'Workshops, utility garages, mechanic bays',
    },
    'garage-flake-bold': {
      system: 'PRVN Flake System',
      image: '/assets/style-flake.webp',
      description: 'High-contrast flake blend with bold color choices for a statement garage floor.',
      uses: 'Show garages, car collections, feature spaces',
    },
    'garage-flake-luxury': {
      system: 'PRVN Flake System',
      image: '/assets/style-flake.webp',
      description: 'Premium flake broadcast with refined color blends for an elevated garage finish.',
      uses: 'High-end residential garages, collector spaces',
    },
    'garage-flake-blue-accent': {
      system: 'PRVN Flake System',
      image: '/assets/style-flake.webp',
      description: 'Blue-accent flake blend with cobalt and silver chips for a bold, custom look.',
      uses: 'Feature garages, automotive spaces',
    },
    'garage-flake-neutral': {
      system: 'PRVN Flake System',
      image: '/assets/style-flake.webp',
      description: 'Neutral flake palette with gray, tan, and white chips for a clean, versatile floor.',
      uses: 'Daily parking, storage, multi-use areas',
    },
    'garage-quartz-clean': {
      system: 'PRVN Quartz System',
      image: '/assets/style-quartz.webp',
      description: 'Refined quartz aggregate with a clean, professional look for residential garages.',
      uses: 'Garages, workshops, utility areas',
    },
    'garage-quartz-industrial': {
      system: 'PRVN Quartz System',
      image: '/assets/style-quartz.webp',
      description: 'Heavy-duty quartz with maximum traction for demanding garage environments.',
      uses: 'Mechanic bays, work garages, tool areas',
    },
    'garage-metallic-luxury': {
      system: 'PRVN Metallic System',
      image: '/assets/style-metallic.webp',
      description: 'High-gloss metallic with marble-like movement for a luxury garage statement floor.',
      uses: 'Show garages, collector car spaces',
    },
    'patio-flake-clean': {
      system: 'PRVN Flake System',
      image: '/assets/style-flake.webp',
      description: 'UV-conscious flake system for covered patios and outdoor entertaining areas.',
      uses: 'Covered patios, lanais, pool decks',
    },
    'commercial-quartz-clean': {
      system: 'PRVN Quartz System',
      image: '/assets/style-quartz.webp',
      description: 'Refined quartz aggregate with a clean, professional look for commercial traffic.',
      uses: 'Lobbies, restrooms, entries, retail floors',
    },
    'commercial-quartz-industrial': {
      system: 'PRVN Quartz System',
      image: '/assets/style-quartz.webp',
      description: 'Maximum-traction quartz for commercial kitchens, restrooms, and high-traffic entries.',
      uses: 'Restaurants, retail, medical facilities',
    },
    'commercial-metallic-luxury': {
      system: 'PRVN Metallic System',
      image: '/assets/style-metallic.webp',
      description: 'Statement metallic floor for commercial lobbies, showrooms, and hospitality spaces.',
      uses: 'Hotel lobbies, showrooms, high-end retail',
    },
    'interior-metallic-luxury': {
      system: 'PRVN Metallic System',
      image: '/assets/style-metallic.webp',
      description: 'High-gloss metallic with marble-like movement for a luxury interior statement.',
      uses: 'Living areas, showrooms, salons, studios',
    },
    'interior-metallic-bold': {
      system: 'PRVN Metallic System',
      image: '/assets/style-metallic.webp',
      description: 'Bold metallic with dramatic color movement for a high-impact interior floor.',
      uses: 'Feature rooms, entertainment spaces, galleries',
    },
    'interior-flake-clean': {
      system: 'PRVN Flake System',
      image: '/assets/style-flake.webp',
      description: 'Clean flake system for interior utility spaces, laundry rooms, and mudrooms.',
      uses: 'Laundry rooms, mudrooms, interior utility areas',
    },
    'countertop-metallic-luxury': {
      system: 'PRVN Metallic System',
      image: '/assets/style-metallic.webp',
      description: 'Marble-inspired metallic movement on countertops for a custom surface upgrade.',
      uses: 'Kitchen counters, bar tops, vanities',
    },
    'countertop-metallic-clean': {
      system: 'PRVN Metallic System',
      image: '/assets/style-metallic.webp',
      description: 'Clean metallic finish with subtle movement for a refined countertop surface.',
      uses: 'Kitchen counters, bathroom vanities, bar areas',
    },
  };

  const defaultRec = {
    system: 'PRVN Flake System',
    image: '/assets/style-flake.webp',
    description: 'Select your space, finish, and style above to see a personalized recommendation.',
    uses: 'Garages, shops, utility areas',
  };

  const updateResult = () => {
    const key = `${selections.space}-${selections.finish}-${selections.style}`;
    const rec = recommendations[key] || defaultRec;
    if (resultImage) resultImage.src = rec.image;
    if (resultSystem) resultSystem.textContent = rec.system;
    if (resultDescription) resultDescription.textContent = rec.description;
    if (resultUses) resultUses.textContent = rec.uses;
    if (resultQuote) {
      resultQuote.href = `/quote?space=${selections.space}&finish=${selections.finish}&style=${selections.style}`;
    }

    try {
      localStorage.setItem(
        'prvn-finish-pref',
        JSON.stringify({ space: selections.space, finish: selections.finish, style: selections.style })
      );
    } catch {}
  };

  selectors.forEach((button) => {
    const onClick = () => {
      const group = button.dataset.selector;
      const value = button.dataset.value;
      if (!group || !value) return;
      selections[group] = value;

      container
        .querySelectorAll<HTMLButtonElement>(`[data-selector="${group}"]`)
        .forEach((item) => {
          const isActive = item === button;
          item.classList.toggle('is-selected', isActive);
          item.setAttribute('aria-pressed', String(isActive));
        });

      updateResult();
    };
    button.addEventListener('click', onClick);
    cleanups.push(() => button.removeEventListener('click', onClick));
  });

  try {
    const saved = localStorage.getItem('prvn-finish-pref');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.space) selections.space = parsed.space;
      if (parsed.finish) selections.finish = parsed.finish;
      if (parsed.style) selections.style = parsed.style;

      Object.entries(selections).forEach(([group, value]) => {
        container
          .querySelectorAll<HTMLButtonElement>(`[data-selector="${group}"]`)
          .forEach((item) => {
            const isActive = item.dataset.value === value;
            item.classList.toggle('is-selected', isActive);
            item.setAttribute('aria-pressed', String(isActive));
          });
      });
    }
  } catch {}

  updateResult();
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
  onMotionPreferenceChange(() => init());
  document.addEventListener('DOMContentLoaded', init, { once: true });
  document.addEventListener('astro:page-load', init);
  init();
}
