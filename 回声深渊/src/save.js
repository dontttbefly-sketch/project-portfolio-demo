// localStorage 持久化
import { SAVE_KEY, PLAYER } from './config.js';

const DEFAULT = {
  version: 1,
  seed: null,                     // 当前世界种子
  fragments: 0,
  maxHp: PLAYER.HP_MAX,
  flasks: PLAYER.FLASKS_MAX,
  maxFlasks: PLAYER.FLASKS_MAX,
  unlockedDoubleJump: false,      // zone 1→2 过渡圣坛解锁
  unlockedDash: false,            // zone 2 中期圣坛解锁
  unlockedDownStrike: true,       // zone 1 即可下劈（保留破墙学习曲线）
  unlockedWallClimb: false,       // zone 3 解锁
  bonfireRoom: null,              // 检查点：上次坐过的篝火所在房间 id
  bonfireSpawn: null,
  echoes: [],                     // 全部回声 [{...}]
  defeatedBosses: [],
  pickedUps: [],                  // 已永久拾取的升级 id 列表
  totalDeaths: 0,
  totalRuns: 0,
  bestDepth: 0,
  lastVisited: {}                 // roomId → timestamp
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch (e) {
    console.warn('Save load failed', e);
    return { ...DEFAULT };
  }
}

export function writeSave(persist) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(persist));
  } catch (e) {
    console.warn('Save write failed', e);
  }
}

export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
  return { ...DEFAULT };
}
