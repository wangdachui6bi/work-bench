<template>
  <div>
    <div class="page-header">
      <div>
        <a-typography-title :level="3" :style="{ color: 'var(--text-primary)', margin: 0 }">
          <LinkOutlined style="margin-right: 10px;" />
          书签导航
        </a-typography-title>
        <a-typography-text :style="{ color: 'var(--text-secondary)' }">
          快速访问常用链接
        </a-typography-text>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        添加书签
      </a-button>
    </div>

    <div style="margin-bottom: 16px;">
      <a-input v-model:value="search" placeholder="搜索书签..." allow-clear style="max-width: 400px;">
        <template #prefix><SearchOutlined style="color: var(--text-muted);" /></template>
      </a-input>
    </div>

    <a-card v-if="filtered.length === 0" class="wb-card">
      <a-empty description="暂无书签">
        <a-button type="primary" @click="openCreate">添加第一个书签</a-button>
      </a-empty>
    </a-card>

    <a-row v-else :gutter="[16, 16]">
      <a-col v-for="item in filtered" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
        <a-card hoverable class="wb-card bookmark-card" @click="openUrl(item.url)">
          <div class="bookmark-head">
            <div class="bookmark-meta">
              <GlobalOutlined class="bookmark-icon" />
              <div class="bookmark-copy">
                <a-typography-text strong class="bookmark-name">
                  {{ item.name }}
                </a-typography-text>
                <a-typography-text class="bookmark-url">
                  {{ item.url }}
                </a-typography-text>
              </div>
            </div>
          </div>

          <a-typography-text v-if="item.description" class="bookmark-desc">
            {{ item.description }}
          </a-typography-text>

          <div class="bookmark-foot" @click.stop>
            <a-tag :color="tagMap[item.tag]?.color || 'default'">
              {{ tagMap[item.tag]?.label || '其他' }}
            </a-tag>
            <div class="inline-actions">
              <button class="icon-button" @click="copyUrl(item.url)">
                <CopyOutlined />
              </button>
              <button class="icon-button" @click="openEdit(item)">
                <EditOutlined />
              </button>
              <button class="icon-button danger" @click="handleDelete(item.id)">
                <DeleteOutlined />
              </button>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-modal
      :open="modalOpen"
      :title="editItem ? '编辑书签' : '添加书签'"
      ok-text="保存"
      cancel-text="取消"
      :width="480"
      @ok="handleSave"
      @cancel="closeModal"
    >
      <div class="modal-form">
        <label class="field-label">名称</label>
        <a-input v-model:value="form.name" placeholder="例：Jenkins 构建平台" />

        <label class="field-label">链接</label>
        <a-input v-model:value="form.url" placeholder="https://..." />

        <label class="field-label">标签</label>
        <a-select v-model:value="form.tag" :options="bookmarkTags" />

        <label class="field-label">描述</label>
        <a-input v-model:value="form.description" placeholder="简短描述（可选）" />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import { v4 as uuid } from 'uuid';
import { usePersistentState } from '../store/useStore';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  GlobalOutlined,
  LinkOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';

const bookmarkTags = [
  { label: '工作', value: 'work', color: 'purple' },
  { label: '工具', value: 'tool', color: 'blue' },
  { label: '文档', value: 'doc', color: 'green' },
  { label: '监控', value: 'monitor', color: 'orange' },
  { label: '其他', value: 'other', color: 'default' },
];

const tagMap = Object.fromEntries(bookmarkTags.map((item) => [item.value, item]));

const emptyForm = () => ({
  name: '',
  url: '',
  tag: 'work',
  description: '',
});

const { state: bookmarks } = usePersistentState('bookmarks', []);
const modalOpen = ref(false);
const editItem = ref(null);
const search = ref('');
const form = reactive(emptyForm());

const filtered = computed(() =>
  bookmarks.value.filter((item) => {
    if (!search.value) return true;
    const keyword = search.value.toLowerCase();
    return [item.name, item.url, item.description].some((field) => field?.toLowerCase().includes(keyword));
  })
);

function resetForm() {
  Object.assign(form, emptyForm());
}

function openCreate() {
  editItem.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(item) {
  editItem.value = item;
  Object.assign(form, {
    name: item.name || '',
    url: item.url || '',
    tag: item.tag || 'work',
    description: item.description || '',
  });
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  editItem.value = null;
  resetForm();
}

function handleSave() {
  if (!form.name.trim()) return message.error('请输入名称');
  if (!form.url.trim()) return message.error('请输入链接');

  const payload = {
    name: form.name.trim(),
    url: form.url.trim(),
    tag: form.tag || 'work',
    description: form.description?.trim() || '',
  };

  if (editItem.value) {
    bookmarks.value = bookmarks.value.map((item) => (item.id === editItem.value.id ? { ...item, ...payload } : item));
    message.success('已更新');
  } else {
    bookmarks.value = [{ id: uuid(), ...payload }, ...bookmarks.value];
    message.success('已添加');
  }

  closeModal();
}

function handleDelete(id) {
  bookmarks.value = bookmarks.value.filter((item) => item.id !== id);
  message.success('已删除');
}

function copyUrl(url) {
  navigator.clipboard.writeText(url || '');
  message.success('链接已复制');
}

function openUrl(url) {
  window.open(url, '_blank');
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

.bookmark-card {
  cursor: pointer;
}

.bookmark-head {
  margin-bottom: 8px;
}

.bookmark-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.bookmark-icon {
  font-size: 24px;
  color: var(--accent-light);
  flex-shrink: 0;
}

.bookmark-copy {
  min-width: 0;
}

.bookmark-name,
.bookmark-url,
.bookmark-desc {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-name {
  color: var(--text-primary);
}

.bookmark-url {
  color: var(--text-muted);
  font-size: 12px;
}

.bookmark-desc {
  color: var(--text-secondary);
  font-size: 12px;
}

.bookmark-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
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
