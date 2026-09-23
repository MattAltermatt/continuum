// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SKILL_IDS } from '../data/types';
import { newState } from '../engine/queue';
import { SkillsBand } from './SkillsBand';

describe('SkillsBand', () => {
  it('renders all twelve in order, with only the running one marked', () => {
    const { container } = render(<SkillsBand skills={newState().skills} runningSkill="mine" />);
    const cells = Array.from(container.querySelectorAll('[data-skill]')).map((el) => el.getAttribute('data-skill'));
    expect(cells).toEqual([...SKILL_IDS]);
    expect(container.querySelectorAll('.working')).toHaveLength(1);
    expect(container.querySelector('.working')).toHaveAttribute('data-skill', 'mine');
  });
});
