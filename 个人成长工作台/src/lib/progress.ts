import { addDays, parseDateKey, toUtcDateKey } from './dates';
import type { ActionStatus } from '../types';

export interface DailyActionLike {
  goalId?: string;
  date?: string;
  status: ActionStatus;
}

export interface HabitCompletionLike {
  habitId: string;
  date: string;
  completed: boolean;
}

export function calculateGoalProgress(goalId: string, actions: DailyActionLike[]): number {
  const goalActions = actions.filter((action) => action.goalId === goalId);
  if (goalActions.length === 0) {
    return 0;
  }

  const completed = goalActions.filter((action) => action.status === 'done').length;
  return Math.round((completed / goalActions.length) * 100);
}

export function getWeekStart(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + mondayOffset);
  return toUtcDateKey(date);
}

export function calculateWeeklyCompletionRate(actions: DailyActionLike[], dateKey: string): number {
  const weekStart = getWeekStart(dateKey);
  const weekEnd = addDays(weekStart, 6);
  const weekActions = actions.filter((action) => {
    return action.date !== undefined && action.date >= weekStart && action.date <= weekEnd;
  });

  if (weekActions.length === 0) {
    return 0;
  }

  const completed = weekActions.filter((action) => action.status === 'done').length;
  return Math.round((completed / weekActions.length) * 100);
}

export function calculateHabitStreak(
  habitId: string,
  completions: HabitCompletionLike[],
  today: string
): number {
  const completionMap = new Map(
    completions
      .filter((completion) => completion.habitId === habitId)
      .map((completion) => [completion.date, completion.completed])
  );

  let streak = 0;
  let cursor = today;

  while (completionMap.get(cursor) === true) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
