import React, { useState } from 'react';
import {
  Card,
  Button,
  Input,
  Modal,
  Form,
  Typography,
  Tag,
  Space,
  Select,
  Popconfirm,
  Empty,
  message,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  CopyOutlined,
  GlobalOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { v4 as uuid } from 'uuid';
import { usePersistentState } from '../store/useStore';

const { Title, Text } = Typography;

const BOOKMARK_TAGS = [
  { label: '工作', value: 'work', color: 'purple' },
  { label: '工具', value: 'tool', color: 'blue' },
  { label: '文档', value: 'doc', color: 'green' },
  { label: '监控', value: 'monitor', color: 'orange' },
  { label: '其他', value: 'other', color: 'default' },
];

const tagMap = Object.fromEntries(BOOKMARK_TAGS.map((t) => [t.value, t]));

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = usePersistentState('bookmarks', []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (editItem) {
        setBookmarks((prev) =>
          prev.map((b) => (b.id === editItem.id ? { ...b, ...values } : b))
        );
        message.success('已更新');
      } else {
        setBookmarks((prev) => [{ id: uuid(), ...values }, ...prev]);
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

  const openEdit = (item) => {
    setEditItem(item);
    form.setFieldsValue(item);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    message.success('已删除');
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    message.success('链接已复制');
  };

  const openUrl = (url) => {
    window.open(url, '_blank');
  };

  const filtered = bookmarks.filter(
    (b) =>
      !search ||
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.url?.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ color: 'var(--text-primary)', margin: 0 }}>
            <LinkOutlined style={{ marginRight: 10 }} />
            书签导航
          </Title>
          <Text style={{ color: 'var(--text-secondary)' }}>快速访问常用链接</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          添加书签
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索书签..."
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ maxWidth: 400 }}
        />
      </div>

      {filtered.length === 0 ? (
        <Card
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
        >
          <Empty description="暂无书签" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => setModalOpen(true)}>
              添加第一个书签
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((bm) => {
            const tag = tagMap[bm.tag] || tagMap.other;
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={bm.id}>
                <Card
                  hoverable
                  onClick={() => openUrl(bm.url)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                  }}
                  styles={{ body: { padding: 20 } }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <GlobalOutlined style={{ fontSize: 24, color: 'var(--accent-light)', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <Text
                          strong
                          style={{ color: 'var(--text-primary)', display: 'block' }}
                          ellipsis={{ tooltip: bm.name }}
                        >
                          {bm.name}
                        </Text>
                        <Text
                          style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block' }}
                          ellipsis={{ tooltip: bm.url }}
                        >
                          {bm.url}
                        </Text>
                      </div>
                    </div>
                  </div>
                  {bm.description && (
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 12 }} ellipsis={{ tooltip: bm.description }}>
                      {bm.description}
                    </Text>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <Tag color={tag.color}>{tag.label}</Tag>
                    <Space
                      size={4}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip title="复制链接">
                        <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyUrl(bm.url)} />
                      </Tooltip>
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(bm)} />
                      <Popconfirm title="删除此书签？" onConfirm={() => handleDelete(bm.id)}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title={editItem ? '编辑书签' : '添加书签'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={closeModal}
        okText="保存"
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例：Jenkins 构建平台" />
          </Form.Item>
          <Form.Item name="url" label="链接" rules={[{ required: true, message: '请输入链接' }]}>
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="tag" label="标签" initialValue="work">
            <Select options={BOOKMARK_TAGS} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input placeholder="简短描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
