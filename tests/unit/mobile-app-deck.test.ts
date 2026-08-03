import { describe, expect, it } from 'vitest';

import { isPhoneAppViewport } from '../../src/scripts/mobile-app-deck';

describe('isPhoneAppViewport', () => {
  it('enables the app deck for a touch-first phone in portrait or landscape', () => {
    expect(isPhoneAppViewport({ coarsePointer: true, hoverNone: true, width: 390, height: 844 })).toBe(true);
    expect(isPhoneAppViewport({ coarsePointer: true, hoverNone: true, width: 844, height: 390 })).toBe(true);
  });

  it('keeps desktop and tablet browsing in the standard document flow', () => {
    expect(isPhoneAppViewport({ coarsePointer: false, hoverNone: false, width: 390, height: 844 })).toBe(false);
    expect(isPhoneAppViewport({ coarsePointer: true, hoverNone: true, width: 768, height: 1024 })).toBe(false);
  });
});
