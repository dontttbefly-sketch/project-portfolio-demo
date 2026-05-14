import { describe, expect, it } from 'vitest';
import {
  calculateGoalProgress,
  calculateHabitStreak,
  calculateWeeklyCompletionRate,
  getWeekStart,
  type DailyActionLike,
  type HabitCompletionLike
} from './progress';

describe('progress calculations', () => {
  it('calculates goal progress from completed actions tied to a goal', () => {
    const actions: DailyActionLike[] = [
      { goalId: 'goal-a', status: 'done' },
      { goalId: 'goal-a', status: 'todo' },
      { goalId: 'goal-a', status: 'done' },
      { goalId: 'goal-b', status: 'done' }
    ];

    expect(calculateGoalProgress('goal-a', actions)).toBe(67);
  });

  it('returns zero progress when a goal has no actions yet', () => {
    expect(calculateGoalProgress('missing', [])).toBe(0);
  });

  it('calculates current habit streak ending today', () => {
    const completions: HabitCompletionLike[] = [
      { habitId: 'habit-a', date: '2026-05-08', completed: true },
      { habitId: 'habit-a', date: '2026-05-09', completed: true },
      { habitId: 'habit-a', date: '2026-05-10', completed: true },
      { habitId: 'habit-b', date: '2026-05-10', completed: true }
    ];

    expect(calculateHabitStreak('habit-a', completions, '2026-05-10')).toBe(3);
  });

  it('stops habit streak at the first missed day', () => {
    const completions: HabitCompletionLike[] = [
      { habitId: 'habit-a', date: '2026-05-08', completed: true },
      { habitId: 'habit-a', date: '2026-05-09', completed: false },
      { habitId: 'habit-a', date: '2026-05-10', completed: true }
    ];

    expect(calculateHabitStreak('habit-a', completions, '2026-05-10')).toBe(1);
  });

  it('calculates weekly completion rate for actions within the week', () => {
    const actions: DailyActionLike[] = [
      { date: '2026-05-04', status: 'done' },
      { date: '2026-05-05', status: 'todo' },
      { date: '2026-05-09', status: 'done' },
      { date: '2026-05-11', status: 'done' }
    ];

    expect(calculateWeeklyCompletionRate(actions, '2026-05-06')).toBe(67);
  });

  it('uses Monday as the start of a week', () => {
    expect(getWeekStart('2026-05-10')).toBe('2026-05-04');
  });
});
