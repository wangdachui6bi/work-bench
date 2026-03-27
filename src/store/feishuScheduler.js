import dayjs from 'dayjs';
import { fetchTodos, getTodoSyncConfig } from './todoCloudStore';
import {
  getFeishuSentLog,
  getFeishuTodoSettings,
  markFeishuReminderSent,
  sendFeishuBotMessage,
  triggerServerFeishuCheck,
} from './feishuStore';

let schedulerTimer = null;
let running = false;

function buildTodoLines(items) {
  const priorityLabel = {
    high: '高优先',
    medium: '中优先',
    low: '低优先',
  };

  return items
    .map((todo, index) => {
      const timeText = todo.time ? ` ${todo.time}` : '';
      const priority = priorityLabel[todo.priority] || '中优先';
      return `${index + 1}. ${todo.title}\n日期：${todo.date}${timeText}｜优先级：${priority}`;
    })
    .join('\n\n');
}

async function checkTimedReminders(settings, todos) {
  const now = dayjs();
  const sentLog = await getFeishuSentLog();
  const dueTodos = todos.filter((todo) => {
    if (todo.done || !todo.time) {
      return false;
    }

    const dueAt = dayjs(`${todo.date} ${todo.time}`, 'YYYY-MM-DD HH:mm');
    if (!dueAt.isValid() || now.isBefore(dueAt)) {
      return false;
    }

    const reminderKey = `todo-due:${todo.id}:${todo.date}:${todo.time}`;
    return !sentLog[reminderKey];
  });

  if (!dueTodos.length) {
    return { sent: 0 };
  }

  await sendFeishuBotMessage({
    webhook: settings.webhook,
    title: dueTodos.length === 1 ? '待办到时间了' : '有几条待办到时间了',
    text: buildTodoLines(dueTodos),
  });

  await Promise.all(
    dueTodos.map((todo) => markFeishuReminderSent(`todo-due:${todo.id}:${todo.date}:${todo.time}`))
  );

  return { sent: dueTodos.length };
}

async function runSchedulerCycle() {
  if (running) {
    return;
  }

  running = true;
  try {
    const settings = await getFeishuTodoSettings();
    if (!settings.autoEnabled || !settings.webhook.trim()) {
      return;
    }

    const todos = await fetchTodos();
    await checkTimedReminders(settings, todos);

    if (getTodoSyncConfig().enabled) {
      await triggerServerFeishuCheck();
      return;
    }

    const today = dayjs().format('YYYY-MM-DD');
    const summaryAt = dayjs(`${today} 09:30`, 'YYYY-MM-DD HH:mm');
    const now = dayjs();
    const reminderKey = `daily-summary:${today}`;
    const sentLog = await getFeishuSentLog();

    if (now.isBefore(summaryAt) || sentLog[reminderKey]) {
      return;
    }

    const todayItems = todos.filter((item) => !item.done && item.date === today);
    if (!todayItems.length) {
      return;
    }

    await sendFeishuBotMessage({
      webhook: settings.webhook,
      title: '今日待办摘要',
      text: buildTodoLines(todayItems),
    });
    await markFeishuReminderSent(reminderKey);
  } catch (error) {
    console.warn('[feishu-scheduler] cycle failed', error);
  } finally {
    running = false;
  }
}

export function startFeishuTodoScheduler() {
  if (schedulerTimer) {
    return () => stopFeishuTodoScheduler();
  }

  void runSchedulerCycle();
  schedulerTimer = window.setInterval(() => {
    void runSchedulerCycle();
  }, 60 * 1000);

  return () => stopFeishuTodoScheduler();
}

export function stopFeishuTodoScheduler() {
  if (schedulerTimer) {
    window.clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
