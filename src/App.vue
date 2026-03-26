<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <a-layout class="app-layout">
      <div class="app-drag-region" />

      <a-layout-sider
        v-model:collapsed="collapsed"
        collapsible
        :trigger="null"
        :width="220"
        :collapsed-width="72"
        class="app-sider"
      >
        <button class="brand-button" @click="collapsed = !collapsed">
          <span class="brand-orb">⚡</span>
          <span v-if="!collapsed" class="brand-copy">
            <span class="brand-mark">WorkBench</span>
            <span class="brand-subtitle">Desktop cockpit</span>
          </span>
        </button>

        <a-menu :selectedKeys="selectedKeys" mode="inline" theme="dark" class="app-menu">
          <a-menu-item v-for="item in menuItems" :key="item.key" @click="activeKey = item.key">
            <template #icon>
              <component :is="item.icon" />
            </template>
            {{ item.label }}
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <a-layout-content class="app-content">
        <div class="app-content-shell">
          <component :is="activePage" @navigate="activeKey = $event" />
        </div>
      </a-layout-content>
    </a-layout>
  </a-config-provider>
</template>

<script setup>
import { computed, markRaw, onBeforeUnmount, onMounted, ref } from 'vue';
import { theme } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import {
  DashboardOutlined,
  LockOutlined,
  CheckSquareOutlined,
  FileTextOutlined,
  LinkOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons-vue';
import Dashboard from './pages/Dashboard.vue';
import PasswordManager from './pages/PasswordManager.vue';
import TodoManager from './pages/TodoManager.vue';
import QuickNotes from './pages/QuickNotes.vue';
import Bookmarks from './pages/Bookmarks.vue';
import PomodoroTimer from './pages/PomodoroTimer.vue';

const menuItems = [
  { key: 'dashboard', icon: markRaw(DashboardOutlined), label: '仪表盘' },
  { key: 'passwords', icon: markRaw(LockOutlined), label: '账号密码' },
  { key: 'todos', icon: markRaw(CheckSquareOutlined), label: '待办事项' },
  { key: 'notes', icon: markRaw(FileTextOutlined), label: '快捷笔记' },
  { key: 'bookmarks', icon: markRaw(LinkOutlined), label: '书签导航' },
  { key: 'pomodoro', icon: markRaw(ClockCircleOutlined), label: '番茄钟' },
];

const pageMap = {
  dashboard: markRaw(Dashboard),
  passwords: markRaw(PasswordManager),
  todos: markRaw(TodoManager),
  notes: markRaw(QuickNotes),
  bookmarks: markRaw(Bookmarks),
  pomodoro: markRaw(PomodoroTimer),
};

const activeKey = ref('dashboard');
const collapsed = ref(false);
const selectedKeys = computed(() => [activeKey.value]);
const activePage = computed(() => pageMap[activeKey.value]);

let removeNavigateListener = null;

onMounted(() => {
  if (!window.electronAPI?.app?.onNavigate) {
    return;
  }

  removeNavigateListener = window.electronAPI.app.onNavigate((key) => {
    if (pageMap[key]) {
      activeKey.value = key;
    }
  });
});

onBeforeUnmount(() => {
  if (removeNavigateListener) {
    removeNavigateListener();
    removeNavigateListener = null;
  }
});

const themeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6c5ce7',
    borderRadius: 10,
    colorBgContainer: '#1e1e2e',
    colorBgElevated: '#262638',
    colorBorder: '#2a2a3c',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  components: {
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
    },
  },
};
</script>

<style scoped>
.app-layout {
  height: 100vh;
  background: var(--bg-primary);
}

.app-sider {
  background:
    linear-gradient(180deg, rgba(32, 33, 48, 0.96), rgba(22, 23, 34, 0.98));
  border-right: 1px solid rgba(162, 155, 254, 0.12);
  padding-top: 52px;
  overflow: auto;
  box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.03);
}

.brand-button {
  width: 100%;
  padding: 16px 18px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--accent-light);
}

.brand-orb {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.32), rgba(92, 225, 230, 0.18));
  box-shadow: 0 12px 24px rgba(108, 92, 231, 0.2);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.brand-mark {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.brand-subtitle {
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.app-menu {
  border: none;
  background: transparent;
}

.app-content {
  padding: 68px 28px 28px;
  overflow: auto;
  background:
    radial-gradient(circle at top right, rgba(108, 92, 231, 0.12), transparent 22%),
    radial-gradient(circle at bottom left, rgba(92, 225, 230, 0.08), transparent 24%),
    var(--bg-primary);
}

.app-content-shell {
  min-height: calc(100vh - 96px);
  padding: 28px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(162, 155, 254, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(12px);
}

@media (max-width: 768px) {
  .app-content {
    padding: 64px 14px 14px;
  }

  .app-content-shell {
    padding: 18px;
    border-radius: 22px;
  }
}
</style>
