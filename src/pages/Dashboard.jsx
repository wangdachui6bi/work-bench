import React from 'react';
import { Card, Row, Col, Typography, Tag, Empty, Button } from 'antd';
import {
  LockOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { usePersistentState } from '../store/useStore';

const { Title, Text, Paragraph } = Typography;

const greetingByHour = () => {
  const h = dayjs().hour();
  if (h < 6) return '夜深了，注意休息 🌙';
  if (h < 12) return '早上好 ☀️';
  if (h < 14) return '中午好 🌤';
  if (h < 18) return '下午好 ☕';
  return '晚上好 🌆';
};

export default function Dashboard({ onNavigate }) {
  const [todos] = usePersistentState('todos', []);
  const [passwords] = usePersistentState('passwords', []);
  const [notes] = usePersistentState('notes', []);
  const [bookmarks] = usePersistentState('bookmarks', []);

  const today = dayjs().format('YYYY-MM-DD');
  const todayTodos = todos.filter((t) => t.date === today && !t.done);
  const pendingTodos = todos.filter((t) => !t.done);

  const stats = [
    {
      title: '服务器账号',
      count: passwords.length,
      icon: <LockOutlined />,
      color: '#6c5ce7',
      key: 'passwords',
    },
    {
      title: '待办事项',
      count: pendingTodos.length,
      icon: <CheckSquareOutlined />,
      color: '#fcc419',
      key: 'todos',
    },
    {
      title: '快捷笔记',
      count: notes.length,
      icon: <FileTextOutlined />,
      color: '#51cf66',
      key: 'notes',
    },
    {
      title: '书签链接',
      count: bookmarks.length,
      icon: <LinkOutlined />,
      color: '#74b9ff',
      key: 'bookmarks',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={3} style={{ color: 'var(--text-primary)', marginBottom: 4 }}>
          {greetingByHour()}
        </Title>
        <Text style={{ color: 'var(--text-secondary)' }}>
          {dayjs().format('YYYY年M月D日 dddd')}
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {stats.map((s) => (
          <Col xs={12} sm={12} md={6} key={s.key}>
            <Card
              hoverable
              onClick={() => onNavigate(s.key)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
              styles={{ body: { padding: '20px 24px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.title}</Text>
                  <Title
                    level={2}
                    style={{ color: s.color, margin: '4px 0 0', fontWeight: 700 }}
                  >
                    {s.count}
                  </Title>
                </div>
                <div
                  style={{
                    fontSize: 28,
                    color: s.color,
                    opacity: 0.3,
                  }}
                >
                  {s.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}>
          <Card
            title={
              <span style={{ color: 'var(--text-primary)' }}>
                📋 今日待办 <Tag color="orange">{todayTodos.length}</Tag>
              </span>
            }
            extra={
              <Button type="link" onClick={() => onNavigate('todos')}>
                查看全部 <ArrowRightOutlined />
              </Button>
            }
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            {todayTodos.length === 0 ? (
              <Empty description="今天没有待办事项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              todayTodos.slice(0, 5).map((todo) => (
                <div
                  key={todo.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Tag
                    color={
                      todo.priority === 'high'
                        ? 'red'
                        : todo.priority === 'medium'
                        ? 'orange'
                        : 'blue'
                    }
                  >
                    {todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
                  </Tag>
                  <Text style={{ color: 'var(--text-primary)' }}>{todo.title}</Text>
                  {todo.time && (
                    <Text style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: 12 }}>
                      <ClockCircleOutlined /> {todo.time}
                    </Text>
                  )}
                </div>
              ))
            )}
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card
            title={<span style={{ color: 'var(--text-primary)' }}>🔐 最近账号</span>}
            extra={
              <Button type="link" onClick={() => onNavigate('passwords')}>
                管理 <ArrowRightOutlined />
              </Button>
            }
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            {passwords.length === 0 ? (
              <Empty description="暂无保存的账号" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              passwords.slice(0, 4).map((pw) => (
                <div
                  key={pw.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <LockOutlined style={{ color: 'var(--accent-light)' }} />
                  <div>
                    <Text style={{ color: 'var(--text-primary)', display: 'block' }}>
                      {pw.name}
                    </Text>
                    <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {pw.host || pw.category || '--'}
                    </Text>
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
