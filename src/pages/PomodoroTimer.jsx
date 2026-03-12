import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Typography, Space, Select, Progress, Tag, Row, Col, Statistic } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { usePersistentState } from '../store/useStore';

const { Title, Text } = Typography;

const PRESETS = [
  { label: '25 分钟（标准）', value: 25 },
  { label: '15 分钟（短）', value: 15 },
  { label: '45 分钟（长）', value: 45 },
  { label: '60 分钟', value: 60 },
];

const BREAK_PRESETS = [
  { label: '5 分钟', value: 5 },
  { label: '10 分钟', value: 10 },
  { label: '15 分钟', value: 15 },
];

export default function PomodoroTimer() {
  const [stats, setStats] = usePersistentState('pomodoro_stats', {
    totalSessions: 0,
    totalMinutes: 0,
    todaySessions: 0,
    todayDate: '',
  });

  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  const totalSeconds = isBreak ? breakMinutes * 60 : workMinutes * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const playNotification = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => { oscillator.stop(); ctx.close(); }, 500);

      if (Notification.permission === 'granted') {
        new Notification(isBreak ? '休息结束!' : '专注时间到!', {
          body: isBreak ? '开始新一轮专注吧' : '休息一下吧',
        });
      }
    } catch {}
  }, [isBreak]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      playNotification();

      if (!isBreak) {
        setStats((prev) => ({
          totalSessions: prev.totalSessions + 1,
          totalMinutes: prev.totalMinutes + workMinutes,
          todaySessions: prev.todayDate === today ? prev.todaySessions + 1 : 1,
          todayDate: today,
        }));
        setIsBreak(true);
        setSecondsLeft(breakMinutes * 60);
      } else {
        setIsBreak(false);
        setSecondsLeft(workMinutes * 60);
      }
    }
  }, [secondsLeft, isRunning]);

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setIsBreak(false);
    setSecondsLeft(workMinutes * 60);
  };

  const handleWorkChange = (val) => {
    setWorkMinutes(val);
    if (!isRunning && !isBreak) setSecondsLeft(val * 60);
  };

  const handleBreakChange = (val) => {
    setBreakMinutes(val);
    if (!isRunning && isBreak) setSecondsLeft(val * 60);
  };

  const todaySessions = stats.todayDate === today ? stats.todaySessions : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ color: 'var(--text-primary)', margin: 0 }}>
          <ClockCircleOutlined style={{ marginRight: 10 }} />
          番茄钟
        </Title>
        <Text style={{ color: 'var(--text-secondary)' }}>保持专注，提高效率</Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={14}>
          <Card
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              textAlign: 'center',
            }}
            styles={{ body: { padding: '40px 32px' } }}
          >
            <Tag
              color={isBreak ? 'green' : 'purple'}
              style={{ fontSize: 14, padding: '4px 16px', marginBottom: 24 }}
            >
              {isBreak ? <><CoffeeOutlined /> 休息时间</> : <><ClockCircleOutlined /> 专注时间</>}
            </Tag>

            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 32 }}>
              <Progress
                type="circle"
                percent={progress}
                size={240}
                strokeColor={isBreak ? '#51cf66' : '#6c5ce7'}
                trailColor="var(--border)"
                format={() => (
                  <span
                    style={{
                      fontSize: 48,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                )}
              />
            </div>

            <div>
              <Space size={16}>
                {!isRunning ? (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlayCircleOutlined />}
                    onClick={handleStart}
                    style={{ width: 120 }}
                  >
                    {secondsLeft === totalSeconds ? '开始' : '继续'}
                  </Button>
                ) : (
                  <Button
                    size="large"
                    icon={<PauseCircleOutlined />}
                    onClick={handlePause}
                    style={{ width: 120 }}
                  >
                    暂停
                  </Button>
                )}
                <Button size="large" icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </div>

            <div style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center' }}>
              <div>
                <Text style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>
                  专注时长
                </Text>
                <Select
                  value={workMinutes}
                  onChange={handleWorkChange}
                  options={PRESETS}
                  style={{ width: 160 }}
                  disabled={isRunning}
                />
              </div>
              <div>
                <Text style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>
                  休息时长
                </Text>
                <Select
                  value={breakMinutes}
                  onChange={handleBreakChange}
                  options={BREAK_PRESETS}
                  style={{ width: 120 }}
                  disabled={isRunning}
                />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={10}>
          <Card
            title={<span style={{ color: 'var(--text-primary)' }}><TrophyOutlined /> 统计</span>}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            <Row gutter={[16, 24]}>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: 'var(--text-muted)' }}>今日完成</Text>}
                  value={todaySessions}
                  suffix="次"
                  valueStyle={{ color: 'var(--accent-light)', fontWeight: 700 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: 'var(--text-muted)' }}>累计完成</Text>}
                  value={stats.totalSessions}
                  suffix="次"
                  valueStyle={{ color: 'var(--success)', fontWeight: 700 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: 'var(--text-muted)' }}>累计专注</Text>}
                  value={stats.totalMinutes}
                  suffix="分钟"
                  valueStyle={{ color: 'var(--warning)', fontWeight: 700 }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text style={{ color: 'var(--text-muted)' }}>累计小时</Text>}
                  value={(stats.totalMinutes / 60).toFixed(1)}
                  suffix="h"
                  valueStyle={{ color: '#74b9ff', fontWeight: 700 }}
                />
              </Col>
            </Row>
          </Card>

          <Card
            title={<span style={{ color: 'var(--text-primary)' }}>💡 专注技巧</span>}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              marginTop: 16,
            }}
          >
            <ul style={{ color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 2 }}>
              <li>专注期间关闭无关通知</li>
              <li>每完成4个番茄钟，休息15-30分钟</li>
              <li>一个番茄钟内不要中断</li>
              <li>提前规划好每个番茄钟的任务</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
