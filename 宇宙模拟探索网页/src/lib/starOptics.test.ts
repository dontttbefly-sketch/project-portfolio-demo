import { describe, expect, it } from 'vitest';

import { closeStarGlowOpacity, getStarOpticalStyle } from './starOptics';

describe('close-up stellar optical rendering', () => {
  it('keeps Sun-like stars self-luminous at close range instead of matte or dark', () => {
    const style = getStarOpticalStyle('sun-like-star');

    expect(style.surfaceBaseMultiplier).toBeGreaterThanOrEqual(1);
    expect(style.coreEmission).toBeGreaterThanOrEqual(1.35);
    expect(style.rimEmission).toBeGreaterThanOrEqual(0.42);
    expect(style.haloOpacity).toBeGreaterThanOrEqual(0.34);
    expect(style.atmosphereOpacity).toBeGreaterThanOrEqual(0.18);
  });

  it('keeps red supergiants luminous while preserving their cooler color', () => {
    const style = getStarOpticalStyle('red-supergiant');

    expect(style.surfaceBaseMultiplier).toBeGreaterThanOrEqual(0.95);
    expect(style.coreEmission).toBeGreaterThanOrEqual(1.15);
    expect(style.haloOpacity).toBeGreaterThanOrEqual(0.3);
    expect(style.surfaceBaseMultiplier).toBeLessThanOrEqual(1.12);
  });

  it('keeps the stellar limb glow visible continuously as the disc resolves', () => {
    expect(closeStarGlowOpacity(0.15, 0)).toBeGreaterThan(0.1);
    expect(closeStarGlowOpacity(0.82, 0)).toBeGreaterThan(0.55);
    expect(closeStarGlowOpacity(0.82, 1)).toBeLessThanOrEqual(1);
  });
});
