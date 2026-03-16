<template>
  <div>
    <div style="margin-bottom: 32px;">
      <a-typography-title :level="3" :style="{ color: 'var(--text-primary)', marginBottom: '4px' }">
        {{ greetingByHour() }}
      </a-typography-title>
      <a-typography-text :style="{ color: 'var(--text-secondary)' }">
        {{ todayLabel }}
      </a-typography-text>
    </div>

    <a-row :gutter="[16, 16]" style="margin-bottom: 32px;">
      <a-col v-for="item in stats" :key="item.key" :xs="12" :sm="12" :md="6">
        <a-card hoverable class="wb-card stat-card" @click="emit('navigate', item.key)">
          <div class="stat-inner">
            <div>
              <a-typography-text :style="{ color: 'var(--text-secondary)', fontSize: '13px' }">
                {{ item.title }}
              </a-typography-text>
              <a-typography-title
                :level="2"
                :style="{ color: item.color, margin: '4px 0 0', fontWeight: 700 }"
              >
                {{ item.count }}
              </a-typography-title>
            </div>
            <div class="stat-icon" :style="{ color: item.color }">
              <component :is="item.icon" />
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :md="14">
        <a-card class="wb-card" :bordered="true">
          <template #title>
            <span style="color: var(--text-primary);">
              📋 今日待办
              <a-tag color="orange">{{ todayTodos.length }}</a-tag>
            </span>
          </template>
          <template #extra>
            <a-button type="link" @click="emit('navigate', 'todos')">
              查看全部
              <ArrowRightOutlined />
            </a-button>
          </template>

          <a-empty v-if="todayTodos.length === 0" description="今天没有待办事项" />
          <div v-else>
            <div v-for="todo in todayTodos.slice(0, 5)" :key="todo.id" class="list-row">
              <a-tag :color="priorityColor(todo.priority)">
                {{ priorityLabel(todo.priority) }}
              </a-tag>
              <a-typography-text :style="{ color: 'var(--text-primary)' }">
                {{ todo.title }}
              </a-typography-text>
              <a-typography-text
                v-if="todo.time"
                :style="{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '12px' }"
              >
                <ClockCircleOutlined />
                {{ todo.time }}
              </a-typography-text>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="10">
        <a-card class="wb-card" :bordered="true">
          <template #title>
            <span style="color: var(--text-primary);">🔐 最近账号</span>
          </template>
          <template #extra>
            <a-button type="link" @click="emit('navigate', 'passwords')">
              管理
              <ArrowRightOutlined />
            </a-button>
          </template>

          <a-empty v-if="passwords.length === 0" description="暂无保存的账号" />
          <div v-else>
            <div v-for="item in passwords.slice(0, 4)" :key="item.id" class="list-row">
              <LockOutlined style="color: var(--accent-light);" />
              <div>
                <a-typography-text :style="{ color: 'var(--text-primary)', display: 'block' }">
                  {{ item.name }}
                </a-typography-text>
                <a-typography-text :style="{ color: 'var(--text-muted)', fontSize: '12px' }">
                  {{ item.host || item.category || '--' }}
                </a-typography-text>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed, markRaw } from 'vue';
import dayjs from 'dayjs';
import { usePersistentState } from '../store/useStore';
import {
  ArrowRightOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  LinkOutlined,
  LockOutlined,
} from '@ant-design/icons-vue';

const emit = defineEmits(['navigate']);

const { state: todos } = usePersistentState('todos', []);
const { state: passwords } = usePersistentState('passwords', []);
const { state: notes } = usePersistentState('notes', []);
const { state: bookmarks } = usePersistentState('bookmarks', []);

const today = computed(() => dayjs().format('YYYY-MM-DD'));
const todayLabel = computed(() => dayjs().format('YYYY年M月D日 dddd'));
const todayTodos = computed(() => todos.value.filter((item) => item.date === today.value && !item.done));
const pendingTodos = computed(() => todos.value.filter((item) => !item.done));

const stats = computed(() => [
  {
    title: '服务器账号',
    count: passwords.value.length,
    icon: markRaw(LockOutlined),
    color: '#6c5ce7',
    key: 'passwords',
  },
  {
    title: '待办事项',
    count: pendingTodos.value.length,
    icon: markRaw(CheckSquareOutlined),
    color: '#fcc419',
    key: 'todos',
  },
  {
    title: '快捷笔记',
    count: notes.value.length,
    icon: markRaw(FileTextOutlined),
    color: '#51cf66',
    key: 'notes',
  },
  {
    title: '书签链接',
    count: bookmarks.value.length,
    icon: markRaw(LinkOutlined),
    color: '#74b9ff',
    key: 'bookmarks',
  },
]);

function greetingByHour() {
  const hour = dayjs().hour();
  if (hour < 6) return '夜深了，注意休息 🌙';
  if (hour < 12) return '早上好 ☀️';
  if (hour < 14) return '中午好 🌤';
  if (hour < 18) return '下午好 ☕';
  return '晚上好 🌆';
}

function priorityLabel(priority) {
  if (priority === 'high') return '高';
  if (priority === 'medium') return '中';
  return '低';
}

function priorityColor(priority) {
  if (priority === 'high') return 'red';
  if (priority === 'medium') return 'orange';
  return 'blue';
}
</script>

<style scoped>
.wb-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.stat-card {
  cursor: pointer;
}

.stat-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-icon {
  font-size: 28px;
  opacity: 0.3;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.list-row:last-child {
  border-bottom: none;
}
</style>
