import { balance } from '../balance';
import type { Content } from '../data/types';
import { capOf } from '../engine/effects';
import { feeding, foodsByHeal } from '../engine/health';
import { count } from '../engine/inventory';
import { ticksToSeconds } from '../engine/time';
import type { GameState } from '../engine/types';
import { duration } from './format';
import { Gauge } from './Gauge';
import { Region } from './Region';

/** The food box is this many slots, always (spec 2026-09-25-the-watched-screen 4.3: the user, "show the top 3"). A layout count, not tuning. */
export const FOOD_SLOTS = 3;

/**
 * Three slots (spec 2026-09-25-the-watched-screen 4.3): the foods on hand, in
 * the order they are eaten in, smallest heal first (#45), the first three; a
 * slot with nothing to fill it sits blank. A food eaten to zero leaves its
 * slot blank and a fourth waits in the pack, so the box never changes height.
 * Each filled slot: the name and one bite's heal, then a gauge whose bar is
 * the ember cooldown draining until the food can be eaten again, its label
 * the countdown or `ready`, its value on hand / stack.
 */
export function Food({ state, content }: { state: GameState; content: Content }) {
  const foods = foodsByHeal(content);
  const onHand = foods.filter((it) => count(state.inventory, it.id) > 0);
  const shown = onHand.slice(0, FOOD_SLOTS);
  // Loud only when nothing is feeding the player: eaten-as-it-lands is not starving (plan Revision 3).
  const starving = foods.length > 0 && foods.every((it) => !feeding(state, it.id));
  // The note counts every food on hand, not the three shown: a fourth still feeds the player (eat() reads them all).
  const note = onHand.length > 0 ? <span>{onHand.length} to eat</span> : starving ? <span className="hurt-text">nothing to eat</span> : undefined;
  const blanks = Array.from({ length: FOOD_SLOTS - shown.length }, (_, i) => i);
  return (
    <Region name="food" className="food" note={note}>
      {shown.map((it) => {
        const left = state.foodCooldowns[it.id] ?? 0;
        const cooling = left / balance.health.foodCooldownTicks;
        return (
          <div key={it.id} data-item={it.id} className="item food__row food__slot">
            <div className="food__name">{it.name}<b>+{it.healPerUnit} hp</b></div>
            <Gauge fill="run" pct={cooling * 100} resetKey={state.life} label={left > 0 ? duration(ticksToSeconds(left)) : 'ready'} value={`${count(state.inventory, it.id)}/${capOf(state, content, it.id)}`} />
          </div>
        );
      })}
      {/* A blank slot is a food row with nothing in it, a no-break space per line, so it is a filled row's height to the pixel and a landing fish moves nothing. */}
      {blanks.map((i) => (
        <div key={`blank-${i}`} className="item food__row food__slot food__slot--blank" aria-hidden="true">
          <div className="food__name">{'\u00a0'}</div>
          <Gauge fill="run" pct={0} resetKey={0} label={'\u00a0'} value={'\u00a0'} />
        </div>
      ))}
    </Region>
  );
}
