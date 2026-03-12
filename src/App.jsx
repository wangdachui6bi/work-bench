import React, { useState } from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  LockOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  LinkOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import PasswordManager from './pages/PasswordManager';
import TodoManager from './pages/TodoManager';
import QuickNotes from './pages/QuickNotes';
import Bookmarks from './pages/Bookmarks';
import PomodoroTimer from './pages/PomodoroTimer';

const { Sider, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: 'passwords', icon: <LockOutlined />, label: '账号密码' },
  { key: 'todos', icon: <CheckSquareOutlined />, label: '待办事项' },
  { key: 'notes', icon: <FileTextOutlined />, label: '快捷笔记' },
  { key: 'bookmarks', icon: <LinkOutlined />, label: '书签导航' },
  { key: 'pomodoro', icon: <ClockCircleOutlined />, label: '番茄钟' },
];

const pageMap = {
  dashboard: Dashboard,
  passwords: PasswordManager,
  todos: TodoManager,
  notes: QuickNotes,
  bookmarks: Bookmarks,
  pomodoro: PomodoroTimer,
};

export default function App() {
  const [activeKey, setActiveKey] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const ActivePage = pageMap[activeKey];

  return (
    <Layout style={{ height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="app-drag-region" />
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
        collapsedWidth={72}
        style={{
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          paddingTop: 52,
          overflow: 'auto',
        }}
        trigger={null}
      >
        <div
          style={{
            padding: collapsed ? '16px 0' : '16px 20px',
            textAlign: 'center',
            marginBottom: 8,
            cursor: 'pointer',
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <Text
            strong
            style={{
              color: 'var(--accent-light)',
              fontSize: collapsed ? 18 : 20,
              letterSpacing: 1,
            }}
          >
            {collapsed ? '⚡' : '⚡ WorkBench'}
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={({ key }) => setActiveKey(key)}
          style={{
            border: 'none',
            background: 'transparent',
          }}
        />
      </Sider>
      <Content
        style={{
          padding: '68px 32px 32px',
          overflow: 'auto',
          background: 'var(--bg-primary)',
        }}
      >
        <ActivePage onNavigate={setActiveKey} />
      </Content>
    </Layout>
  );
}
