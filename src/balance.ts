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
    /**
     * Max health earned per death = growthRate ^ (minutes alive) - 1. The shape a
     * player reports for Increlution (spec 2026-09-23 section 3): it rewards the
     * longer life. User-chosen in the v0.2 brainstorm; 1.1 is UNDERIVED.
     */
    growthRate: 1.1,
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

  /**
   * The headless play (spec 2026-09-23-headless-play section 6). Agreed with the
   * user in the brainstorm. Bounds on the measuring bot only; a person playing
   * is never stopped.
   */
  play: {
    /** UNDERIVED, the user's pick. The bot gives up on a book at this, and a book may not declare more: past it a book cannot be loaded. */
    maxBookDays: 60,
    /** UNDERIVED, the user's pick. A book measuring under this is too short and pays no finishing points (when points exist). */
    minBookHours: 24,
    /** UNDERIVED, the user's pick. A life longer than this is flagged; the run goes on. */
    maxLifeMinutes: 60,
    /** Derived: half the user's 20-minute target for a sane life. A sane policy's life ending in death under this is warned about. */
    minLifeMinutes: 10,
    /** UNDERIVED, the user's pick, informed by the panel's measurement that a bot's estimate is good to about 20%. The measured range may sit this far either side of the declared length. */
    lengthTolerance: 0.25,
    /** UNDERIVED, the user's pick. Game time is shown in hours up to this, in whole days past it. */
    hoursShownUpTo: 48,
  },

  /**
   * Content numbers for the v0.1 slice, the Scrub. UNDERIVED, all of them:
   * they exist so three rows feed each other. The stone cap is deliberately
   * below the cabin's cost so the stall is exercised, and the cabin slows the
   * decay clock so completing it changes the run (its beat is what shows it in
   * v0.1; a rates chunk that shows the number arrives later). The hall is the
   * chapter's big sink (spec section 2), a placeholder no first life can
   * finish (the headless play measures about life 457): it keeps stone useful,
   * so time keeps passing and a run can die.
   */
  content: {
    scrub: {
      forage: { expCost: 4.2 },
      mine: { expCost: 6 },
      cabin: { expCost: 60, stone: 6, decayMultiplier: 0.8 },
      hall: { expCost: 5000, stone: 500 },
      berries: { cap: 20, healPerUnit: 4 },
      stone: { cap: 5 },
    },
  },
} as const;

export type Balance = typeof balance;
