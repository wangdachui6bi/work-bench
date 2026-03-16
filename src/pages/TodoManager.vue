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

    <div class="toolbar">
      <a-segmented v-model:value="viewMode" :options="viewOptions" />
      <a-select
        v-if="viewMode === 'list'"
        v-model:value="filter"
        :options="filterOptions"
        style="width: 120px;"
      />
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
import { computed, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';
import { v4 as uuid } from 'uuid';
import { usePersistentState } from '../store/useStore';
import {
  CalendarOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
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

const { state: todos } = usePersistentState('todos', []);
const modalOpen = ref(false);
const viewMode = ref('list');
const selectedDate = ref(dayjs());
const filter = ref('all');
const quickInput = ref('');
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

function handleAddQuick() {
  if (!quickInput.value.trim()) return;

  todos.value = [
    {
      id: uuid(),
      title: quickInput.value.trim(),
      date: today.value,
      time: '',
      priority: 'medium',
      done: false,
      createdAt: new Date().toISOString(),
    },
    ...todos.value,
  ];
  quickInput.value = '';
  message.success('已添加到今日待办');
}

function handleSave() {
  if (!form.title.trim()) return message.error('请输入待办内容');

  todos.value = [
    {
      id: uuid(),
      title: form.title.trim(),
      date: form.date ? form.date.format('YYYY-MM-DD') : today.value,
      time: form.time ? form.time.format('HH:mm') : '',
      priority: form.priority || 'medium',
      done: false,
      createdAt: new Date().toISOString(),
    },
    ...todos.value,
  ];

  message.success('已添加');
  closeModal();
}

function closeModal() {
  modalOpen.value = false;
  resetForm();
}

function toggleDone(id) {
  todos.value = todos.value.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
}

function handleDelete(id) {
  todos.value = todos.value.filter((item) => item.id !== id);
  message.success('已删除');
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
