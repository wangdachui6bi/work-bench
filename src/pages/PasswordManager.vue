<template>
  <div>
    <div class="page-header">
      <div>
        <a-typography-title :level="3" :style="{ color: 'var(--text-primary)', margin: 0 }">
          <LockOutlined style="margin-right: 10px;" />
          账号密码管理
        </a-typography-title>
        <a-typography-text :style="{ color: 'var(--text-secondary)' }">
          安全管理你的服务器和平台账号
        </a-typography-text>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        添加账号
      </a-button>
    </div>

    <a-card class="wb-card">
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
import { message } from 'ant-design-vue';
import { v4 as uuid } from 'uuid';
import { usePersistentState } from '../store/useStore';
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

const { state: passwords } = usePersistentState('passwords', []);
const modalOpen = ref(false);
const editItem = ref(null);
const search = ref('');
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

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
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

function handleSave() {
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

  if (editItem.value) {
    passwords.value = passwords.value.map((item) =>
      item.id === editItem.value.id ? { ...item, ...payload } : item
    );
    message.success('已更新');
  } else {
    passwords.value = [
      {
        id: uuid(),
        ...payload,
        createdAt: new Date().toISOString(),
      },
      ...passwords.value,
    ];
    message.success('已添加');
  }

  closeModal();
}

function handleDelete(id) {
  passwords.value = passwords.value.filter((item) => item.id !== id);
  message.success('已删除');
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
