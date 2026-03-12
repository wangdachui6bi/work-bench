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
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PushpinOutlined,
  PushpinFilled,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';
import { usePersistentState } from '../store/useStore';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const NOTE_COLORS = [
  { label: '默认', value: 'default', bg: 'var(--bg-card)', border: 'var(--border)' },
  { label: '紫色', value: 'purple', bg: '#2d1f5e', border: '#4a2d8a' },
  { label: '蓝色', value: 'blue', bg: '#1a2a4a', border: '#2a4a7a' },
  { label: '绿色', value: 'green', bg: '#1a3a2a', border: '#2a5a3a' },
  { label: '橙色', value: 'orange', bg: '#3a2a1a', border: '#5a3a1a' },
];

const colorMap = Object.fromEntries(NOTE_COLORS.map((c) => [c.value, c]));

export default function QuickNotes() {
  const [notes, setNotes] = usePersistentState('notes', []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const handleSave = () => {
    form.validateFields().then((values) => {
      if (editItem) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editItem.id ? { ...n, ...values, updatedAt: new Date().toISOString() } : n
          )
        );
        message.success('已更新');
      } else {
        setNotes((prev) => [
          {
            id: uuid(),
            ...values,
            pinned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
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

  const openEdit = (note) => {
    setEditItem(note);
    form.setFieldsValue(note);
    setModalOpen(true);
  };

  const togglePin = (id) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
  };

  const handleDelete = (id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    message.success('已删除');
  };

  const filtered = notes
    .filter(
      (n) =>
        !search ||
        n.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.content?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ color: 'var(--text-primary)', margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 10 }} />
            快捷笔记
          </Title>
          <Text style={{ color: 'var(--text-secondary)' }}>随时记录灵感和重要信息</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建笔记
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索笔记..."
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
          <Empty description="暂无笔记" image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button type="primary" onClick={() => setModalOpen(true)}>
              创建第一条笔记
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((note) => {
            const colors = colorMap[note.color] || colorMap.default;
            return (
              <Col xs={24} sm={12} lg={8} key={note.id}>
                <Card
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 'var(--radius)',
                    height: '100%',
                  }}
                  styles={{ body: { padding: 20, display: 'flex', flexDirection: 'column', height: '100%' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>
                      {note.pinned && <PushpinFilled style={{ color: 'var(--accent-light)', marginRight: 6 }} />}
                      {note.title}
                    </Text>
                    <Space size={0}>
                      <Button
                        type="text"
                        size="small"
                        icon={note.pinned ? <PushpinFilled style={{ color: 'var(--accent-light)' }} /> : <PushpinOutlined />}
                        onClick={() => togglePin(note.id)}
                      />
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(note)} />
                      <Popconfirm title="删除这条笔记？" onConfirm={() => handleDelete(note.id)}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </div>
                  <Paragraph
                    style={{ color: 'var(--text-secondary)', flex: 1, marginBottom: 8, whiteSpace: 'pre-wrap' }}
                    ellipsis={{ rows: 6 }}
                  >
                    {note.content}
                  </Paragraph>
                  <Text style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {dayjs(note.updatedAt).format('MM-DD HH:mm')}
                  </Text>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal
        title={editItem ? '编辑笔记' : '新建笔记'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={closeModal}
        okText="保存"
        cancelText="取消"
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="笔记标题" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea rows={8} placeholder="记下你的想法..." />
          </Form.Item>
          <Form.Item name="color" label="颜色标签" initialValue="default">
            <Select options={NOTE_COLORS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
