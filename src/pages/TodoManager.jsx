import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Input,
  Modal,
  Form,
  Select,
  Space,
  Typography,
  Tag,
  Checkbox,
  DatePicker,
  TimePicker,
  Calendar,
  Badge,
  Tooltip,
  message,
  Popconfirm,
  Empty,
  Segmented,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';
import { usePersistentState } from '../store/useStore';

const { Title, Text } = Typography;

const PRIORITIES = [
  { label: '高优先', value: 'high', color: 'red' },
  { label: '中优先', value: 'medium', color: 'orange' },
  { label: '低优先', value: 'low', color: 'blue' },
];

const priorityMap = Object.fromEntries(PRIORITIES.map((p) => [p.value, p]));

export default function TodoManager() {
  const [todos, setTodos] = usePersistentState('todos', []);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [filter, setFilter] = useState('all');
  const [quickInput, setQuickInput] = useState('');
  const [form] = Form.useForm();

  const today = dayjs().format('YYYY-MM-DD');

  const handleAddQuick = () => {
    if (!quickInput.trim()) return;
    setTodos((prev) => [
      {
        id: uuid(),
        title: quickInput.trim(),
        date: today,
        time: '',
        priority: 'medium',
        done: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setQuickInput('');
    message.success('已添加到今日待办');
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      setTodos((prev) => [
        {
          id: uuid(),
          title: values.title,
          date: values.date ? values.date.format('YYYY-MM-DD') : today,
          time: values.time ? values.time.format('HH:mm') : '',
          priority: values.priority || 'medium',
          done: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      message.success('已添加');
      setModalOpen(false);
      form.resetFields();
    });
  };

  const toggleDone = (id) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const handleDelete = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredTodos = useMemo(() => {
    let list = [...todos];
    if (viewMode === 'calendar') {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      list = list.filter((t) => t.date === dateStr);
    }
    if (filter === 'today') list = list.filter((t) => t.date === today);
    else if (filter === 'pending') list = list.filter((t) => !t.done);
    else if (filter === 'done') list = list.filter((t) => t.done);
    else if (filter === 'overdue') list = list.filter((t) => !t.done && t.date < today);

    list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const pOrder = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
    });
    return list;
  }, [todos, viewMode, selectedDate, filter, today]);

  const todosByDate = useMemo(() => {
    const map = {};
    todos.forEach((t) => {
      if (!t.done) {
        map[t.date] = (map[t.date] || 0) + 1;
      }
    });
    return map;
  }, [todos]);

  const dateCellRender = (date) => {
    const dateStr = date.format('YYYY-MM-DD');
    const count = todosByDate[dateStr];
    if (!count) return null;
    return (
      <div style={{ textAlign: 'center' }}>
        <Badge count={count} size="small" color="var(--accent)" />
      </div>
    );
  };

  const TodoItem = ({ todo }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        opacity: todo.done ? 0.5 : 1,
        gap: 12,
      }}
    >
      <Checkbox checked={todo.done} onChange={() => toggleDone(todo.id)} />
      <Tag color={priorityMap[todo.priority]?.color || 'blue'} style={{ minWidth: 52, textAlign: 'center' }}>
        {priorityMap[todo.priority]?.label || '中'}
      </Tag>
      <div style={{ flex: 1 }}>
        <Text
          style={{
            color: 'var(--text-primary)',
            textDecoration: todo.done ? 'line-through' : 'none',
          }}
        >
          {todo.title}
        </Text>
        <div>
          <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {todo.date}
            {todo.time && (
              <span style={{ marginLeft: 8 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {todo.time}
              </span>
            )}
          </Text>
        </div>
      </div>
      <Popconfirm title="删除此待办？" onConfirm={() => handleDelete(todo.id)}>
        <Button type="text" danger icon={<DeleteOutlined />} size="small" />
      </Popconfirm>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ color: 'var(--text-primary)', margin: 0 }}>
            <CheckSquareOutlined style={{ marginRight: 10 }} />
            待办事项
          </Title>
          <Text style={{ color: 'var(--text-secondary)' }}>管理你的任务和计划</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建待办
        </Button>
      </div>

      {/* Quick add */}
      <Card
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          marginBottom: 16,
        }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Space.Compact style={{ width: '100%' }}>
          <Input
            placeholder="快速添加今日待办，按回车确认..."
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onPressEnter={handleAddQuick}
            prefix={<PlusOutlined style={{ color: 'var(--text-muted)' }} />}
          />
          <Button type="primary" onClick={handleAddQuick}>
            添加
          </Button>
        </Space.Compact>
      </Card>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Segmented
          value={viewMode}
          onChange={setViewMode}
          options={[
            { label: <span><UnorderedListOutlined /> 列表</span>, value: 'list' },
            { label: <span><CalendarOutlined /> 日历</span>, value: 'calendar' },
          ]}
        />
        {viewMode === 'list' && (
          <Select
            value={filter}
            onChange={setFilter}
            style={{ width: 120 }}
            prefix={<FilterOutlined />}
            options={[
              { label: '全部', value: 'all' },
              { label: '今日', value: 'today' },
              { label: '未完成', value: 'pending' },
              { label: '已完成', value: 'done' },
              { label: '已过期', value: 'overdue' },
            ]}
          />
        )}
        <Text style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 13 }}>
          共 {filteredTodos.length} 条
        </Text>
      </div>

      <Row gutter={16}>
        {viewMode === 'calendar' && (
          <Col xs={24} md={10}>
            <Card
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                marginBottom: 16,
              }}
            >
              <Calendar
                fullscreen={false}
                value={selectedDate}
                onSelect={(d) => setSelectedDate(d)}
                cellRender={(date, info) => {
                  if (info.type === 'date') return dateCellRender(date);
                  return null;
                }}
              />
            </Card>
          </Col>
        )}
        <Col xs={24} md={viewMode === 'calendar' ? 14 : 24}>
          <Card
            title={
              viewMode === 'calendar' ? (
                <span style={{ color: 'var(--text-primary)' }}>
                  {selectedDate.format('M月D日')} 的待办
                </span>
              ) : null
            }
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
            styles={{ body: { padding: 0 } }}
          >
            {filteredTodos.length === 0 ? (
              <div style={{ padding: 40 }}>
                <Empty description="暂无待办事项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              filteredTodos.map((todo) => <TodoItem key={todo.id} todo={todo} />)
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="新建待办"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="添加"
        cancelText="取消"
        width={480}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="待办内容" rules={[{ required: true, message: '请输入待办内容' }]}>
            <Input placeholder="要做什么？" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="日期">
                <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="time" label="时间">
                <TimePicker style={{ width: '100%' }} format="HH:mm" placeholder="选择时间" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="priority" label="优先级" initialValue="medium">
            <Select options={PRIORITIES} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
