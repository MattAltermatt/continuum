// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { saltRoad } from '../data/salt-road';
import { newState } from '../engine/queue';
import { SkillsBand } from './SkillsBand';

describe('SkillsBand', () => {
  it('renders the roster in roster order, with only the running one marked', () => {
    const { container } = render(<SkillsBand content={saltRoad} skills={newState(saltRoad.roster).skills} runningSkill="mine" />);
    const cells = Array.from(container.querySelectorAll('[data-skill]')).map((el) => el.getAttribute('data-skill'));
    expect(cells).toEqual(['forage', 'mine', 'build']);
    expect(container.querySelectorAll('.working')).toHaveLength(1);
    expect(container.querySelector('.working')).toHaveAttribute('data-skill', 'mine');
  });
  it('reads the roster it is given: another book, another count, order and name', () => {
    const roster = [{ id: 'build', name: 'Raise', icon: 'house' }, { id: 'fish', name: 'Cast', icon: 'fishing-rod' }] as const;
    const { container } = render(<SkillsBand content={{ roster }} skills={newState(roster).skills} runningSkill={null} />);
    const cells = Array.from(container.querySelectorAll('[data-skill]')).map((el) => el.getAttribute('data-skill'));
    expect(cells).toEqual(['build', 'fish']);
    expect(container).toHaveTextContent('Cast');
    expect(container.querySelectorAll('.working')).toHaveLength(0);
  });
});
