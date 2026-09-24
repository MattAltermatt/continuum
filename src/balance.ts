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
    /**
     * UNDERIVED, the user's pick, informed by the panel's measurement that a bot's estimate is good to about 20%. The measured range may sit this far either side of the declared length.
     * The end-to-end measure test also reads it for spec 2026-09-23-the-windward-run section 11's target 8 (automation within 25% of hands-on): the spec names 25% for both, so moving this moves that.
     */
    lengthTolerance: 0.25,
    /** UNDERIVED, the user's pick. Game time is shown in hours up to this, in whole days past it. */
    hoursShownUpTo: 48,
  },

  /** The measuring bot's habits (spec 2026-09-23-the-windward-run section 11), apart from the play's bounds. */
  policy: {
    /** UNDERIVED, picked 2026-09-23: the attentive player glances at the queue about twice a minute of game time. */
    checkEverySeconds: 30,
  },

  /** The pack (#45). */
  inventory: {
    /** The user's decision on #45: "start at 5". Every item but a key holds at most this, raised by capacity rows. */
    stackCap: 5,
  },

  /** The loop in src/state/ (spec section 10). */
  loop: {
    /** UNDERIVED, picked 2026-09-23: a wake catches up at most this much game time, so a laptop opened after a night does not fast-forward it. Chrome wakes a hidden tab about once a minute; five leaves room. */
    maxCatchUpMinutes: 5,
  },

  /**
   * The Windward Run (spec 2026-09-23-the-windward-run section 5.3). UNDERIVED,
   * all of them, picked 2026-09-23 under the user's instruction ("pick
   * something, remember it, and make it tunable"), then tuned the same day by
   * the headless play against the spec's section 11 targets (plan Task 5; the
   * reading, with every value and what it measured, is under "Task 5 reading"
   * in docs/plans/2026-09-23-the-windward-run.md). What each lever moves, as
   * measured: port I and II material costs set how many scrap and brass a life
   * makes, so a harvest earns its chip no later than the one-times it feeds;
   * pirates sets when port II is first reached, the guardian (compass) port
   * III, and enforcers, salons and varro the finish; the canape's chip price,
   * with pirates, sets the book's length (at 2 chips every measured player
   * runs 42-47 h) and bounds automation's gap on the hands-on player from
   * above: 1% at 1 chip, 11% at 2, 34% at 3, past spec section 11's 25%,
   * because a JIT food fills to its cap whatever its input costs (code panel
   * rounds two and three re-measured it).
   */
  content: {
    windward: {
      fish: { expCost: 4 },
      cloudFish: { healPerUnit: 4 },
      salvage: { expCost: 5 },
      hull: { expCost: 60, scrap: 16, decayMultiplier: 0.8 },
      net: { expCost: 40, scrap: 12, fishMultiplier: 1.25 },
      satchel: { expCost: 50, scrap: 20, capacity: 5 },
      /** UNDERIVED, the user's pick (#78, reading B in plan 2026-09-24-pages): closes Port Cinder's first page. */
      sails: { expCost: 20 },
      pirates: { expCost: 1450, hurts: 0.3 },
      /** UNDERIVED, the user's pick (#78, reading B): closes Port Cinder, casting off. */
      openSky: { expCost: 30 },
      eels: { expCost: 8 },
      skyEel: { healPerUnit: 10 },
      ruin: { expCost: 7 },
      wardens: { expCost: 200, hurts: 0.5 },
      halls: { expCost: 150 },
      fittings: { expCost: 80, brass: 20, decayMultiplier: 0.8 },
      chest: { expCost: 70, brass: 24, capacity: 5 },
      cutlass: { expCost: 60, brass: 16, fightMultiplier: 1.25 },
      compass: { expCost: 900, hurts: 0.6 },
      dealers: { expCost: 6 },
      kitchens: { expCost: 8, chips: 1 },
      canape: { healPerUnit: 16 },
      door: { expCost: 120, chips: 15 },
      dock: { expCost: 100, chips: 15, decayMultiplier: 0.8 },
      trunk: { expCost: 90, chips: 20, capacity: 5 },
      enforcers: { expCost: 500, hurts: 1 },
      salons: { expCost: 300 },
      varro: { expCost: 400 },
    },
  },
} as const;

export type Balance = typeof balance;
