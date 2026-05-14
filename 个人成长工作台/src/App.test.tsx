import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './lib/storage';

describe('Growth OS app', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses consumer app navigation instead of a dashboard sidebar', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toHaveClass('app-tabs');

    await user.click(screen.getByRole('button', { name: '目标' }));

    expect(screen.getByRole('heading', { name: '目标管理' })).toBeInTheDocument();
  });

  it('checks off a daily action from the Today view', async () => {
    const user = userEvent.setup();
    render(<App />);

    const firstAction = screen.getByRole('checkbox', { name: /晨间拉伸 10 分钟/ });
    await user.click(firstAction);

    expect(firstAction).toBeChecked();
    expect(screen.getByText('今日完成 1 / 3')).toBeInTheDocument();
  });

  it('promotes the next action as the primary home action', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '完成晨间拉伸 10 分钟' }));

    expect(screen.getByRole('checkbox', { name: /晨间拉伸 10 分钟/ })).toBeChecked();
    expect(screen.getByText('今日完成 1 / 3')).toBeInTheDocument();
  });

  it('adds a daily action directly from the Today view', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText('新的今日行动'), '整理明天的前三件事');
    await user.click(screen.getByRole('button', { name: /加入今天/ }));

    expect(screen.getByRole('checkbox', { name: /整理明天的前三件事/ })).toBeInTheDocument();
    expect(screen.getByText('今日完成 0 / 4')).toBeInTheDocument();
  });

  it('creates a goal from the Goals view', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '目标' }));
    await user.type(screen.getByLabelText('目标名称'), '每天阅读 20 页');
    await user.type(screen.getByLabelText('为什么重要'), '恢复长期学习的节奏');
    await user.click(screen.getByRole('button', { name: /添加目标/ }));

    expect(screen.getByText('每天阅读 20 页')).toBeInTheDocument();
    expect(screen.getByText('恢复长期学习的节奏')).toBeInTheDocument();
  });

  it('deletes a goal and its linked daily actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '目标' }));
    const goalList = screen.getByRole('region', { name: '目标列表' });
    expect(within(goalList).getByText('建立稳定能量节奏')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '删除建立稳定能量节奏' }));

    expect(within(goalList).queryByText('建立稳定能量节奏')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '今日' }));

    expect(screen.queryByRole('checkbox', { name: /晨间拉伸 10 分钟/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /23:30 前放下屏幕/ })).not.toBeInTheDocument();
  });

  it('saves a weekly review', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '周复盘' }));
    await user.clear(screen.getByLabelText('本周收获'));
    await user.type(screen.getByLabelText('本周收获'), '规律早睡三天');
    await user.type(screen.getByLabelText('下周重点'), '把运动安排到晚饭前');
    await user.click(screen.getByRole('button', { name: /保存复盘/ }));

    expect(screen.getByText('复盘已保存')).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('规律早睡三天');
  });

  it('exports and imports JSON data from settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '数据设置' }));
    const exportBox = screen.getByLabelText('备份 JSON');
    expect((exportBox as HTMLTextAreaElement).value).toContain('"version": 1');

    await user.clear(exportBox);
    fireEvent.change(exportBox, {
      target: {
        value: JSON.stringify({
        version: 1,
        domains: [{ id: 'domain-x', name: '创造力', color: '#4f46e5', description: '输出和表达' }],
        goals: [],
        habits: [],
        habitCompletions: [],
        dailyActions: [],
        weeklyReviews: []
      })
      }
    });
    await user.click(screen.getByRole('button', { name: /导入数据/ }));

    const domainsRegion = screen.getByRole('region', { name: '成长维度列表' });
    expect(within(domainsRegion).getByText('创造力')).toBeInTheDocument();
  });
});
