import type { LucideIcon } from 'lucide-react';
import { Axe, BowArrow, ChefHat, Eye, FishingRod, House, MessageCircle, Pickaxe, Route, Settings, Sprout, Sword, Wrench } from 'lucide-react';
import type { SkillId } from '../data/types';

/** Spec section 8.1: the twelve, chosen to stay apart at 15px. Verified in lucide-react 1.47.0. */
export const SKILL_ICONS: Readonly<Record<SkillId, LucideIcon>> = {
  forage: Sprout, chop: Axe, mine: Pickaxe, fish: FishingRod, shoot: BowArrow,
  craft: Wrench, build: House, cook: ChefHat,
  fight: Sword, travel: Route, talk: MessageCircle, search: Eye,
};

export const GearIcon: LucideIcon = Settings;
