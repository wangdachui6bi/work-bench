<template>
  <div>
    <div class="page-header">
      <div>
        <a-typography-title :level="3" :style="{ color: 'var(--text-primary)', margin: 0 }">
          <FileTextOutlined style="margin-right: 10px;" />
          快捷笔记
        </a-typography-title>
        <a-typography-text :style="{ color: 'var(--text-secondary)' }">
          随时记录灵感和重要信息
        </a-typography-text>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        新建笔记
      </a-button>
    </div>

    <div style="margin-bottom: 16px;">
      <a-input v-model:value="search" placeholder="搜索笔记..." allow-clear style="max-width: 400px;">
        <template #prefix><SearchOutlined style="color: var(--text-muted);" /></template>
      </a-input>
    </div>

    <a-card v-if="filtered.length === 0" class="wb-card">
      <a-empty description="暂无笔记">
        <a-button type="primary" @click="openCreate">创建第一条笔记</a-button>
      </a-empty>
    </a-card>

    <a-row v-else :gutter="[16, 16]">
      <a-col v-for="note in filtered" :key="note.id" :xs="24" :sm="12" :lg="8">
        <a-card class="note-card" :style="noteStyle(note.color)">
          <div class="note-head">
            <a-typography-text strong :style="{ color: 'var(--text-primary)', fontSize: '15px' }">
              <PushpinFilled v-if="note.pinned" style="color: var(--accent-light); margin-right: 6px;" />
              {{ note.title }}
            </a-typography-text>
            <div class="inline-actions">
              <button class="icon-button" @click="togglePin(note.id)">
                <component :is="note.pinned ? PushpinFilled : PushpinOutlined" />
              </button>
              <button class="icon-button" @click="openEdit(note)">
                <EditOutlined />
              </button>
              <button class="icon-button danger" @click="handleDelete(note.id)">
                <DeleteOutlined />
              </button>
            </div>
          </div>

          <a-typography-paragraph :ellipsis="{ rows: 6 }" class="note-content">
            {{ note.content }}
          </a-typography-paragraph>
          <a-typography-text :style="{ color: 'var(--text-muted)', fontSize: '11px' }">
            {{ formatDate(note.updatedAt) }}
          </a-typography-text>
        </a-card>
      </a-col>
    </a-row>

    <a-modal
      :open="modalOpen"
      :title="editItem ? '编辑笔记' : '新建笔记'"
      ok-text="保存"
      cancel-text="取消"
      :width="520"
      @ok="handleSave"
      @cancel="closeModal"
    >
      <div class="modal-form">
        <label class="field-label">标题</label>
        <a-input v-model:value="form.title" placeholder="笔记标题" />

        <label class="field-label">内容</label>
        <a-textarea v-model:value="form.content" :rows="8" placeholder="记下你的想法..." />

        <label class="field-label">颜色标签</label>
        <a-select v-model:value="form.color" :options="noteColors" />
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
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';

const noteColors = [
  { label: '默认', value: 'default', bg: 'var(--bg-card)', border: 'var(--border)' },
  { label: '紫色', value: 'purple', bg: '#2d1f5e', border: '#4a2d8a' },
  { label: '蓝色', value: 'blue', bg: '#1a2a4a', border: '#2a4a7a' },
  { label: '绿色', value: 'green', bg: '#1a3a2a', border: '#2a5a3a' },
  { label: '橙色', value: 'orange', bg: '#3a2a1a', border: '#5a3a1a' },
];

const colorMap = Object.fromEntries(noteColors.map((item) => [item.value, item]));

const emptyForm = () => ({
  title: '',
  content: '',
  color: 'default',
});

const { state: notes } = usePersistentState('notes', []);
const modalOpen = ref(false);
const editItem = ref(null);
const search = ref('');
const form = reactive(emptyForm());

const filtered = computed(() =>
  [...notes.value]
    .filter((item) => {
      if (!search.value) return true;
      const keyword = search.value.toLowerCase();
      return item.title?.toLowerCase().includes(keyword) || item.content?.toLowerCase().includes(keyword);
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    })
);

function noteStyle(color) {
  const current = colorMap[color] || colorMap.default;
  return {
    background: current.bg,
    border: `1px solid ${current.border}`,
    borderRadius: 'var(--radius)',
    height: '100%',
  };
}

function resetForm() {
  Object.assign(form, emptyForm());
}

function openCreate() {
  editItem.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(note) {
  editItem.value = note;
  Object.assign(form, {
    title: note.title || '',
    content: note.content || '',
    color: note.color || 'default',
  });
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  editItem.value = null;
  resetForm();
}

function handleSave() {
  if (!form.title.trim()) return message.error('请输入标题');
  if (!form.content.trim()) return message.error('请输入内容');

  const payload = {
    title: form.title.trim(),
    content: form.content.trim(),
    color: form.color || 'default',
    updatedAt: new Date().toISOString(),
  };

  if (editItem.value) {
    notes.value = notes.value.map((item) => (item.id === editItem.value.id ? { ...item, ...payload } : item));
    message.success('已更新');
  } else {
    notes.value = [
      {
        id: uuid(),
        ...payload,
        pinned: false,
        createdAt: new Date().toISOString(),
      },
      ...notes.value,
    ];
    message.success('已添加');
  }

  closeModal();
}

function togglePin(id) {
  notes.value = notes.value.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item));
}

function handleDelete(id) {
  notes.value = notes.value.filter((item) => item.id !== id);
  message.success('已删除');
}

function formatDate(value) {
  return dayjs(value).format('MM-DD HH:mm');
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

.note-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.note-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
}

.note-content {
  flex: 1;
  margin-bottom: 8px;
  white-space: pre-wrap;
  color: var(--text-secondary);
}

.modal-form {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.field-label {
  color: var(--text-secondary);
  font-size: 13px;
}

.inline-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-button {
  color: var(--text-muted);
}

.icon-button.danger {
  color: var(--danger);
}
</style>
