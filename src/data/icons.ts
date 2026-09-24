/**
 * The icon vocabulary: plain names the UI maps to components (src/ui/icons.tsx).
 * Data may not import the UI, so a roster names an icon and never holds one.
 * The list grows by a code change; a book picks from what exists.
 */
export const ICON_NAMES = [
  'sprout', 'axe', 'pickaxe', 'fishing-rod', 'bow-arrow',
  'wrench', 'house', 'chef-hat',
  'sword', 'route', 'message-circle', 'eye',
  'recycle', 'sailboat',
] as const;

export type IconName = (typeof ICON_NAMES)[number];
