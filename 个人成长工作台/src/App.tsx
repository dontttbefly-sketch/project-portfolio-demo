import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Circle,
  ClipboardList,
  Database,
  Download,
  Layers3,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  Upload
} from 'lucide-react';
import { todayKey } from './lib/dates';
import {
  calculateGoalProgress,
  calculateHabitStreak,
  calculateWeeklyCompletionRate,
  getWeekStart
} from './lib/progress';
import {
  createDefaultState,
  isParseFailure,
  loadState,
  parseImportData,
  saveState,
  serializeExportData
} from './lib/storage';
import type { AppState, DailyAction, Goal, GrowthDomain, Habit, WeeklyReview } from './types';

type View = 'today' | 'goals' | 'domains' | 'review' | 'settings';

interface GoalForm {
  title: string;
  why: string;
  domainId: string;
  targetDate: string;
}

const today = todayKey();

const navItems: Array<{ id: View; label: string; Icon: typeof CalendarCheck }> = [
  { id: 'today', label: '今日', Icon: CalendarCheck },
  { id: 'goals', label: '目标', Icon: Target },
  { id: 'domains', label: '成长维度', Icon: Layers3 },
  { id: 'review', label: '周复盘', Icon: ClipboardList },
  { id: 'settings', label: '数据设置', Icon: Database }
];

function App() {
  const [activeView, setActiveView] = useState<View>('today');
  const [state, setState] = useState<AppState>(() => loadState());
  const [toast, setToast] = useState('');

  useEffect(() => {
    saveState(state);
  }, [state]);

  const todayActions = useMemo(
    () => state.dailyActions.filter((action) => action.date === today),
    [state.dailyActions]
  );
  const completedToday = todayActions.filter((action) => action.status === 'done').length;
  const weeklyRate = calculateWeeklyCompletionRate(state.dailyActions, today);

  function updateState(updater: (current: AppState) => AppState, message?: string) {
    setState((current) => updater(current));
    if (message) {
      setToast(message);
      window.setTimeout(() => setToast(''), 2200);
    }
  }

  function toggleAction(actionId: string) {
    updateState((current) => {
      const nextActions = current.dailyActions.map((action) => {
        if (action.id !== actionId) {
          return action;
        }
        const status: DailyAction['status'] = action.status === 'done' ? 'todo' : 'done';
        return { ...action, status };
      });
      const toggled = nextActions.find((action) => action.id === actionId);
      const linkedHabit = toggled
        ? current.habits.find((habit) => habit.goalId === toggled.goalId && habit.title === toggled.title)
        : undefined;

      if (!toggled || !linkedHabit) {
        return { ...current, dailyActions: nextActions };
      }

      const completion = {
        id: `completion-${linkedHabit.id}-${toggled.date}`,
        habitId: linkedHabit.id,
        date: toggled.date,
        completed: toggled.status === 'done'
      };
      const hasCompletion = current.habitCompletions.some((item) => item.id === completion.id);
      const nextCompletions = hasCompletion
        ? current.habitCompletions.map((item) => (item.id === completion.id ? completion : item))
        : [...current.habitCompletions, completion];

      return {
        ...current,
        dailyActions: nextActions,
        habitCompletions: nextCompletions
      };
    });
  }

  function addGoal(goal: GoalForm) {
    const cleanTitle = goal.title.trim();
    if (!cleanTitle) {
      return;
    }

    const newGoal: Goal = {
      id: `goal-${crypto.randomUUID()}`,
      domainId: goal.domainId,
      title: cleanTitle,
      why: goal.why.trim(),
      status: 'active',
      targetDate: goal.targetDate,
      progress: 0
    };

    updateState((current) => ({ ...current, goals: [newGoal, ...current.goals] }), '目标已添加');
  }

  function deleteGoal(goalId: string) {
    updateState(
      (current) => {
        const habitIds = new Set(
          current.habits.filter((habit) => habit.goalId === goalId).map((habit) => habit.id)
        );

        return {
          ...current,
          goals: current.goals.filter((goal) => goal.id !== goalId),
          habits: current.habits.filter((habit) => habit.goalId !== goalId),
          habitCompletions: current.habitCompletions.filter(
            (completion) => !habitIds.has(completion.habitId)
          ),
          dailyActions: current.dailyActions.filter((action) => action.goalId !== goalId)
        };
      },
      '目标已删除'
    );
  }

  function addHabit(goalId: string, title: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    const habit: Habit = {
      id: `habit-${crypto.randomUUID()}`,
      goalId,
      title: cleanTitle,
      frequency: 'daily',
      active: true
    };
    const action: DailyAction = {
      id: `action-${crypto.randomUUID()}`,
      goalId,
      title: cleanTitle,
      date: today,
      status: 'todo'
    };

    updateState(
      (current) => ({
        ...current,
        habits: [habit, ...current.habits],
        dailyActions: [action, ...current.dailyActions]
      }),
      '习惯已加入今日行动'
    );
  }

  function addDailyAction(goalId: string, title: string) {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return;
    }

    const action: DailyAction = {
      id: `action-${crypto.randomUUID()}`,
      goalId,
      title: cleanTitle,
      date: today,
      status: 'todo'
    };

    updateState(
      (current) => ({ ...current, dailyActions: [action, ...current.dailyActions] }),
      '今日行动已添加'
    );
  }

  function addDomain(domain: Omit<GrowthDomain, 'id'>) {
    const cleanName = domain.name.trim();
    if (!cleanName) {
      return;
    }

    updateState(
      (current) => ({
        ...current,
        domains: [
          {
            id: `domain-${crypto.randomUUID()}`,
            name: cleanName,
            color: domain.color,
            description: domain.description.trim()
          },
          ...current.domains
        ]
      }),
      '成长维度已添加'
    );
  }

  function updateDomain(domainId: string, patch: Partial<Omit<GrowthDomain, 'id'>>) {
    updateState((current) => ({
      ...current,
      domains: current.domains.map((domain) =>
        domain.id === domainId ? { ...domain, ...patch } : domain
      )
    }));
  }

  function deleteDomain(domainId: string) {
    updateState(
      (current) => {
        const fallbackDomain = current.domains.find((domain) => domain.id !== domainId);
        if (!fallbackDomain) {
          return current;
        }

        return {
          ...current,
          domains: current.domains.filter((domain) => domain.id !== domainId),
          goals: current.goals.map((goal) =>
            goal.domainId === domainId ? { ...goal, domainId: fallbackDomain.id } : goal
          )
        };
      },
      '成长维度已删除，相关目标已移动'
    );
  }

  function saveWeeklyReview(review: WeeklyReview) {
    updateState(
      (current) => {
        const exists = current.weeklyReviews.some((item) => item.weekStart === review.weekStart);
        const weeklyReviews = exists
          ? current.weeklyReviews.map((item) => (item.weekStart === review.weekStart ? review : item))
          : [review, ...current.weeklyReviews];
        return { ...current, weeklyReviews };
      },
      '复盘已保存'
    );
  }

  function importState(next: AppState) {
    updateState(() => next, '数据已导入');
    setActiveView('settings');
  }

  function resetState() {
    updateState(() => createDefaultState(), '已恢复默认示例');
  }

  return (
    <div className="consumer-shell">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            G
          </div>
          <div>
            <p>成长操作台</p>
            <span>每天向前一点</span>
          </div>
        </div>
        <nav className="app-tabs" aria-label="主导航">
          {navItems.map(({ id, label, Icon }) => (
            <button
              className={activeView === id ? 'tab-button active' : 'tab-button'}
              key={id}
              onClick={() => setActiveView(id)}
              type="button"
            >
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {toast ? <div className="toast" role="status">{toast}</div> : null}

        {activeView !== 'today' ? (
          <section className="page-intro">
            <p className="eyebrow">{viewSubtitle(activeView)}</p>
            <h1>{viewTitle(activeView)}</h1>
          </section>
        ) : null}

        {activeView === 'today' ? (
          <TodayView
            completedToday={completedToday}
            domains={state.domains}
            goals={state.goals}
            habits={state.habits}
            habitCompletions={state.habitCompletions}
            actions={todayActions}
            allActions={state.dailyActions}
            onAddAction={addDailyAction}
            onToggleAction={toggleAction}
            weeklyRate={weeklyRate}
          />
        ) : null}
        {activeView === 'goals' ? (
          <GoalsView
            domains={state.domains}
            goals={state.goals}
            habits={state.habits}
            actions={state.dailyActions}
            onAddGoal={addGoal}
            onAddHabit={addHabit}
            onAddAction={addDailyAction}
            onDeleteGoal={deleteGoal}
          />
        ) : null}
        {activeView === 'domains' ? (
          <DomainsView
            domains={state.domains}
            goals={state.goals}
            onAddDomain={addDomain}
            onDeleteDomain={deleteDomain}
            onUpdateDomain={updateDomain}
          />
        ) : null}
        {activeView === 'review' ? (
          <ReviewView actions={state.dailyActions} reviews={state.weeklyReviews} onSave={saveWeeklyReview} />
        ) : null}
        {activeView === 'settings' ? (
          <SettingsView state={state} onImport={importState} onReset={resetState} />
        ) : null}
      </main>
    </div>
  );
}

function TodayView({
  actions,
  allActions,
  completedToday,
  domains,
  goals,
  habits,
  habitCompletions,
  onAddAction,
  onToggleAction,
  weeklyRate
}: {
  actions: DailyAction[];
  allActions: DailyAction[];
  completedToday: number;
  domains: GrowthDomain[];
  goals: Goal[];
  habits: Habit[];
  habitCompletions: AppState['habitCompletions'];
  onAddAction: (goalId: string, title: string) => void;
  onToggleAction: (actionId: string) => void;
  weeklyRate: number;
}) {
  const activeGoals = goals.filter((goal) => goal.status === 'active');
  const remainingActions = actions.filter((action) => action.status === 'todo');
  const primaryAction = remainingActions[0] ?? actions[0];
  const primaryGoal = goals.find((goal) => goal.id === primaryAction?.goalId);
  const primaryDomain = domains.find((domain) => domain.id === primaryGoal?.domainId);
  const [quickAction, setQuickAction] = useState('');
  const [quickGoalId, setQuickGoalId] = useState(activeGoals[0]?.id ?? goals[0]?.id ?? '');
  const bestStreak = habits.reduce(
    (best, habit) => Math.max(best, calculateHabitStreak(habit.id, habitCompletions, today)),
    0
  );

  useEffect(() => {
    const fallbackGoal = activeGoals[0] ?? goals[0];
    const hasSelectedGoal = goals.some((goal) => goal.id === quickGoalId);

    if ((!quickGoalId || !hasSelectedGoal) && fallbackGoal) {
      setQuickGoalId(fallbackGoal.id);
      return;
    }

    if (quickGoalId && !hasSelectedGoal && !fallbackGoal) {
      setQuickGoalId('');
    }
  }, [activeGoals, goals, quickGoalId]);

  return (
    <div className="view-grid today-layout">
      <section className="home-hero wide" aria-label="今日行动">
        <div className="hero-copy">
          <p className="eyebrow">本地优先 · {today}</p>
          <h1>今天先做一件小事</h1>
          <p>不用一下子改变很多。先把眼前这一步完成，生活会慢慢有秩序。</p>
          <div className="status-strip" aria-label="今日摘要">
            <span>今日完成 {completedToday} / {actions.length}</span>
            <span>本周 {weeklyRate}%</span>
            <span>连续 {bestStreak} 天</span>
          </div>
        </div>
        <div className="hero-progress" aria-hidden="true">
          <span>{completedToday}</span>
          <small>/ {actions.length}</small>
        </div>
      </section>

      <section className="primary-action-card wide" aria-label="下一步行动">
        {primaryAction ? (
          <>
            <p className="eyebrow">{primaryAction.status === 'done' ? '今日已完成' : '下一步行动'}</p>
            <h2>{primaryAction.status === 'done' ? '今天的行动都处理好了' : primaryAction.title}</h2>
            <p>
              {primaryGoal?.title ?? '未绑定目标'}
              {primaryDomain ? ` · ${primaryDomain.name}` : ''}
            </p>
            {primaryAction.status === 'todo' ? (
              <button
                aria-label={`完成${primaryAction.title}`}
                className="primary-action-button"
                onClick={() => onToggleAction(primaryAction.id)}
                type="button"
              >
                <CheckCircle2 aria-hidden="true" size={22} />
                完成这件事
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="eyebrow">今天很轻</p>
            <h2>还没有安排行动</h2>
            <p>给今天加一个很小的动作，就从这里开始。</p>
          </>
        )}
      </section>

      <section className="quick-add-card wide" aria-label="添加今日行动">
        <div className="section-heading">
          <div>
            <p className="eyebrow">快速开始</p>
            <h2>给今天加一步</h2>
          </div>
        </div>
        <form
          className="quick-action-form"
          onSubmit={(event) => {
            event.preventDefault();
            onAddAction(quickGoalId, quickAction);
            setQuickAction('');
          }}
        >
          <label>
            新的今日行动
            <input
              onChange={(event) => setQuickAction(event.target.value)}
              placeholder="例如：整理明天的前三件事"
              value={quickAction}
            />
          </label>
          <label>
            关联目标
            <select onChange={(event) => setQuickGoalId(event.target.value)} value={quickGoalId}>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" disabled={!quickGoalId} type="submit">
            <Plus aria-hidden="true" size={18} />
            加入今天
          </button>
        </form>
      </section>

      <section className="panel action-panel wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">今日清单</p>
            <h2>剩下的慢慢来</h2>
          </div>
          <span className="pill soft-pill">{actions.length - completedToday} 个待完成</span>
        </div>
        <div className="action-list">
          {actions.map((action) => {
            const goal = goals.find((item) => item.id === action.goalId);
            const domain = domains.find((item) => item.id === goal?.domainId);
            return (
              <label className="action-item" key={action.id}>
                <input
                  checked={action.status === 'done'}
                  onChange={() => onToggleAction(action.id)}
                  type="checkbox"
                />
                <span className="check-icon" aria-hidden="true">
                  {action.status === 'done' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </span>
                <span>
                  <strong>{action.title}</strong>
                  <small>{goal?.title ?? '未绑定目标'} · {domain?.name ?? '未分类'}</small>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">保持节奏</p>
            <h2>习惯</h2>
          </div>
        </div>
        <div className="stack">
          {habits
            .filter((habit) => habit.active)
            .map((habit) => (
              <div className="metric-row" key={habit.id}>
                <span>{habit.title}</span>
                <strong>{calculateHabitStreak(habit.id, habitCompletions, today)} 天</strong>
              </div>
            ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">回到方向</p>
            <h2>目标</h2>
          </div>
        </div>
        <div className="stack">
          {activeGoals.map((goal) => {
            const progress = calculateGoalProgress(goal.id, allActions);
            return (
              <div className="progress-card" key={goal.id}>
                <div>
                  <strong>{goal.title}</strong>
                  <span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function GoalsView({
  actions,
  domains,
  goals,
  habits,
  onAddAction,
  onAddGoal,
  onAddHabit,
  onDeleteGoal
}: {
  actions: DailyAction[];
  domains: GrowthDomain[];
  goals: Goal[];
  habits: Habit[];
  onAddAction: (goalId: string, title: string) => void;
  onAddGoal: (goal: GoalForm) => void;
  onAddHabit: (goalId: string, title: string) => void;
  onDeleteGoal: (goalId: string) => void;
}) {
  const [form, setForm] = useState<GoalForm>({
    title: '',
    why: '',
    domainId: domains[0]?.id ?? '',
    targetDate: '2026-06-30'
  });

  useEffect(() => {
    if (!form.domainId && domains[0]) {
      setForm((current) => ({ ...current, domainId: domains[0].id }));
    }
  }, [domains, form.domainId]);

  return (
    <div className="view-grid">
      <section className="panel wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">长期方向</p>
            <h2>添加目标</h2>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onAddGoal(form);
            setForm((current) => ({ ...current, title: '', why: '' }));
          }}
        >
          <label>
            目标名称
            <input
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              value={form.title}
            />
          </label>
          <label>
            成长维度
            <select
              onChange={(event) => setForm((current) => ({ ...current, domainId: event.target.value }))}
              value={form.domainId}
            >
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            目标日期
            <input
              onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))}
              type="date"
              value={form.targetDate}
            />
          </label>
          <label className="full">
            为什么重要
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, why: event.target.value }))}
              rows={3}
              value={form.why}
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus aria-hidden="true" size={18} />
            添加目标
          </button>
        </form>
      </section>

      <section className="goal-list wide" aria-label="目标列表">
        {goals.map((goal) => {
          const domain = domains.find((item) => item.id === goal.domainId);
          const goalHabits = habits.filter((habit) => habit.goalId === goal.id);
          const progress = calculateGoalProgress(goal.id, actions);
          return (
            <GoalCard
              domain={domain}
              goal={goal}
              habits={goalHabits}
              key={goal.id}
              progress={progress}
              onAddAction={onAddAction}
              onAddHabit={onAddHabit}
              onDeleteGoal={onDeleteGoal}
            />
          );
        })}
      </section>
    </div>
  );
}

function GoalCard({
  domain,
  goal,
  habits,
  onAddAction,
  onAddHabit,
  onDeleteGoal,
  progress
}: {
  domain?: GrowthDomain;
  goal: Goal;
  habits: Habit[];
  onAddAction: (goalId: string, title: string) => void;
  onAddHabit: (goalId: string, title: string) => void;
  onDeleteGoal: (goalId: string) => void;
  progress: number;
}) {
  const [habitTitle, setHabitTitle] = useState('');
  const [actionTitle, setActionTitle] = useState('');

  return (
    <article className="goal-card">
      <div className="goal-header">
        <span className="domain-dot" style={{ backgroundColor: domain?.color ?? '#737373' }} />
        <div>
          <h3>{goal.title}</h3>
          <p>{goal.why || '这个目标还没有写下原因。'}</p>
        </div>
        <span className="pill">{domain?.name ?? '未分类'}</span>
      </div>
      <div className="progress-track" aria-label={`${goal.title} 进度 ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="goal-meta">
        <span>期限 {goal.targetDate}</span>
        <span>进度 {progress}%</span>
        <span>{habits.length} 个习惯</span>
      </div>
      <button
        aria-label={`删除${goal.title}`}
        className="ghost-button danger goal-delete-button"
        onClick={() => onDeleteGoal(goal.id)}
        type="button"
      >
        <Trash2 aria-hidden="true" size={16} />
        删除目标
      </button>
      <div className="mini-form-row">
        <input
          aria-label={`${goal.title} 新习惯`}
          onChange={(event) => setHabitTitle(event.target.value)}
          placeholder="拆一个每日习惯"
          value={habitTitle}
        />
        <button
          className="icon-text-button"
          onClick={() => {
            onAddHabit(goal.id, habitTitle);
            setHabitTitle('');
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          添加习惯
        </button>
      </div>
      <div className="mini-form-row">
        <input
          aria-label={`${goal.title} 新行动`}
          onChange={(event) => setActionTitle(event.target.value)}
          placeholder="添加今日行动"
          value={actionTitle}
        />
        <button
          className="icon-text-button"
          onClick={() => {
            onAddAction(goal.id, actionTitle);
            setActionTitle('');
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          添加行动
        </button>
      </div>
    </article>
  );
}

function DomainsView({
  domains,
  goals,
  onAddDomain,
  onDeleteDomain,
  onUpdateDomain
}: {
  domains: GrowthDomain[];
  goals: Goal[];
  onAddDomain: (domain: Omit<GrowthDomain, 'id'>) => void;
  onDeleteDomain: (domainId: string) => void;
  onUpdateDomain: (domainId: string, patch: Partial<Omit<GrowthDomain, 'id'>>) => void;
}) {
  const [form, setForm] = useState({ name: '', color: '#0f766e', description: '' });

  return (
    <div className="view-grid">
      <section className="panel wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">生活结构</p>
            <h2>自定义成长维度</h2>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onAddDomain(form);
            setForm({ name: '', color: '#0f766e', description: '' });
          }}
        >
          <label>
            维度名称
            <input
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              value={form.name}
            />
          </label>
          <label>
            颜色
            <input
              className="color-input"
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
              type="color"
              value={form.color}
            />
          </label>
          <label className="full">
            描述
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={2}
              value={form.description}
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus aria-hidden="true" size={18} />
            添加维度
          </button>
        </form>
      </section>

      <section className="domain-list wide" aria-label="成长维度列表">
        {domains.map((domain) => (
          <article className="domain-card" key={domain.id}>
            <span className="domain-dot large" style={{ backgroundColor: domain.color }} />
            <label>
              名称
              <input
                onChange={(event) => onUpdateDomain(domain.id, { name: event.target.value })}
                value={domain.name}
              />
            </label>
            <label>
              描述
              <input
                onChange={(event) => onUpdateDomain(domain.id, { description: event.target.value })}
                value={domain.description}
              />
            </label>
            <span className="pill">{goals.filter((goal) => goal.domainId === domain.id).length} 个目标</span>
            <button
              className="ghost-button danger"
              disabled={domains.length === 1}
              onClick={() => onDeleteDomain(domain.id)}
              type="button"
            >
              <Trash2 aria-hidden="true" size={16} />
              删除
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function ReviewView({
  actions,
  onSave,
  reviews
}: {
  actions: DailyAction[];
  onSave: (review: WeeklyReview) => void;
  reviews: WeeklyReview[];
}) {
  const weekStart = getWeekStart(today);
  const existing = reviews.find((review) => review.weekStart === weekStart);
  const [form, setForm] = useState<WeeklyReview>(
    existing ?? {
      id: `review-${weekStart}`,
      weekStart,
      wins: '',
      blockers: '',
      adjustments: '',
      nextWeekFocus: ''
    }
  );
  const weeklyRate = calculateWeeklyCompletionRate(actions, today);

  useEffect(() => {
    if (existing) {
      setForm(existing);
    }
  }, [existing]);

  return (
    <div className="view-grid">
      <section className="focus-band" aria-label="本周摘要">
        <div>
          <p className="eyebrow">周一开始 · {weekStart}</p>
          <h2>本周完成率 {weeklyRate}%</h2>
        </div>
        <p className="big-number">{reviews.length}</p>
      </section>

      <section className="panel wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">每周一次</p>
            <h2>复盘与调整</h2>
          </div>
        </div>
        <form
          className="review-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(form);
          }}
        >
          <label>
            本周收获
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, wins: event.target.value }))}
              rows={3}
              value={form.wins}
            />
          </label>
          <label>
            卡点
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, blockers: event.target.value }))}
              rows={3}
              value={form.blockers}
            />
          </label>
          <label>
            调整
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, adjustments: event.target.value }))}
              rows={3}
              value={form.adjustments}
            />
          </label>
          <label>
            下周重点
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, nextWeekFocus: event.target.value }))}
              rows={3}
              value={form.nextWeekFocus}
            />
          </label>
          <button className="primary-button" type="submit">
            <CheckCircle2 aria-hidden="true" size={18} />
            保存复盘
          </button>
        </form>
      </section>
    </div>
  );
}

function SettingsView({
  onImport,
  onReset,
  state
}: {
  onImport: (state: AppState) => void;
  onReset: () => void;
  state: AppState;
}) {
  const [backup, setBackup] = useState(() => serializeExportData(state));
  const [error, setError] = useState('');

  useEffect(() => {
    setBackup(serializeExportData(state));
  }, [state]);

  return (
    <div className="view-grid">
      <section className="panel wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">本地数据</p>
            <h2>导入与导出</h2>
          </div>
        </div>
        <label className="backup-field">
          备份 JSON
          <textarea
            onChange={(event) => {
              setBackup(event.target.value);
              setError('');
            }}
            rows={14}
            value={backup}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="button-row">
          <button
            className="primary-button"
            onClick={() => {
              const result = parseImportData(backup);
              if (isParseFailure(result)) {
                setError(result.error);
                return;
              }
              onImport(result);
            }}
            type="button"
          >
            <Upload aria-hidden="true" size={18} />
            导入数据
          </button>
          <button className="icon-text-button" onClick={() => setBackup(serializeExportData(state))} type="button">
            <Download aria-hidden="true" size={18} />
            刷新导出
          </button>
          <button className="ghost-button" onClick={onReset} type="button">
            <RotateCcw aria-hidden="true" size={18} />
            恢复示例
          </button>
        </div>
      </section>

      <section className="panel" role="region" aria-label="成长维度列表">
        <div className="section-heading">
          <div>
            <p className="eyebrow">当前备份</p>
            <h2>成长维度列表</h2>
          </div>
        </div>
        <div className="stack">
          {state.domains.map((domain) => (
            <div className="metric-row" key={domain.id}>
              <span>{domain.name}</span>
              <span className="domain-dot" style={{ backgroundColor: domain.color }} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function viewTitle(view: View): string {
  const titleMap: Record<View, string> = {
    today: '今日操作台',
    goals: '目标管理',
    domains: '成长维度',
    review: '周复盘',
    settings: '数据设置'
  };
  return titleMap[view];
}

function viewSubtitle(view: View): string {
  const subtitleMap: Record<View, string> = {
    today: '今天的生活节奏',
    goals: '把想要的生活拆成可以推进的事',
    domains: '定义你在意的成长方向',
    review: '每周留一点时间看见变化',
    settings: '备份、迁移和恢复本地数据'
  };
  return subtitleMap[view];
}

export default App;
