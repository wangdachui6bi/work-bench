import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Table,
  Modal,
  Form,
  Select,
  Space,
  Typography,
  Tag,
  Tooltip,
  message,
  Popconfirm,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  LockOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { v4 as uuid } from 'uuid';
import { usePersistentState } from '../store/useStore';

const { Title, Text } = Typography;

const CATEGORIES = [
  { label: '服务器', value: 'server', color: 'purple' },
  { label: '数据库', value: 'database', color: 'blue' },
  { label: '网站后台', value: 'website', color: 'green' },
  { label: 'API / Token', value: 'api', color: 'orange' },
  { label: '邮箱', value: 'email', color: 'cyan' },
  { label: '其他', value: 'other', color: 'default' },
];

const catMap = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

export default function PasswordManager() {
  const [passwords, setPasswords] = usePersistentState('passwords', []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [visiblePwds, setVisiblePwds] = useState({});
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (editItem) {
        setPasswords((prev) =>
          prev.map((p) => (p.id === editItem.id ? { ...p, ...values, updatedAt: new Date().toISOString() } : p))
        );
        message.success('已更新');
      } else {
        setPasswords((prev) => [
          { id: uuid(), ...values, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ...prev,
        ]);
        message.success('已添加');
      }
      closeModal();
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    form.resetFields();
  };

  const openEdit = (record) => {
    setEditItem(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    setPasswords((prev) => prev.filter((p) => p.id !== id));
    message.success('已删除');
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const togglePwd = (id) => {
    setVisiblePwds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = passwords.filter(
    (p) =>
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.host?.toLowerCase().includes(search.toLowerCase()) ||
      p.username?.toLowerCase().includes(search.toLowerCase()) ||
      p.remark?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <CloudServerOutlined style={{ color: 'var(--accent-light)' }} />
          <div>
            <Text strong style={{ color: 'var(--text-primary)' }}>{text}</Text>
            {record.host && (
              <Text style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block' }}>
                {record.host}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (val) => {
        const cat = catMap[val];
        return cat ? <Tag color={cat.color}>{cat.label}</Tag> : '--';
      },
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 180,
      render: (text) => (
        <Space>
          <Text style={{ color: 'var(--text-primary)' }}>{text}</Text>
          <Tooltip title="复制">
            <CopyOutlined
              style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => copyText(text)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '密码',
      dataIndex: 'password',
      key: 'password',
      width: 200,
      render: (text, record) => (
        <Space>
          <Text style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {visiblePwds[record.id] ? text : '••••••••'}
          </Text>
          <Tooltip title={visiblePwds[record.id] ? '隐藏' : '显示'}>
            {visiblePwds[record.id] ? (
              <EyeInvisibleOutlined
                style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => togglePwd(record.id)}
              />
            ) : (
              <EyeOutlined
                style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => togglePwd(record.id)}
              />
            )}
          </Tooltip>
          <Tooltip title="复制">
            <CopyOutlined
              style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
              onClick={() => copyText(text)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      ellipsis: true,
      render: (text) => <Text style={{ color: 'var(--text-secondary)' }}>{text || '--'}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ color: 'var(--text-primary)', margin: 0 }}>
            <LockOutlined style={{ marginRight: 10 }} />
            账号密码管理
          </Title>
          <Text style={{ color: 'var(--text-secondary)' }}>安全管理你的服务器和平台账号</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          添加账号
        </Button>
      </div>

      <Card
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            placeholder="搜索名称、主机、用户名、备注..."
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ maxWidth: 400 }}
          />
        </div>

        {filtered.length === 0 ? (
          <Empty description="暂无账号记录" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => setModalOpen(true)}>
              添加第一个账号
            </Button>
          </Empty>
        ) : (
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 条` }}
            size="middle"
          />
        )}
      </Card>

      <Modal
        title={editItem ? '编辑账号' : '添加账号'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={closeModal}
        okText="保存"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例：生产环境服务器" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select options={CATEGORIES} placeholder="选择分类" />
          </Form.Item>
          <Form.Item name="host" label="主机/地址">
            <Input placeholder="例：192.168.1.100 或 https://example.com" />
          </Form.Item>
          <Form.Item name="port" label="端口">
            <Input placeholder="例：22、3306、443" />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={3} placeholder="备注信息..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
