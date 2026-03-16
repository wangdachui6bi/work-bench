<template>
  <div>
    <div style="margin-bottom: 24px;">
      <a-typography-title :level="3" :style="{ color: 'var(--text-primary)', margin: 0 }">
        <ClockCircleOutlined style="margin-right: 10px;" />
        番茄钟
      </a-typography-title>
      <a-typography-text :style="{ color: 'var(--text-secondary)' }">
        保持专注，提高效率
      </a-typography-text>
    </div>

    <a-row :gutter="[24, 24]">
      <a-col :xs="24" :md="14">
        <a-card class="wb-card timer-card">
          <a-tag :color="isBreak ? 'green' : 'purple'" class="mode-tag">
            <template v-if="isBreak">
              <CoffeeOutlined />
              休息时间
            </template>
            <template v-else>
              <ClockCircleOutlined />
              专注时间
            </template>
          </a-tag>

          <div style="position: relative; display: inline-block; margin-bottom: 32px;">
            <a-progress
              type="circle"
              :percent="progress"
              :size="240"
              :stroke-color="isBreak ? '#51cf66' : '#6c5ce7'"
              trail-color="var(--border)"
            >
              <template #format>
                <span class="timer-text">{{ formattedTime }}</span>
              </template>
            </a-progress>
          </div>

          <div>
            <a-space :size="16">
              <a-button v-if="!isRunning" type="primary" size="large" style="width: 120px;" @click="isRunning = true">
                <template #icon><PlayCircleOutlined /></template>
                {{ secondsLeft === totalSeconds ? '开始' : '继续' }}
              </a-button>
              <a-button v-else size="large" style="width: 120px;" @click="isRunning = false">
                <template #icon><PauseCircleOutlined /></template>
                暂停
              </a-button>
              <a-button size="large" @click="handleReset">
                <template #icon><ReloadOutlined /></template>
                重置
              </a-button>
            </a-space>
          </div>

          <div class="timer-settings">
            <div>
              <a-typography-text class="setting-label">专注时长</a-typography-text>
              <a-select v-model:value="workMinutes" :options="presets" :disabled="isRunning" style="width: 160px;" />
            </div>
            <div>
              <a-typography-text class="setting-label">休息时长</a-typography-text>
              <a-select v-model:value="breakMinutes" :options="breakPresets" :disabled="isRunning" style="width: 120px;" />
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :xs="24" :md="10">
        <a-card class="wb-card">
          <template #title>
            <span style="color: var(--text-primary);">
              <TrophyOutlined />
              统计
            </span>
          </template>
          <a-row :gutter="[16, 24]">
            <a-col :span="12">
              <a-statistic title="今日完成" :value="todaySessions" suffix="次" :value-style="{ color: 'var(--accent-light)', fontWeight: 700 }" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="累计完成" :value="stats.totalSessions" suffix="次" :value-style="{ color: 'var(--success)', fontWeight: 700 }" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="累计专注" :value="stats.totalMinutes" suffix="分钟" :value-style="{ color: 'var(--warning)', fontWeight: 700 }" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="累计小时" :value="(stats.totalMinutes / 60).toFixed(1)" suffix="h" :value-style="{ color: '#74b9ff', fontWeight: 700 }" />
            </a-col>
          </a-row>
        </a-card>

        <a-card class="wb-card tips-card">
          <template #title>
            <span style="color: var(--text-primary);">💡 专注技巧</span>
          </template>
          <ul class="tips-list">
            <li>专注期间关闭无关通知</li>
            <li>每完成4个番茄钟，休息15-30分钟</li>
            <li>一个番茄钟内不要中断</li>
            <li>提前规划好每个番茄钟的任务</li>
          </ul>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  ClockCircleOutlined,
  CoffeeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  TrophyOutlined,
} from '@ant-design/icons-vue';
import { usePersistentState } from '../store/useStore';

const presets = [
  { label: '25 分钟（标准）', value: 25 },
  { label: '15 分钟（短）', value: 15 },
  { label: '45 分钟（长）', value: 45 },
  { label: '60 分钟', value: 60 },
];

const breakPresets = [
  { label: '5 分钟', value: 5 },
  { label: '10 分钟', value: 10 },
  { label: '15 分钟', value: 15 },
];

const { state: pomodoroState } = usePersistentState('pomodoro_stats', {
  totalSessions: 0,
  totalMinutes: 0,
  todaySessions: 0,
  todayDate: '',
});

const workMinutes = ref(25);
const breakMinutes = ref(5);
const secondsLeft = ref(25 * 60);
const isRunning = ref(false);
const isBreak = ref(false);
let timerId = null;

const stats = computed(() => pomodoroState.value);
const today = computed(() => new Date().toISOString().split('T')[0]);
const totalSeconds = computed(() => (isBreak.value ? breakMinutes.value * 60 : workMinutes.value * 60));
const progress = computed(() => ((totalSeconds.value - secondsLeft.value) / totalSeconds.value) * 100);
const formattedTime = computed(() => {
  const minutes = Math.floor(secondsLeft.value / 60);
  const seconds = secondsLeft.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});
const todaySessions = computed(() =>
  stats.value.todayDate === today.value ? stats.value.todaySessions : 0
);

watch(
  isRunning,
  (running) => {
    clearTimer();
    if (running && secondsLeft.value > 0) {
      timerId = window.setInterval(() => {
        secondsLeft.value -= 1;
      }, 1000);
    }
  },
  { immediate: true }
);

watch(secondsLeft, (value) => {
  if (value !== 0 || !isRunning.value) return;

  isRunning.value = false;
  playNotification();

  if (!isBreak.value) {
    pomodoroState.value = {
      totalSessions: stats.value.totalSessions + 1,
      totalMinutes: stats.value.totalMinutes + workMinutes.value,
      todaySessions: stats.value.todayDate === today.value ? stats.value.todaySessions + 1 : 1,
      todayDate: today.value,
    };
    isBreak.value = true;
    secondsLeft.value = breakMinutes.value * 60;
  } else {
    isBreak.value = false;
    secondsLeft.value = workMinutes.value * 60;
  }
});

watch(workMinutes, (value) => {
  if (!isRunning.value && !isBreak.value) {
    secondsLeft.value = value * 60;
  }
});

watch(breakMinutes, (value) => {
  if (!isRunning.value && isBreak.value) {
    secondsLeft.value = value * 60;
  }
});

if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  Notification.requestPermission();
}

onBeforeUnmount(() => {
  clearTimer();
});

function clearTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function handleReset() {
  isRunning.value = false;
  isBreak.value = false;
  secondsLeft.value = workMinutes.value * 60;
}

function playNotification() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gain.gain.value = 0.3;
    oscillator.start();

    window.setTimeout(() => {
      oscillator.stop();
      ctx.close();
    }, 500);

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(isBreak.value ? '休息结束!' : '专注时间到!', {
        body: isBreak.value ? '开始新一轮专注吧' : '休息一下吧',
      });
    }
  } catch {
    // Ignore notification failures in unsupported environments.
  }
}
</script>

<style scoped>
.wb-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.timer-card {
  text-align: center;
}

.mode-tag {
  font-size: 14px;
  padding: 4px 16px;
  margin-bottom: 24px;
}

.timer-text {
  font-size: 48px;
  font-weight: 700;
  font-family: monospace;
  color: var(--text-primary);
}

.timer-settings {
  margin-top: 32px;
  display: flex;
  gap: 16px;
  justify-content: center;
}

.setting-label {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 4px;
}

.tips-card {
  margin-top: 16px;
}

.tips-list {
  color: var(--text-secondary);
  padding-left: 20px;
  line-height: 2;
}
</style>
