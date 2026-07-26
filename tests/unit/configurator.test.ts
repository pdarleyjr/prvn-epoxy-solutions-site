import { describe, expect, it } from 'vitest';

import {
  buildConfiguratorQuoteUrl,
  configuratorFinishes,
  configuratorSpaces,
  configuratorStyles,
  getConfiguratorRecommendation,
  isConfiguratorSelection,
} from '~/scripts/configurator';

describe('configurator recommendations', () => {
  it('returns a relevant, complete result for every offered selection', () => {
    for (const space of configuratorSpaces) {
      for (const finish of configuratorFinishes) {
        for (const style of configuratorStyles) {
          const selection = { space: space.id, finish: finish.id, style: style.id };
          const result = getConfiguratorRecommendation(selection);
          const quoteUrl = new URL(buildConfiguratorQuoteUrl(selection), 'https://example.test');

          expect(result.system).toBeTruthy();
          expect(result.image).toMatch(/^\/assets\/style-(flake|quartz|metallic)\.webp$/);
          expect(result.description.length).toBeGreaterThan(24);
          expect(result.uses.length).toBeGreaterThan(8);
          expect(quoteUrl.searchParams.get('space')).toBe(space.id);
          expect(quoteUrl.searchParams.get('finish')).toBe(finish.id);
          expect(quoteUrl.searchParams.get('style')).toBe(style.id);
        }
      }
    }
  });

  it('rejects unknown selections instead of persisting malformed values', () => {
    expect(isConfiguratorSelection({ space: 'unknown', finish: 'flake', style: 'clean' })).toBe(false);
    expect(isConfiguratorSelection({ space: 'garage', finish: 'unknown', style: 'clean' })).toBe(false);
    expect(isConfiguratorSelection({ space: 'garage', finish: 'flake', style: 'unknown' })).toBe(false);
  });
});
