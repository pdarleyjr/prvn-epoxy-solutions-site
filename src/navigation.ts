import { getPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    { text: 'Services', href: getPermalink('/services') },
    { text: 'Gallery', href: getPermalink('/gallery') },
    { text: 'Process', href: getPermalink('/process') },
    { text: 'About', href: getPermalink('/about') },
    { text: 'Contact', href: getPermalink('/contact') },
  ],
  actions: [{ text: 'Free quote', href: getPermalink('/quote') }],
};

export const footerData = {
  links: [
    {
      title: 'Services',
      links: [
        { text: 'Flake epoxy', href: getPermalink('/services/flake-epoxy') },
        { text: 'Quartz epoxy', href: getPermalink('/services/quartz-epoxy') },
        { text: 'Metallic epoxy', href: getPermalink('/services/metallic-epoxy') },
        { text: 'Countertops', href: getPermalink('/services/epoxy-countertops') },
      ],
    },
    {
      title: 'Company',
      links: [
        { text: 'Process', href: getPermalink('/process') },
        { text: 'Gallery', href: getPermalink('/gallery') },
        { text: 'About', href: getPermalink('/about') },
        { text: 'Service area', href: getPermalink('/service-areas') },
      ],
    },
    {
      title: 'Start',
      links: [
        { text: 'Get a quote', href: getPermalink('/quote') },
        { text: 'Call 954-655-4199', href: 'tel:+19546554199' },
        { text: 'Text PRVN', href: 'sms:+19546554199' },
        { text: 'Email PRVN', href: 'mailto:PRVNEPOXY@OUTLOOK.COM' },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Privacy', href: getPermalink('/privacy') },
    { text: 'Terms', href: getPermalink('/terms') },
  ],
  footNote: 'Residential | Commercial | Industrial epoxy floor coatings from the Florida Keys to West Palm Beach.',
};
