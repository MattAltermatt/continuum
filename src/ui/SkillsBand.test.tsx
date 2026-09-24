// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { saltRoadFixture } from '../test-utils/salt-road';
import { newState } from '../engine/queue';
import type { GameState } from '../engine/types';
import { SkillsBand } from './SkillsBand';

function cellOf(container: HTMLElement, id: string): HTMLElement {
  return container.querySelector(`[data-skill="${id}"]`) as HTMLElement;
}

describe('SkillsBand', () => {
  it('renders the roster in roster order, with only the running one marked', () => {
    const { container } = render(<SkillsBand content={saltRoadFixture} state={newState(saltRoadFixture.roster)} runningSkill="mine" />);
    const cells = Array.from(container.querySelectorAll('[data-skill]')).map((el) => el.getAttribute('data-skill'));
    expect(cells).toEqual(['forage', 'mine', 'build']);
    expect(container.querySelectorAll('.working')).toHaveLength(1);
    expect(container.querySelector('.working')).toHaveAttribute('data-skill', 'mine');
  });
  it('reads the roster it is given: another book, another count, order and name', () => {
    const roster = [{ id: 'build', name: 'Raise', icon: 'house' }, { id: 'fish', name: 'Cast', icon: 'fishing-rod' }] as const;
    const { container } = render(<SkillsBand content={{ ...saltRoadFixture, roster }} state={newState(roster)} runningSkill={null} />);
    const cells = Array.from(container.querySelectorAll('[data-skill]')).map((el) => el.getAttribute('data-skill'));
    expect(cells).toEqual(['build', 'fish']);
    expect(container).toHaveTextContent('Cast');
    expect(container.querySelectorAll('.working')).toHaveLength(0);
  });
  it("the running skill's ledger names the top entry's row; another skill's has no right now", () => {
    const state: GameState = { ...newState(saltRoadFixture.roster), queue: [{ id: 0, actionId: 'mine', mode: 'repeat', by: 'player' }] };
    const { container } = render(<SkillsBand content={saltRoadFixture} state={state} runningSkill="mine" />);
    fireEvent.mouseEnter(cellOf(container, 'mine'));
    const mine = screen.getByRole('dialog', { name: 'Mine ledger' });
    expect(within(mine).getByText('action').nextElementSibling).toHaveTextContent('stone');
    expect(within(mine).getByText('rate').nextElementSibling).toHaveTextContent(/^1 stone \//);
    fireEvent.mouseLeave(cellOf(container, 'mine'));
    fireEvent.mouseEnter(cellOf(container, 'forage'));
    expect(within(screen.getByRole('dialog', { name: 'Forage ledger' })).queryByText('right now')).toBeNull();
  });
});
