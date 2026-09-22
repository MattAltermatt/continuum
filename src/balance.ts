/**
 * Every tuning number in Continuum, in one place.
 *
 * Nothing outside this file may contain a gameplay constant. If you would
 * write `if (hp <= 3)`, write `if (hp <= balance.health.base)` instead.
 *
 * Values marked UNDERIVED were chosen by feel and have no justification
 * beyond playtest impression. They are starting points for a balance pass,
 * not settled design. See MECHANICS.md.
 *
 * Changing any value here is a deliberate design act. Ask first.
 */
export const balance = {
  time: {
    /** Milliseconds between simulation ticks. 10 ticks per real second. */
    tickIntervalMs: 100,
    /** Ticks in one minute of real time. */
    ticksPerMinute: 600,
    /** Ticks of unbroken survival that award one skill point. 15 minutes. */
    ticksPerSkillPoint: 9_000,
  },

  health: {
    /** Starting maximum health, before any accrued rebirth bonus. */
    base: 100,
    /** UNDERIVED. Health lost per tick at the very start of a run. */
    baseDamagePerTick: 0.01,
    /** UNDERIVED. Decay is multiplied by this for each minute elapsed. */
    decayGrowthRate: 1.25,
    /** UNDERIVED. Ticks a food type waits before it may be eaten again. */
    foodCooldownTicks: 50,
  },

  rebirth: {
    /** UNDERIVED. Permanent max-health earned per death = factor * sqrt(ticks). */
    growthFactor: 0.01,
  },

  skills: {
    /** UNDERIVED. XP earned per tick before mastery and tool multipliers. */
    baseTickExp: 0.1,
    /** UNDERIVED. Each level costs this much more than the one before. */
    expCurveExponent: 1.1,
    /** The ledger that survives death: cheap levels, large multiplier. */
    coreMastery: {
      /** UNDERIVED. XP required for level 0 -> 1. */
      baseExp: 10,
      /** UNDERIVED. Added to the XP multiplier per level. */
      multiplierPerLevel: 0.05,
    },
    /** The ledger that resets on death: costly levels, small multiplier. */
    runMastery: {
      /** UNDERIVED. XP required for level 0 -> 1. */
      baseExp: 25,
      /** UNDERIVED. Added to the XP multiplier per level. */
      multiplierPerLevel: 0.01,
    },
  },

  automation: {
    /** UNDERIVED. Lifetime completions to unlock a repeatable action. */
    unlockRepeatable: 200,
    /** UNDERIVED. Lifetime completions to unlock a one-time action. */
    unlockOneTime: 5,
  },
} as const;

export type Balance = typeof balance;
