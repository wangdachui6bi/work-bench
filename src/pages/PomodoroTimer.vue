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
          <a-tag :color="isBreakMode ? 'green' : 'purple'" class="mode-tag">
            <template v-if="isBreakMode">
              <CoffeeOutlined />
              {{ currentModeLabel }}
            </template>
            <template v-else>
              <ClockCircleOutlined />
              {{ currentModeLabel }}
            </template>
          </a-tag>

          <div style="position: relative; display: inline-block; margin-bottom: 32px;">
            <a-progress
              type="circle"
              :percent="progress"
              :size="240"
              :stroke-color="isBreakMode ? '#51cf66' : '#6c5ce7'"
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
              <a-input-number
                v-model:value="settings.focusMinutes"
                :min="1"
                :max="180"
                :precision="0"
                :disabled="isRunning"
                style="width: 140px;"
                addon-after="分钟"
              />
            </div>
            <div>
              <a-typography-text class="setting-label">短休息</a-typography-text>
              <a-input-number
                v-model:value="settings.shortBreakMinutes"
                :min="1"
                :max="60"
                :precision="0"
                :disabled="isRunning"
                style="width: 140px;"
                addon-after="分钟"
              />
            </div>
            <div>
              <a-typography-text class="setting-label">长休息</a-typography-text>
              <a-input-number
                v-model:value="settings.longBreakMinutes"
                :min="1"
                :max="90"
                :precision="0"
                :disabled="isRunning"
                style="width: 140px;"
                addon-after="分钟"
              />
            </div>
            <div>
              <a-typography-text class="setting-label">长休息间隔</a-typography-text>
              <a-input-number
                v-model:value="settings.longBreakInterval"
                :min="2"
                :max="12"
                :precision="0"
                :disabled="isRunning"
                style="width: 140px;"
                addon-after="轮"
              />
            </div>
          </div>

          <div class="timer-advanced">
            <div class="timer-advanced__header">
              <div>
                <a-typography-title :level="5" :style="{ margin: 0, color: 'var(--text-primary)' }">
                  自动循环
                </a-typography-title>
                <a-typography-text :style="{ color: 'var(--text-secondary)' }">
                  开启后会按照“专注 -> 休息 -> 专注”持续轮询，不再每轮手动点开始
                </a-typography-text>
              </div>
              <a-switch v-model:checked="settings.autoCycle" :disabled="false" checked-children="开" un-checked-children="关" />
            </div>

            <div class="timer-reminders">
              <div class="timer-reminders__item">
                <a-typography-text class="setting-label">专注结束提醒标题</a-typography-text>
                <a-input
                  v-model:value="settings.focusEndTitle"
                  :maxlength="40"
                  placeholder="例如：这一轮完成了"
                />
              </div>
              <div class="timer-reminders__item">
                <a-typography-text class="setting-label">专注结束提醒内容</a-typography-text>
                <a-textarea
                  v-model:value="settings.focusEndBody"
                  :maxlength="120"
                  :rows="2"
                  placeholder="例如：起身活动 5 分钟，准备下一轮"
                />
              </div>
              <div class="timer-reminders__item">
                <a-typography-text class="setting-label">休息结束提醒标题</a-typography-text>
                <a-input
                  v-model:value="settings.breakEndTitle"
                  :maxlength="40"
                  placeholder="例如：休息结束"
                />
              </div>
              <div class="timer-reminders__item">
                <a-typography-text class="setting-label">休息结束提醒内容</a-typography-text>
                <a-textarea
                  v-model:value="settings.breakEndBody"
                  :maxlength="120"
                  :rows="2"
                  placeholder="例如：开始下一轮专注吧"
                />
              </div>
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
            <a-col :span="12">
              <a-statistic title="当前轮次" :value="focusStreak" suffix="轮" :value-style="{ color: '#a29bfe', fontWeight: 700 }" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="下次长休息" :value="sessionsUntilLongBreak" suffix="轮后" :value-style="{ color: '#51cf66', fontWeight: 700 }" />
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

const MODE_FOCUS = 'focus';
const MODE_SHORT_BREAK = 'shortBreak';
const MODE_LONG_BREAK = 'longBreak';

const { state: pomodoroState } = usePersistentState('pomodoro_stats', {
  totalSessions: 0,
  totalMinutes: 0,
  todaySessions: 0,
  todayDate: '',
  focusStreak: 0,
});

const { state: settingsState } = usePersistentState('pomodoro_settings', {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  longBreakInterval: 4,
  autoCycle: false,
  focusEndTitle: '专注时间到',
  focusEndBody: '休息一下吧，活动活动肩颈。',
  breakEndTitle: '休息结束',
  breakEndBody: '开始下一轮专注吧。',
});

const settings = settingsState;
const currentMode = ref(MODE_FOCUS);
const secondsLeft = ref(settings.value.focusMinutes * 60);
const isRunning = ref(false);
let timerId = null;

const stats = computed(() => pomodoroState.value);
const today = computed(() => new Date().toISOString().split('T')[0]);
const isBreakMode = computed(() => currentMode.value !== MODE_FOCUS);
const focusStreak = computed(() => Number(stats.value.focusStreak || 0));
const currentModeLabel = computed(() => {
  if (currentMode.value === MODE_LONG_BREAK) return '长休息时间';
  if (currentMode.value === MODE_SHORT_BREAK) return '短休息时间';
  return '专注时间';
});
const totalSeconds = computed(() => getDurationMinutes(currentMode.value) * 60);
const progress = computed(() => {
  if (totalSeconds.value <= 0) return 0;
  return ((totalSeconds.value - secondsLeft.value) / totalSeconds.value) * 100;
});
const formattedTime = computed(() => {
  const minutes = Math.floor(secondsLeft.value / 60);
  const seconds = secondsLeft.value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});
const todaySessions = computed(() =>
  stats.value.todayDate === today.value ? stats.value.todaySessions : 0
);
const sessionsUntilLongBreak = computed(() => {
  const interval = normalizePositiveInteger(settings.value.longBreakInterval, 4, 2, 12);
  const completed = focusStreak.value % interval;
  return completed === 0 ? interval : interval - completed;
});

watch(
  isRunning,
  (running) => {
    clearTimer();
    if (running && secondsLeft.value > 0) {
      startTimer();
    }
  },
  { immediate: true }
);

watch(secondsLeft, (value) => {
  if (value !== 0 || !isRunning.value) return;

  if (currentMode.value === MODE_FOCUS) {
    const nextFocusStreak = focusStreak.value + 1;
    const interval = normalizePositiveInteger(settings.value.longBreakInterval, 4, 2, 12);
    pomodoroState.value = {
      totalSessions: stats.value.totalSessions + 1,
      totalMinutes: stats.value.totalMinutes + normalizePositiveInteger(settings.value.focusMinutes, 25, 1, 180),
      todaySessions: stats.value.todayDate === today.value ? stats.value.todaySessions + 1 : 1,
      todayDate: today.value,
      focusStreak: nextFocusStreak,
    };

    const nextMode = nextFocusStreak % interval === 0 ? MODE_LONG_BREAK : MODE_SHORT_BREAK;
    switchToNextMode(nextMode);
    playNotification({
      title: sanitizeReminder(settings.value.focusEndTitle, '专注时间到'),
      body: sanitizeReminder(
        settings.value.focusEndBody,
        nextMode === MODE_LONG_BREAK ? '这一轮完成了，进入长休息。' : '这一轮完成了，休息一下吧。'
      ),
    });
  } else {
    switchToNextMode(MODE_FOCUS);
    playNotification({
      title: sanitizeReminder(settings.value.breakEndTitle, '休息结束'),
      body: sanitizeReminder(settings.value.breakEndBody, '开始下一轮专注吧。'),
    });
  }
});

watch(
  settings,
  (value) => {
    value.focusMinutes = normalizePositiveInteger(value.focusMinutes, 25, 1, 180);
    value.shortBreakMinutes = normalizePositiveInteger(value.shortBreakMinutes, 5, 1, 60);
    value.longBreakMinutes = normalizePositiveInteger(value.longBreakMinutes, 20, 1, 90);
    value.longBreakInterval = normalizePositiveInteger(value.longBreakInterval, 4, 2, 12);
    value.autoCycle = Boolean(value.autoCycle);
    value.focusEndTitle = sanitizeReminder(value.focusEndTitle, '专注时间到');
    value.focusEndBody = sanitizeReminder(value.focusEndBody, '休息一下吧，活动活动肩颈。');
    value.breakEndTitle = sanitizeReminder(value.breakEndTitle, '休息结束');
    value.breakEndBody = sanitizeReminder(value.breakEndBody, '开始下一轮专注吧。');

    if (!isRunning.value) {
      secondsLeft.value = totalSecondsForMode(currentMode.value);
    }
  },
  { deep: true }
);

watch(
  currentMode,
  () => {
    if (!isRunning.value) {
      secondsLeft.value = totalSecondsForMode(currentMode.value);
    }
  }
);

watch(
  today,
  (value) => {
    if (stats.value.todayDate !== value && stats.value.todaySessions !== 0) {
      pomodoroState.value = {
        ...stats.value,
        todayDate: value,
        todaySessions: 0,
      };
    }
  }
);

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
  currentMode.value = MODE_FOCUS;
  secondsLeft.value = totalSecondsForMode(MODE_FOCUS);
}

function switchToNextMode(nextMode) {
  const shouldAutoCycle = settings.value.autoCycle;

  clearTimer();
  isRunning.value = false;
  currentMode.value = nextMode;
  secondsLeft.value = totalSecondsForMode(nextMode);

  if (shouldAutoCycle) {
    isRunning.value = true;
    startTimer();
  }
}

function playNotification({ title, body }) {
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
      new Notification(title, {
        body,
      });
    }
  } catch {
    // Ignore notification failures in unsupported environments.
  }
}

function sanitizeReminder(value, fallback) {
  const nextValue = String(value ?? '').trim();
  return nextValue || fallback;
}

function startTimer() {
  clearTimer();
  timerId = window.setInterval(() => {
    secondsLeft.value -= 1;
  }, 1000);
}

function normalizePositiveInteger(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function getDurationMinutes(mode) {
  if (mode === MODE_LONG_BREAK) {
    return normalizePositiveInteger(settings.value.longBreakMinutes, 20, 1, 90);
  }

  if (mode === MODE_SHORT_BREAK) {
    return normalizePositiveInteger(settings.value.shortBreakMinutes, 5, 1, 60);
  }

  return normalizePositiveInteger(settings.value.focusMinutes, 25, 1, 180);
}

function totalSecondsForMode(mode) {
  return getDurationMinutes(mode) * 60;
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
  flex-wrap: wrap;
}

.timer-advanced {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  text-align: left;
}

.timer-advanced__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.timer-reminders {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.timer-reminders__item {
  min-width: 0;
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

@media (max-width: 768px) {
  .timer-advanced__header {
    flex-direction: column;
  }

  .timer-reminders {
    grid-template-columns: 1fr;
  }
}
</style>
