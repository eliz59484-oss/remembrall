'use client';

import React, { useState, useEffect } from 'react';
import { Lang, t } from '@/lib/i18n';
import { AppSettings, getSettings, saveSettings } from '@/lib/storage';
import {
  playSound,
  vibrate,
  speak,
  speakNeural,
  getAvailableVoices,
  soundLabels,
  SoundType,
  neuralVoices,
} from '@/lib/notifications';

interface SettingsModalProps {
  lang: Lang;
  isOpen: boolean;
  onClose: () => void;
  onLangChange: (lang: Lang) => void;
}

export default function SettingsModal({ lang, isOpen, onClose, onLangChange }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [neuralTestLoading, setNeuralTestLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      const loadVoices = () => {
        setVoices(getAvailableVoices(settings.lang));
      };
      loadVoices();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const update = (patch: Partial<AppSettings>) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    saveSettings(updated);
  };

  const testSound = (type: SoundType) => playSound(type);
  const testVibration = () => vibrate();
  const testBrowserVoice = () => speak(
    lang === 'ru' ? 'Тест голосового уведомления' : 'Voice notification test',
    lang,
    settings.voiceName || undefined
  );

  const testNeuralVoice = async (voiceId?: string) => {
    setNeuralTestLoading(true);
    try {
      await speakNeural(
        lang === 'ru'
          ? 'Привет! Я твой магический помощник Remembrall'
          : 'Hello! I am your magical assistant Remembrall',
        lang,
        voiceId || settings.neuralVoice
      );
    } finally {
      setNeuralTestLoading(false);
    }
  };

  const soundTypes: SoundType[] = ['magic', 'bell', 'gong', 'piano', 'harp'];

  // Filter neural voices by current language
  const filteredNeuralVoices = neuralVoices.filter((v) => v.lang === lang);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">⚙️ {t(lang, 'settings')}</h2>

        {/* Language */}
        <div className="settings-group">
          <div className="settings-group-title">{t(lang, 'language')}</div>
          <div className="lang-select">
            <button
              className={`lang-option ${settings.lang === 'ru' ? 'active' : ''}`}
              onClick={() => { update({ lang: 'ru' }); onLangChange('ru'); }}
            >
              🇷🇺 Русский
            </button>
            <button
              className={`lang-option ${settings.lang === 'en' ? 'active' : ''}`}
              onClick={() => { update({ lang: 'en' }); onLangChange('en'); }}
            >
              🇬🇧 English
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="settings-group">
          <div className="settings-group-title">
            {lang === 'ru' ? 'Тема' : 'Theme'}
          </div>
          <div className="lang-select">
            <button
              className={`lang-option ${settings.theme === 'dark' ? 'active' : ''}`}
              onClick={() => {
                update({ theme: 'dark' });
                document.documentElement.setAttribute('data-theme', 'dark');
              }}
            >
              🌙 {lang === 'ru' ? 'Тёмная' : 'Dark'}
            </button>
            <button
              className={`lang-option ${settings.theme === 'light' ? 'active' : ''}`}
              onClick={() => {
                update({ theme: 'light' });
                document.documentElement.setAttribute('data-theme', 'light');
              }}
            >
              ☀️ {lang === 'ru' ? 'Светлая' : 'Light'}
            </button>
          </div>
        </div>

        {/* Notification toggles */}
        <div className="settings-group">
          <div className="settings-group-title">
            {lang === 'ru' ? 'Уведомления' : 'Notifications'}
          </div>

          {/* Sound on/off */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">🔊</span>
              <span>{t(lang, 'sounds')}</span>
            </div>
            <div className="setting-controls">
              <button
                className={`toggle-btn ${settings.soundEnabled ? 'active' : ''}`}
                onClick={() => update({ soundEnabled: !settings.soundEnabled })}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Sound type picker */}
          {settings.soundEnabled && (
            <div className="sound-picker">
              {soundTypes.map((st) => (
                <button
                  key={st}
                  className={`sound-chip ${settings.soundType === st ? 'active' : ''}`}
                  onClick={() => {
                    update({ soundType: st });
                    testSound(st);
                  }}
                >
                  {soundLabels[st][lang]}
                </button>
              ))}
            </div>
          )}

          {/* Vibration */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">📳</span>
              <span>{t(lang, 'vibration')}</span>
            </div>
            <div className="setting-controls">
              <button className="test-btn" onClick={testVibration}>
                {lang === 'ru' ? 'Тест' : 'Test'}
              </button>
              <button
                className={`toggle-btn ${settings.vibrationEnabled ? 'active' : ''}`}
                onClick={() => update({ vibrationEnabled: !settings.vibrationEnabled })}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Voice on/off */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">🗣️</span>
              <span>{lang === 'ru' ? 'Голос' : 'Voice'}</span>
            </div>
            <div className="setting-controls">
              <button
                className={`toggle-btn ${settings.ttsEnabled ? 'active' : ''}`}
                onClick={() => update({ ttsEnabled: !settings.ttsEnabled, useNeuralTts: true })}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Voice picker (shown when voice is ON) */}
          {settings.ttsEnabled && (
            <div className="voice-picker neural-voice-picker">
              <div className="neural-voice-grid">
                {filteredNeuralVoices.map((v) => (
                  <button
                    key={v.id}
                    className={`neural-voice-chip ${settings.neuralVoice === v.id ? 'active' : ''}`}
                    onClick={() => {
                      update({ neuralVoice: v.id });
                      testNeuralVoice(v.id);
                    }}
                  >
                    {v.label[lang]}
                  </button>
                ))}
              </div>
              <button
                className="test-btn neural-test-btn"
                onClick={() => testNeuralVoice()}
                disabled={neuralTestLoading}
              >
                {neuralTestLoading
                  ? (lang === 'ru' ? '⏳ Генерация...' : '⏳ Generating...')
                  : (lang === 'ru' ? '▶ Тест голоса' : '▶ Test voice')
                }
              </button>
            </div>
          )}
        </div>

        {/* Appearance & Accessibility */}
        <div className="settings-group">
          <div className="settings-group-title">
            {lang === 'ru' ? '🎨 Внешний вид' : '🎨 Appearance'}
          </div>

          {/* Large UI */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">🔍</span>
              <span>{lang === 'ru' ? 'Крупный интерфейс' : 'Large UI'}</span>
            </div>
            <div className="setting-controls">
              <button
                className={`toggle-btn ${settings.largeUi ? 'active' : ''}`}
                onClick={() => {
                  const next = !settings.largeUi;
                  update({ largeUi: next });
                  document.documentElement.setAttribute('data-size', next ? 'large' : 'normal');
                }}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Orb Mode */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">🔮</span>
              <span>{lang === 'ru' ? 'Режим шара' : 'Orb mode'}</span>
            </div>
            <div className="setting-controls">
              <div className="lang-select" style={{gap: '4px'}}>
                <button
                  className={`lang-option ${settings.orbMode === 'calm' ? 'active' : ''}`}
                  onClick={() => {
                    update({ orbMode: 'calm' });
                    document.documentElement.setAttribute('data-orb', 'calm');
                  }}
                  style={{fontSize: '12px', padding: '4px 10px'}}
                >
                  {lang === 'ru' ? '🌿 Спокойный' : '🌿 Calm'}
                </button>
                <button
                  className={`lang-option ${settings.orbMode === 'vibrant' ? 'active' : ''}`}
                  onClick={() => {
                    update({ orbMode: 'vibrant' });
                    document.documentElement.setAttribute('data-orb', 'vibrant');
                  }}
                  style={{fontSize: '12px', padding: '4px 10px'}}
                >
                  {lang === 'ru' ? '✨ Яркий' : '✨ Vibrant'}
                </button>
              </div>
            </div>
          </div>

          {/* Funny Phrases */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">😂</span>
              <span>{lang === 'ru' ? 'Смешные фразы' : 'Funny phrases'}</span>
            </div>
            <div className="setting-controls">
              <button
                className={`toggle-btn ${settings.funnyPhrases ? 'active' : ''}`}
                onClick={() => update({ funnyPhrases: !settings.funnyPhrases })}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        {/* Pomodoro settings */}
        <div className="settings-group">
          <div className="settings-group-title">🍅 {t(lang, 'pomodoro')}</div>

          <div className="setting-row">
            <span>{t(lang, 'workDuration')}</span>
            <div className="number-input">
              <button onClick={() => update({ workDuration: Math.max(5, settings.workDuration - 5) })}>−</button>
              <span>{settings.workDuration}</span>
              <button onClick={() => update({ workDuration: Math.min(60, settings.workDuration + 5) })}>+</button>
            </div>
          </div>

          <div className="setting-row">
            <span>{t(lang, 'breakDuration')}</span>
            <div className="number-input">
              <button onClick={() => update({ breakDuration: Math.max(1, settings.breakDuration - 1) })}>−</button>
              <span>{settings.breakDuration}</span>
              <button onClick={() => update({ breakDuration: Math.min(30, settings.breakDuration + 1) })}>+</button>
            </div>
          </div>
        </div>

        <button className="btn-save settings-close" onClick={onClose}>
          {lang === 'ru' ? 'Готово' : 'Done'}
        </button>
      </div>
    </div>
  );
}
