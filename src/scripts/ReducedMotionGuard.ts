export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const setMotionPreferenceClass = () => {
  const reduced = prefersReducedMotion();
  document.documentElement.classList.toggle('reduced-motion', reduced);
  document.documentElement.classList.toggle('motion-ok', !reduced);
  return reduced;
};

export const onMotionPreferenceChange = (callback: (reduced: boolean) => void) => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = () => callback(setMotionPreferenceClass());
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
};
