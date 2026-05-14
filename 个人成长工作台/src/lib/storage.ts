import { todayKey } from './dates';
import type { AppState } from '../types';

export const STORAGE_KEY = 'growth_os.v1';

export interface ParseFailure {
  ok: false;
  error: string;
}

const COLLECTIONS = [
  'domains',
  'goals',
  'habits',
  'habitCompletions',
  'dailyActions',
  'weeklyReviews'
] as const;

export function createDefaultState(): AppState {
  const today = todayKey();
  const weekStart = '2026-05-04';

  return {
    version: 1,
    domains: [
      {
        id: 'domain-health',
        name: '健康',
        color: '#0f766e',
        description: '睡眠、运动、饮食和精力管理'
      },
      {
        id: 'domain-learning',
        name: '学习',
        color: '#7c3aed',
        description: '阅读、课程、技能和长期积累'
      },
      {
        id: 'domain-career',
        name: '事业',
        color: '#d97706',
        description: '工作推进、作品产出和职业成长'
      },
      {
        id: 'domain-relationships',
        name: '关系',
        color: '#e11d48',
        description: '家人、朋友和高质量连接'
      }
    ],
    goals: [
      {
        id: 'goal-energy',
        domainId: 'domain-health',
        title: '建立稳定能量节奏',
        why: '让每天的状态更稳，减少靠意志硬撑。',
        status: 'active',
        targetDate: '2026-06-30',
        progress: 0
      },
      {
        id: 'goal-learning',
        domainId: 'domain-learning',
        title: '恢复长期学习节奏',
        why: '每天保持一点输入，给未来的自己铺路。',
        status: 'active',
        targetDate: '2026-07-31',
        progress: 0
      }
    ],
    habits: [
      {
        id: 'habit-stretch',
        goalId: 'goal-energy',
        title: '晨间拉伸 10 分钟',
        frequency: 'daily',
        active: true
      },
      {
        id: 'habit-read',
        goalId: 'goal-learning',
        title: '睡前阅读 20 分钟',
        frequency: 'daily',
        active: true
      }
    ],
    habitCompletions: [
      {
        id: 'completion-stretch-yesterday',
        habitId: 'habit-stretch',
        date: '2026-05-09',
        completed: true
      }
    ],
    dailyActions: [
      {
        id: 'action-stretch-today',
        goalId: 'goal-energy',
        title: '晨间拉伸 10 分钟',
        date: today,
        status: 'todo'
      },
      {
        id: 'action-plan-evening',
        goalId: 'goal-energy',
        title: '23:30 前放下屏幕',
        date: today,
        status: 'todo'
      },
      {
        id: 'action-read-today',
        goalId: 'goal-learning',
        title: '阅读 20 页并记一句启发',
        date: today,
        status: 'todo'
      },
      {
        id: 'action-last-week-1',
        goalId: 'goal-energy',
        title: '散步 20 分钟',
        date: weekStart,
        status: 'done'
      },
      {
        id: 'action-last-week-2',
        goalId: 'goal-learning',
        title: '整理一页学习笔记',
        date: '2026-05-05',
        status: 'done'
      }
    ],
    weeklyReviews: []
  };
}

export function serializeExportData(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportData(raw: string): AppState | ParseFailure {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON 格式无法解析，请检查备份文本。' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: '备份内容必须是一个对象。' };
  }

  if (parsed.version !== 1) {
    return { ok: false, error: '只支持 growth_os.v1 备份。' };
  }

  for (const collection of COLLECTIONS) {
    if (!Array.isArray(parsed[collection])) {
      return { ok: false, error: `备份缺少 ${collection} 数据。` };
    }
  }

  return parsed as unknown as AppState;
}

export function isParseFailure(value: AppState | ParseFailure): value is ParseFailure {
  return 'ok' in value && value.ok === false;
}

export function loadState(): AppState {
  const fallback = createDefaultState();
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return fallback;
  }

  const result = parseImportData(raw);
  if (isParseFailure(result)) {
    return fallback;
  }

  return result;
}

export function saveState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, serializeExportData(state));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
