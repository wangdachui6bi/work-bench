<template>
  <div>
    <div class="page-header">
      <div>
        <a-typography-title :level="3" :style="{ color: 'var(--text-primary)', margin: 0 }">
          <LockOutlined style="margin-right: 10px;" />
          账号密码管理
        </a-typography-title>
        <div class="header-meta">
          <a-typography-text :style="{ color: 'var(--text-secondary)' }">
            安全管理你的服务器和平台账号
          </a-typography-text>
          <a-tag :color="syncConfig.enabled ? 'blue' : 'default'">
            {{ syncConfig.enabled ? '云端数据库' : '仅本地保存' }}
          </a-tag>
        </div>
      </div>
      <div class="header-actions">
        <a-button v-if="syncConfig.enabled" @click="handleRefresh" :loading="loading">
          重新同步
        </a-button>
        <a-button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          添加账号
        </a-button>
      </div>
    </div>

    <a-card class="wb-card">
      <a-alert
        v-if="lastError"
        type="warning"
        show-icon
        style="margin-bottom: 16px;"
        :message="`云端同步失败，当前先使用本地缓存：${lastError}`"
      />

      <div style="margin-bottom: 16px;">
        <a-input v-model:value="search" placeholder="搜索名称、主机、用户名、备注..." allow-clear style="max-width: 400px;">
          <template #prefix><SearchOutlined style="color: var(--text-muted);" /></template>
        </a-input>
      </div>

      <a-empty v-if="filtered.length === 0" description="暂无账号记录">
        <a-button type="primary" @click="openCreate">添加第一个账号</a-button>
      </a-empty>
      <a-table
        v-else
        :data-source="filtered"
        :columns="columns"
        :loading="loading"
        :pagination="{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }"
        row-key="id"
        size="middle"
      />
    </a-card>

    <a-modal
      :open="modalOpen"
      :title="editItem ? '编辑账号' : '添加账号'"
      ok-text="保存"
      cancel-text="取消"
      :width="520"
      :confirm-loading="submitting"
      @ok="handleSave"
      @cancel="closeModal"
    >
      <div class="modal-form">
        <label class="field-label field-required">名称</label>
        <a-input v-model:value="form.name" placeholder="例：生产环境服务器" />

        <label class="field-label field-required">分类</label>
        <a-select v-model:value="form.category" :options="categories" placeholder="选择分类" />

        <label class="field-label">主机/地址</label>
        <a-input v-model:value="form.host" placeholder="例：192.168.1.100 或 https://example.com" />

        <label class="field-label">端口</label>
        <a-input v-model:value="form.port" placeholder="例：22、3306、443" />

        <label class="field-label field-required">用户名</label>
        <a-input v-model:value="form.username" placeholder="用户名" />

        <label class="field-label field-required">密码</label>
        <a-input-password v-model:value="form.password" placeholder="密码" />

        <label class="field-label">备注</label>
        <a-textarea v-model:value="form.remark" :rows="3" placeholder="备注信息..." />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, h, reactive, ref } from 'vue';
import dayjs from 'dayjs';
import { message } from 'ant-design-vue';
import { v4 as uuid } from 'uuid';
import {
  createPasswordRecord,
  deletePasswordRecord,
  updatePasswordRecord,
  usePasswordVault,
} from '../store/passwordCloudStore';
import {
  CloudServerOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';

const categories = [
  { label: '服务器', value: 'server', color: 'purple' },
  { label: '数据库', value: 'database', color: 'blue' },
  { label: '网站后台', value: 'website', color: 'green' },
  { label: 'API / Token', value: 'api', color: 'orange' },
  { label: '邮箱', value: 'email', color: 'cyan' },
  { label: '其他', value: 'other', color: 'default' },
];

const catMap = Object.fromEntries(categories.map((item) => [item.value, item]));

const emptyForm = () => ({
  name: '',
  category: undefined,
  host: '',
  port: '',
  username: '',
  password: '',
  remark: '',
});

const { passwords, loading, lastError, syncConfig, refreshPasswords } = usePasswordVault();
const modalOpen = ref(false);
const editItem = ref(null);
const search = ref('');
const submitting = ref(false);
const visiblePwds = reactive({});
const form = reactive(emptyForm());

const filtered = computed(() =>
  passwords.value.filter((item) => {
    if (!search.value) return true;
    const keyword = search.value.toLowerCase();
    return [item.name, item.host, item.username, item.remark].some((field) =>
      field?.toLowerCase().includes(keyword)
    );
  })
);

function formatUpdatedAt(value) {
  if (!value) return '--';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : '--';
}

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'zh-CN');
}

function compareUpdatedAt(a, b) {
  return dayjs(a?.updatedAt).valueOf() - dayjs(b?.updatedAt).valueOf();
}

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    sorter: (a, b) => {
      const byName = compareText(a?.name, b?.name);
      if (byName !== 0) return byName;
      return compareText(a?.host, b?.host);
    },
    customRender: ({ text, record }) =>
      h('div', { style: 'display:flex; align-items:center; gap:10px;' }, [
        h(CloudServerOutlined, { style: 'color: var(--accent-light);' }),
        h('div', [
          h('div', { style: 'color: var(--text-primary); font-weight: 600;' }, text),
          record.host
            ? h('div', { style: 'color: var(--text-muted); font-size: 12px;' }, record.host)
            : null,
        ]),
      ]),
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 100,
    sorter: (a, b) => compareText(catMap[a?.category]?.label || a?.category, catMap[b?.category]?.label || b?.category),
    customRender: ({ text }) =>
      catMap[text]
        ? h(
            'span',
            {
              class: 'category-pill',
              style: `--pill-color:${catMap[text].color === 'default' ? '#64748b' : catMap[text].color};`,
            },
            catMap[text].label
          )
        : '--',
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 180,
    sorter: (a, b) => compareText(a?.username, b?.username),
  },
  {
    title: '密码',
    dataIndex: 'password',
    key: 'password',
    width: 220,
    customRender: ({ text, record }) =>
      h('div', { class: 'inline-actions' }, [
        h(
          'span',
          { style: 'color: var(--text-primary); font-family: monospace;' },
          visiblePwds[record.id] ? text : '••••••••'
        ),
        h(
          'button',
          { class: 'icon-button', onClick: () => togglePwd(record.id) },
          [visiblePwds[record.id] ? h(EyeInvisibleOutlined) : h(EyeOutlined)]
        ),
        h(
          'button',
          { class: 'icon-button', onClick: () => copyText(text) },
          [h(CopyOutlined)]
        ),
      ]),
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    ellipsis: true,
    sorter: (a, b) => compareText(a?.remark, b?.remark),
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 160,
    sorter: compareUpdatedAt,
    defaultSortOrder: 'descend',
    customRender: ({ text }) =>
      h('span', { style: 'color: var(--text-secondary); font-size: 13px;' }, formatUpdatedAt(text)),
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    customRender: ({ record }) =>
      h('div', { class: 'inline-actions' }, [
        h(
          'button',
          { class: 'icon-button', onClick: () => openEdit(record) },
          [h(EditOutlined)]
        ),
        h(
          'button',
          { class: 'icon-button danger', onClick: () => handleDelete(record.id) },
          [h(DeleteOutlined)]
        ),
      ]),
  },
];

function resetForm() {
  Object.assign(form, emptyForm());
}

function openCreate() {
  editItem.value = null;
  resetForm();
  modalOpen.value = true;
}

function openEdit(record) {
  editItem.value = record;
  Object.assign(form, {
    name: record.name || '',
    category: record.category,
    host: record.host || '',
    port: record.port || '',
    username: record.username || '',
    password: record.password || '',
    remark: record.remark || '',
  });
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  editItem.value = null;
  resetForm();
}

async function handleSave() {
  if (!form.name.trim()) return message.error('请输入名称');
  if (!form.category) return message.error('请选择分类');
  if (!form.username.trim()) return message.error('请输入用户名');
  if (!form.password.trim()) return message.error('请输入密码');

  const payload = {
    ...form,
    name: form.name.trim(),
    username: form.username.trim(),
    updatedAt: new Date().toISOString(),
  };

  submitting.value = true;

  try {
    if (editItem.value) {
      await updatePasswordRecord(editItem.value.id, payload);
      message.success('已更新');
    } else {
      await createPasswordRecord({
        id: uuid(),
        ...payload,
        createdAt: new Date().toISOString(),
      });
      message.success('已添加');
    }

    closeModal();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(id) {
  try {
    await deletePasswordRecord(id);
    message.success('已删除');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除失败');
  }
}

async function handleRefresh() {
  try {
    await refreshPasswords();
    message.success('已完成同步');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '同步失败');
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text || '');
  message.success('已复制到剪贴板');
}

function togglePwd(id) {
  visiblePwds[id] = !visiblePwds[id];
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wb-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
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

.field-required::before {
  content: '*';
  margin-right: 4px;
  color: #ff4d4f;
  font-weight: 700;
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

.category-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--pill-color);
  background: color-mix(in srgb, var(--pill-color) 16%, transparent);
}
</style>
