import type { LucideIcon } from 'lucide-react';
import { Axe, BowArrow, ChefHat, Eye, FishingRod, House, MessageCircle, Pickaxe, Recycle, Route, Sailboat, Settings, Sprout, Sword, Wrench } from 'lucide-react';
import type { IconName } from '../data/icons';

/** Spec 8.1: chosen to stay apart at 15px. Verified in lucide-react 1.47.0. Keyed by the data layer's vocabulary. */
export const ICONS: Readonly<Record<IconName, LucideIcon>> = {
  'sprout': Sprout, 'axe': Axe, 'pickaxe': Pickaxe, 'fishing-rod': FishingRod, 'bow-arrow': BowArrow,
  'wrench': Wrench, 'house': House, 'chef-hat': ChefHat,
  'sword': Sword, 'route': Route, 'message-circle': MessageCircle, 'eye': Eye,
  'recycle': Recycle, 'sailboat': Sailboat,
};

export const GearIcon: LucideIcon = Settings;
