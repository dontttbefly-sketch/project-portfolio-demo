export type GoalStatus = 'active' | 'paused' | 'done';
export type ActionStatus = 'todo' | 'done';
export type HabitFrequency = 'daily' | 'weekly';

export interface GrowthDomain {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface Goal {
  id: string;
  domainId: string;
  title: string;
  why: string;
  status: GoalStatus;
  targetDate: string;
  progress: number;
}

export interface Habit {
  id: string;
  goalId: string;
  title: string;
  frequency: HabitFrequency;
  active: boolean;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}

export interface DailyAction {
  id: string;
  goalId: string;
  title: string;
  date: string;
  status: ActionStatus;
}

export interface WeeklyReview {
  id: string;
  weekStart: string;
  wins: string;
  blockers: string;
  adjustments: string;
  nextWeekFocus: string;
}

export interface AppState {
  version: 1;
  domains: GrowthDomain[];
  goals: Goal[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  dailyActions: DailyAction[];
  weeklyReviews: WeeklyReview[];
}
