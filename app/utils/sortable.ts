export const SORTABLE_OPTIONS = { animation: 150, ghostClass: "opacity-40" };

// On touch, a drag starts only after a long press so swiping over the grid still scrolls.
export const LONG_PRESS_SORTABLE_OPTIONS = {
  ...SORTABLE_OPTIONS,
  delay: 250,
  delayOnTouchOnly: true,
};
