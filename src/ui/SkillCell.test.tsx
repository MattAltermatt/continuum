// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { balance } from '../balance';
import { expToNextLevel, multiplier, tickExp } from '../engine/skills';
import { ticksPerSecond } from '../engine/time';
import { countdown, fraction } from './format';
import { SkillCell } from './SkillCell';

const forage = { core: { level: 12, exp: 14.6 }, run: { level: 5, exp: 37.6 } };
const coreCost = expToNextLevel(balance.skills.coreMastery.baseExp, 12);
const perSecond = tickExp(forage) * ticksPerSecond();

describe('SkillCell', () => {
  it('shows the name, the multiplier from balance, and Lv on each line', () => {
    render(<SkillCell id="forage" state={forage} running={false} />);
    expect(screen.getByText('Forage')).toBeInTheDocument();
    expect(screen.getByText(`×${multiplier(forage).toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText('Lv 12')).toBeInTheDocument();
    expect(screen.getByText('Lv 5')).toBeInTheDocument();
  });
  it('shows the XP fraction under each bar and no time when idle', () => {
    render(<SkillCell id="forage" state={forage} running={false} />);
    expect(screen.getByText(fraction(14.6, coreCost))).toBeInTheDocument();
    expect(screen.queryByText(/↑/)).not.toBeInTheDocument();
  });
  it('shows the level-up mark and the time to the next core level only when running', () => {
    render(<SkillCell id="forage" state={forage} running={true} />);
    expect(screen.getByText(`↑ ${countdown((coreCost - 14.6) / perSecond)}`)).toBeInTheDocument();
  });
  it('marks the running cell as working, and names it for assistive tech', () => {
    const { container } = render(<SkillCell id="forage" state={forage} running={true} />);
    expect(container.firstChild).toHaveClass('working');
    expect(screen.getByText('running')).toHaveClass('visually-hidden');
  });
});
