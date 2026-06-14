export const siteUrl = 'https://prvn-epoxy-solutions-site.pages.dev';

export const business = {
  name: 'PRVN Epoxy Solutions',
  email: 'PRVNEPOXY@OUTLOOK.COM',
  emailHref: 'mailto:PRVNEPOXY@OUTLOOK.COM',
  phoneDisplay: '954-655-4199',
  phoneHref: 'tel:+19546554199',
  smsHref: 'sms:+19546554199',
  tagline: 'Premium epoxy floors for residential, commercial, and industrial spaces.',
  shortTagline: 'Residential | Commercial | Industrial',
};

export const serviceAreaCoverage = {
  summary: 'Florida Keys to West Palm Beach',
  description:
    'PRVN Epoxy Solutions serves South Florida from the Florida Keys through Miami-Dade and Broward to Palm Beach and West Palm Beach.',
  regions: [
    'Florida Keys',
    'Miami-Dade County',
    'Miami',
    'Broward County',
    'Fort Lauderdale area',
    'Palm Beach County',
    'West Palm Beach',
  ],
  schema: [
    { '@type': 'AdministrativeArea', name: 'Florida Keys' },
    { '@type': 'AdministrativeArea', name: 'Miami-Dade County' },
    { '@type': 'City', name: 'Miami' },
    { '@type': 'AdministrativeArea', name: 'Broward County' },
    { '@type': 'AdministrativeArea', name: 'Palm Beach County' },
    { '@type': 'City', name: 'West Palm Beach' },
  ],
};

export const finishFamilies = [
  {
    id: 'flake',
    title: 'Flake epoxy',
    href: '/services/flake-epoxy',
    description: 'A durable, textured system for garages, shops, utility areas, and high-traffic spaces.',
    image: '/assets/style-flake.webp',
    avif: '/assets/style-flake.avif',
    points: ['Slip-conscious texture', '24-hour install options', 'Wide chip blends'],
  },
  {
    id: 'quartz',
    title: 'Quartz epoxy',
    href: '/services/quartz-epoxy',
    description: 'A denser aggregate look with serious grip, polished depth, and commercial-grade toughness.',
    image: '/assets/style-quartz.webp',
    avif: '/assets/style-quartz.avif',
    points: ['Heavy-duty traction', 'Multi-color broadcast', 'Cleanable surface'],
  },
  {
    id: 'metallic',
    title: 'Metallic epoxy',
    href: '/services/metallic-epoxy',
    description: 'A fluid, high-gloss statement floor with marble-like movement and a custom finish.',
    image: '/assets/style-metallic.webp',
    avif: '/assets/style-metallic.avif',
    points: ['Luxury visual depth', 'Custom color movement', 'Showroom finish'],
  },
];

export const services = [
  {
    id: 'flake',
    title: 'Garage and flake floors',
    description:
      'Transform bare concrete into a clean, resilient floor designed for vehicles, tools, storage, and daily wear.',
    features: ['Concrete grind and prep', 'Broadcast flake system', 'UV-stable topcoat options'],
  },
  {
    id: 'quartz',
    title: 'Quartz and heavy-use coatings',
    description:
      'A premium aggregate system for entries, work areas, commercial restrooms, kitchens, and high-traffic zones.',
    features: ['Extra texture underfoot', 'Commercial-grade finish', 'Easy maintenance plan'],
  },
  {
    id: 'metallic',
    title: 'Metallic designer floors',
    description:
      'A dramatic glossy finish for interiors, showrooms, salons, retail spaces, studios, and feature rooms.',
    features: ['Custom color flow', 'High-gloss finish', 'One-of-one visual result'],
  },
  {
    id: 'solid',
    title: 'Solid color epoxy',
    description: 'A clean, modern floor coating when the space calls for a sharp single-color finish.',
    features: ['Minimal visual noise', 'Durable topcoat', 'Professional concrete prep'],
  },
  {
    id: 'countertops',
    title: 'Epoxy countertops',
    description: 'Refresh counters with a marble-inspired epoxy finish at a fraction of full slab replacement cost.',
    features: ['Kitchen and bar surfaces', 'Marble-inspired movement', 'High-impact visual upgrade'],
  },
  {
    id: 'logo',
    title: 'Logos and custom details',
    description: 'Add brand marks, borders, color accents, glitter systems, and custom visual details to the floor.',
    features: ['Logo-ready layouts', 'Glitter color options', 'Branded commercial spaces'],
  },
];

export const processSteps = [
  {
    title: 'Estimate',
    text: 'PRVN reviews the space, finish goal, condition, timeline, and any moisture or repair concerns.',
  },
  {
    title: 'Prep',
    text: 'The slab is cleaned, mechanically profiled, repaired where needed, and staged for coating.',
  },
  {
    title: 'Coat',
    text: 'Base coat, broadcast or metallic finish, and protective topcoat are installed to match the selected system.',
  },
  {
    title: 'Cure',
    text: 'You receive cure guidance, care instructions, and next steps for returning the space to use.',
  },
];

export const proofPoints = [
  {
    value: 24,
    suffix: ' hr',
    label: 'Flake floor install options after prep review',
  },
  {
    value: 3,
    suffix: ' ways',
    label: 'Call, text, or email for a free estimate',
  },
  {
    display: 'R / C / I',
    label: 'Residential, commercial, and industrial coatings',
  },
];

export const galleryFilters = [
  { id: 'all', label: 'All' },
  { id: 'flakes', label: 'Flakes' },
  { id: 'quartz', label: 'Quartz' },
  { id: 'metallic', label: 'Metallic' },
  { id: 'solid', label: 'Solid' },
  { id: 'carbon-fiber', label: 'Carbon Fiber' },
];

export const galleryImages = [
  {
    src: '/assets/gallery-project-01.webp',
    full: '/assets/gallery-project-01.webp',
    alt: 'Flakes epoxy floor finish in a garage',
    caption: 'Flakes epoxy finish with blue, black, white, and gray chip broadcast.',
    badge: 'Flakes',
    categories: ['flakes'],
    width: 941,
    height: 1672,
  },
  {
    src: '/assets/gallery-project-02.webp',
    full: '/assets/gallery-project-02.webp',
    alt: 'Carbon fiber style epoxy floor finish in a garage',
    caption: 'Carbon Fiber epoxy finish with a dark, high-contrast garage look.',
    badge: 'Carbon Fiber',
    categories: ['carbon-fiber'],
    width: 1400,
    height: 1050,
  },
  {
    src: '/assets/gallery-project-03.webp',
    full: '/assets/gallery-project-03.webp',
    alt: 'Quartz epoxy floor finish in a kitchen-style space',
    caption: 'Quartz epoxy finish with a bright, refined aggregate texture.',
    badge: 'Quartz',
    categories: ['quartz'],
    width: 1400,
    height: 788,
  },
  {
    src: '/assets/gallery-project-04.webp',
    full: '/assets/gallery-project-04.webp',
    alt: 'Solid color epoxy floor finish in a clean commercial-style room',
    caption: 'Solid epoxy finish with a clean, seamless high-gloss surface.',
    badge: 'Solid',
    categories: ['solid'],
    width: 941,
    height: 1672,
  },
  {
    src: '/assets/gallery-project-05.webp',
    full: '/assets/gallery-project-05.webp',
    alt: 'Metallic epoxy floor finish with black and gold movement',
    caption: 'Metallic epoxy finish with glossy black and gold depth.',
    badge: 'Metallic',
    categories: ['metallic'],
    width: 941,
    height: 1672,
  },
];

export const faqs = [
  {
    question: 'How fast can a flake floor be installed?',
    answer:
      'PRVN advertises new epoxy flake floors in as little as 24 hours. The final schedule depends on slab condition, repairs, moisture, and coating system.',
  },
  {
    question: 'Do you handle residential and commercial projects?',
    answer: 'Yes. PRVN positions its work for residential, commercial, and industrial epoxy coating needs.',
  },
  {
    question: 'Can I choose colors and finish type?',
    answer: 'Yes. The site supports flake, quartz, solid, metallic, glitter, countertop, and logo-focused options.',
  },
  {
    question: 'What areas do you cover?',
    answer:
      'PRVN covers South Florida from the Florida Keys through Miami-Dade and Broward to Palm Beach and West Palm Beach.',
  },
  {
    question: 'What details help with a quote?',
    answer:
      'Square footage, photos, slab condition, project address, finish preference, timeline, and how the space is used help PRVN prepare a better estimate.',
  },
];
