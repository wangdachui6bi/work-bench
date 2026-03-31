<template>
  <div>
    <div class="page-header">
      <div>
        <a-typography-title :level="3" :style="{ color: 'var(--text-primary)', margin: 0 }">
          <CheckSquareOutlined style="margin-right: 10px;" />
          待办事项
        </a-typography-title>
        <a-typography-text :style="{ color: 'var(--text-secondary)' }">
          管理你的任务和计划
        </a-typography-text>
      </div>
      <a-button type="primary" @click="modalOpen = true">
        <template #icon><PlusOutlined /></template>
        新建待办
      </a-button>
    </div>

    <a-card class="wb-card quick-card">
      <div class="sync-banner" :class="{ local: !syncConfig.enabled }">
        <div class="sync-copy">
          <CloudOutlined />
          <div>
            <div class="sync-title">
              {{ syncConfig.enabled ? '云端待办已接入' : '当前使用本地待办' }}
            </div>
            <div class="sync-desc">
              {{ syncMessage }}
            </div>
          </div>
        </div>
        <a-button v-if="syncConfig.enabled" :loading="loading" @click="refreshFromServer">
          刷新
        </a-button>
      </div>

      <div class="quick-add">
        <a-input
          v-model:value="quickInput"
          placeholder="快速添加今日待办，按回车确认..."
          @pressEnter="handleAddQuick"
        >
          <template #prefix><PlusOutlined style="color: var(--text-muted);" /></template>
        </a-input>
        <a-button type="primary" @click="handleAddQuick">添加</a-button>
      </div>
    </a-card>

    <a-card class="wb-card quick-card">
      <div class="feishu-head">
        <div class="sync-copy">
          <RobotOutlined />
          <div>
            <div class="sync-title">飞书机器人提醒</div>
            <div class="sync-desc">{{ feishuMessage }}</div>
          </div>
        </div>
        <a-switch
          v-model:checked="feishuSettings.autoEnabled"
          :loading="savingAutoReminder"
          checked-children="自动提醒"
          un-checked-children="手动"
          @change="handleAutoReminderChange"
        />
      </div>

      <div class="feishu-grid">
        <a-input
          v-model:value="feishuSettings.webhook"
          placeholder="粘贴飞书机器人 webhook 地址"
        />
        <div class="feishu-fixed-time">
          {{ syncConfig.enabled ? '服务端自动推送到点待办，并在每天 09:30 汇总今日待办' : '每天 09:30 自动发送今日待办' }}
        </div>
      </div>

      <div class="feishu-actions">
        <a-button @click="saveFeishuConfig">保存配置</a-button>
        <a-button @click="sendTestMessage">测试消息</a-button>
        <a-button type="primary" ghost @click="sendTodaySummary">发送今日待办</a-button>
        <a-button danger ghost @click="sendOverdueSummary">发送逾期待办</a-button>
      </div>
    </a-card>

    <div class="toolbar">
      <a-segmented v-model:value="viewMode" :options="viewOptions" />
      <a-select
        v-if="viewMode === 'list'"
        v-model:value="filter"
        :options="filterOptions"
        style="width: 120px;"
      />
      <a-button v-if="completedCount > 0" @click="clearCompleted">
        清除已完成
      </a-button>
      <a-typography-text class="toolbar-meta">共 {{ filteredTodos.length }} 条</a-typography-text>
    </div>

    <a-row :gutter="16">
      <a-col v-if="viewMode === 'calendar'" :xs="24" :md="10">
        <a-card class="wb-card" style="margin-bottom: 16px;">
          <a-calendar v-model:value="selectedDate" :fullscreen="false">
            <template #dateCellRender="{ current }">
              <div v-if="todosByDate[current.format('YYYY-MM-DD')]" class="date-badge-wrap">
                <a-badge :count="todosByDate[current.format('YYYY-MM-DD')]" color="var(--accent)" />
              </div>
            </template>
          </a-calendar>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="viewMode === 'calendar' ? 14 : 24">
        <a-card class="wb-card">
          <template v-if="viewMode === 'calendar'" #title>
            <span style="color: var(--text-primary);">{{ selectedDate.format('M月D日') }} 的待办</span>
          </template>

          <div v-if="filteredTodos.length === 0" style="padding: 40px;">
            <a-empty description="暂无待办事项" />
          </div>

          <div v-else class="todo-list">
            <div v-for="todo in filteredTodos" :key="todo.id" class="todo-item" :class="{ done: todo.done }">
              <a-checkbox :checked="todo.done" @change="toggleDone(todo.id)" />
              <span class="priority-chip" :class="todo.priority">
                {{ priorityMap[todo.priority]?.label || '中优先' }}
              </span>
              <div class="todo-main">
                <a-typography-text :delete="todo.done" :style="{ color: 'var(--text-primary)' }">
                  {{ todo.title }}
                </a-typography-text>
                <a-typography-text class="todo-time">
                  <CalendarOutlined style="margin-right: 4px;" />
                  {{ todo.date }}
                  <span v-if="todo.time" style="margin-left: 8px;">
                    <ClockCircleOutlined style="margin-right: 4px;" />
                    {{ todo.time }}
                  </span>
                </a-typography-text>
              </div>
              <button class="icon-button danger" @click="handleDelete(todo.id)">
                <DeleteOutlined />
              </button>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-modal
      :open="modalOpen"
      title="新建待办"
      ok-text="添加"
      cancel-text="取消"
      :width="480"
      @ok="handleSave"
      @cancel="closeModal"
    >
      <div class="modal-form">
        <label class="field-label">待办内容</label>
        <a-input v-model:value="form.title" placeholder="要做什么？" />

        <div class="row-fields">
          <div>
            <label class="field-label">日期</label>
            <a-date-picker v-model:value="form.date" style="width: 100%;" />
          </div>
          <div>
            <label class="field-label">时间</label>
            <a-time-picker v-model:value="form.time" format="HH:mm" style="width: 100%;" />
          </div>
        </div>

        <label class="field-label">优先级</label>
        <a-select v-model:value="form.priority" :options="priorityOptions" />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';
import { v4 as uuid } from 'uuid';
import {
  getFeishuTodoSettings,
  saveFeishuTodoSettings,
  sendFeishuBotMessage,
} from '../store/feishuStore';
import {
  clearCompletedTodos,
  createTodo,
  deleteTodoById,
  fetchTodos,
  getTodoSyncConfig,
  toggleTodoDone,
} from '../store/todoCloudStore';
import {
  CalendarOutlined,
  BellOutlined,
  CheckSquareOutlined,
  CloudOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  RobotOutlined,
} from '@ant-design/icons-vue';

const priorityOptions = [
  { label: '高优先', value: 'high', color: 'red' },
  { label: '中优先', value: 'medium', color: 'orange' },
  { label: '低优先', value: 'low', color: 'blue' },
];

const priorityMap = Object.fromEntries(priorityOptions.map((item) => [item.value, item]));

const viewOptions = [
  { label: '列表', value: 'list' },
  { label: '日历', value: 'calendar' },
];

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '今日', value: 'today' },
  { label: '未完成', value: 'pending' },
  { label: '已完成', value: 'done' },
  { label: '已过期', value: 'overdue' },
];

const emptyForm = () => ({
  title: '',
  date: null,
  time: null,
  priority: 'medium',
});

const todos = ref([]);
const modalOpen = ref(false);
const viewMode = ref('list');
const selectedDate = ref(dayjs());
const filter = ref('all');
const quickInput = ref('');
const loading = ref(false);
const syncConfig = getTodoSyncConfig();
const syncMessage = ref(syncConfig.enabled ? '正在连接待办服务...' : '未配置服务端，新增和删除仅保存在当前设备');
const feishuSettings = reactive({
  webhook: '',
  autoEnabled: false,
});
const persistedFeishuSettings = ref({
  webhook: '',
  autoEnabled: false,
});
const feishuMessage = ref('填入机器人 webhook 后，可以把今日待办推送到飞书');
const savingAutoReminder = ref(false);
const form = reactive(emptyForm());

const today = computed(() => dayjs().format('YYYY-MM-DD'));

const filteredTodos = computed(() => {
  let list = [...todos.value];

  if (viewMode.value === 'calendar') {
    const dateStr = selectedDate.value.format('YYYY-MM-DD');
    list = list.filter((item) => item.date === dateStr);
  }

  if (filter.value === 'today') list = list.filter((item) => item.date === today.value);
  else if (filter.value === 'pending') list = list.filter((item) => !item.done);
  else if (filter.value === 'done') list = list.filter((item) => item.done);
  else if (filter.value === 'overdue') list = list.filter((item) => !item.done && item.date < today.value);

  const order = { high: 0, medium: 1, low: 2 };
  return list.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
  });
});

const completedCount = computed(() => todos.value.filter((item) => item.done).length);

const todosByDate = computed(() => {
  const map = {};
  todos.value.forEach((item) => {
    if (!item.done) {
      map[item.date] = (map[item.date] || 0) + 1;
    }
  });
  return map;
});

function resetForm() {
  Object.assign(form, emptyForm());
}

async function loadTodos({ silent = false } = {}) {
  try {
    loading.value = true;
    if (!silent) {
      syncMessage.value = syncConfig.enabled ? '正在从服务端刷新待办...' : syncMessage.value;
    }
    todos.value = await fetchTodos();
    if (syncConfig.enabled) {
      syncMessage.value = `已连接服务端，共 ${todos.value.length} 条待办`;
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : '加载待办失败';
    syncMessage.value = text;
    message.error(text);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadTodos({ silent: true });
  getFeishuTodoSettings().then((settings) => {
    Object.assign(feishuSettings, settings);
    persistedFeishuSettings.value = { ...settings };
    if (feishuSettings.webhook) {
      feishuMessage.value = feishuSettings.autoEnabled
        ? (syncConfig.enabled
          ? '飞书自动提醒已开启，服务端会自动处理到点提醒和 09:30 今日待办摘要'
          : '飞书自动提醒已开启，应用运行时会自动推送到点待办和 09:30 汇总')
        : '飞书机器人已配置，可手动发送待办摘要';
    }
  });
});

async function handleAddQuick() {
  if (!quickInput.value.trim()) return;

  try {
    todos.value = await createTodo({
      id: uuid(),
      title: quickInput.value.trim(),
      date: today.value,
      time: '',
      priority: 'medium',
      done: false,
      createdAt: new Date().toISOString(),
    });
    quickInput.value = '';
    syncMessage.value = syncConfig.enabled ? '已添加并同步到服务端' : '已添加到本地待办';
    message.success('已添加到今日待办');
  } catch (error) {
    const text = error instanceof Error ? error.message : '添加失败';
    syncMessage.value = text;
    message.error(text);
  }
}

async function handleSave() {
  if (!form.title.trim()) return message.error('请输入待办内容');

  try {
    todos.value = await createTodo({
      id: uuid(),
      title: form.title.trim(),
      date: form.date ? form.date.format('YYYY-MM-DD') : today.value,
      time: form.time ? form.time.format('HH:mm') : '',
      priority: form.priority || 'medium',
      done: false,
      createdAt: new Date().toISOString(),
    });

    syncMessage.value = syncConfig.enabled ? '待办已写入服务端' : '待办已保存到本地';
    message.success('已添加');
    closeModal();
  } catch (error) {
    const text = error instanceof Error ? error.message : '添加失败';
    syncMessage.value = text;
    message.error(text);
  }
}

function closeModal() {
  modalOpen.value = false;
  resetForm();
}

async function toggleDone(id) {
  try {
    todos.value = await toggleTodoDone(id);
    syncMessage.value = syncConfig.enabled ? '待办状态已同步更新' : '本地状态已更新';
  } catch (error) {
    const text = error instanceof Error ? error.message : '更新失败';
    syncMessage.value = text;
    message.error(text);
  }
}

async function handleDelete(id) {
  try {
    todos.value = await deleteTodoById(id);
    syncMessage.value = syncConfig.enabled ? '待办已从服务端删除' : '待办已从本地删除';
    message.success('已删除');
  } catch (error) {
    const text = error instanceof Error ? error.message : '删除失败';
    syncMessage.value = text;
    message.error(text);
  }
}

async function clearCompleted() {
  try {
    todos.value = await clearCompletedTodos();
    syncMessage.value = syncConfig.enabled ? '已清除服务端已完成待办' : '已清除本地已完成待办';
    message.success('已清除已完成待办');
  } catch (error) {
    const text = error instanceof Error ? error.message : '清除失败';
    syncMessage.value = text;
    message.error(text);
  }
}

function refreshFromServer() {
  loadTodos();
}

function buildTodoLines(items) {
  return items.map((todo, index) => {
    const priority = priorityMap[todo.priority]?.label || '中优先';
    const timeText = todo.time ? ` ${todo.time}` : '';
    return `${index + 1}. ${todo.title}\n日期：${todo.date}${timeText}｜优先级：${priority}`;
  }).join('\n\n');
}

async function dispatchFeishuMessage(title, text) {
  return sendFeishuBotMessage({
    webhook: feishuSettings.webhook.trim(),
    title,
    text,
  });
}

async function saveFeishuConfig() {
  try {
    const saved = await saveFeishuTodoSettings({ ...feishuSettings });
    Object.assign(feishuSettings, saved);
    persistedFeishuSettings.value = { ...saved };
    feishuMessage.value = feishuSettings.autoEnabled
      ? (syncConfig.enabled
        ? '飞书配置已保存，服务端会自动处理到点提醒和 09:30 今日待办摘要'
        : '飞书配置已保存，应用运行时会自动推送到点待办和 09:30 汇总')
      : '飞书配置已保存，可手动发送待办摘要';
    message.success('飞书配置已保存');
  } catch (error) {
    const text = error instanceof Error ? error.message : '保存飞书配置失败';
    feishuMessage.value = text;
    message.error(text);
  }
}

async function handleAutoReminderChange(checked) {
  const previousAutoEnabled = persistedFeishuSettings.value.autoEnabled;
  feishuSettings.autoEnabled = checked;
  savingAutoReminder.value = true;

  try {
    const saved = await saveFeishuTodoSettings({
      ...persistedFeishuSettings.value,
      autoEnabled: checked,
    });
    persistedFeishuSettings.value = { ...saved };
    feishuSettings.autoEnabled = saved.autoEnabled;
    feishuMessage.value = saved.autoEnabled
      ? (syncConfig.enabled
        ? '已开启服务端自动提醒，到点后会由服务端发送'
        : '已开启自动提醒，应用运行时会自动发送')
      : '已关闭自动提醒，仍可手动发送待办摘要';
  } catch (error) {
    feishuSettings.autoEnabled = previousAutoEnabled;
    const text = error instanceof Error ? error.message : '更新自动提醒失败';
    feishuMessage.value = text;
    message.error(text);
  } finally {
    savingAutoReminder.value = false;
  }
}

async function sendTestMessage() {
  try {
    await dispatchFeishuMessage(
      'WorkBench 测试提醒',
      `机器人连接成功\n时间：${dayjs().format('YYYY-MM-DD HH:mm')}`
    );
    feishuMessage.value = '测试消息已发送，请去飞书确认机器人是否收到';
    message.success('测试消息已发送');
  } catch (error) {
    const text = error instanceof Error ? error.message : '发送测试消息失败';
    feishuMessage.value = text;
    message.error(text);
  }
}

async function sendTodaySummary() {
  const todayItems = todos.value.filter((item) => !item.done && item.date === today.value);
  if (todayItems.length === 0) {
    return message.info('今天没有未完成待办');
  }

  try {
    await dispatchFeishuMessage('今日待办摘要', buildTodoLines(todayItems));
    feishuMessage.value = `今日待办已发送，共 ${todayItems.length} 条`;
    message.success('今日待办已发送到飞书');
  } catch (error) {
    const text = error instanceof Error ? error.message : '发送今日待办失败';
    feishuMessage.value = text;
    message.error(text);
  }
}

async function sendOverdueSummary() {
  const overdueItems = todos.value.filter((item) => !item.done && item.date < today.value);
  if (overdueItems.length === 0) {
    return message.info('当前没有逾期待办');
  }

  try {
    await dispatchFeishuMessage('逾期待办提醒', buildTodoLines(overdueItems));
    feishuMessage.value = `逾期待办已发送，共 ${overdueItems.length} 条`;
    message.success('逾期待办已发送到飞书');
  } catch (error) {
    const text = error instanceof Error ? error.message : '发送逾期待办失败';
    feishuMessage.value = text;
    message.error(text);
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.wb-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.quick-card {
  margin-bottom: 16px;
}

.feishu-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.feishu-grid {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 12px;
  margin-bottom: 12px;
}

.feishu-fixed-time {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border-radius: 12px;
  background: rgba(22, 119, 255, 0.08);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.feishu-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.sync-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(252, 211, 77, 0.16), rgba(249, 115, 22, 0.08));
  border: 1px solid rgba(249, 115, 22, 0.18);
}

.sync-banner.local {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.16), rgba(71, 85, 105, 0.08));
  border-color: rgba(148, 163, 184, 0.18);
}

.sync-copy {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.sync-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 4px;
}

.sync-desc {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 980px) {
  .feishu-head {
    flex-direction: column;
  }

  .feishu-grid {
    grid-template-columns: 1fr;
  }
}

.quick-add {
  display: flex;
  gap: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-meta {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 13px;
}

.todo-list {
  display: grid;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.todo-item.done {
  opacity: 0.5;
}

.todo-main {
  flex: 1;
}

.todo-time {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
}

.priority-chip {
  min-width: 60px;
  padding: 4px 8px;
  border-radius: 999px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
}

.priority-chip.high {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
}

.priority-chip.medium {
  background: rgba(252, 196, 25, 0.14);
  color: #fcc419;
}

.priority-chip.low {
  background: rgba(116, 185, 255, 0.14);
  color: #74b9ff;
}

.modal-form {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.row-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field-label {
  display: block;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 6px;
}

.icon-button.danger {
  color: var(--danger);
}

.date-badge-wrap {
  display: flex;
  justify-content: center;
}
</style>
