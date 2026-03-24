'use client';

import React, { useState, useEffect } from 'react';
import { Lang, t } from '@/lib/i18n';
import { AppSettings, getSettings, saveSettings } from '@/lib/storage';
import { playSound, vibrate, speak, getAvailableVoices, soundLabels, SoundType } from '@/lib/notifications';

interface SettingsModalProps {
  lang: Lang;
  isOpen: boolean;
  onClose: () => void;
  onLangChange: (lang: Lang) => void;
}

export default function SettingsModal({ lang, isOpen, onClose, onLangChange }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSettings(getSettings());
      // Load voices (may load async)
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
  const testVoice = () => speak(
    lang === 'ru' ? 'Тест голосового уведомления' : 'Voice notification test',
    lang,
    settings.voiceName || undefined
  );

  const soundTypes: SoundType[] = ['magic', 'bell', 'gong', 'piano', 'harp'];

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

          {/* TTS on/off */}
          <div className="setting-row">
            <div className="setting-info">
              <span className="setting-icon">🗣️</span>
              <span>{t(lang, 'ttsEnabled')}</span>
            </div>
            <div className="setting-controls">
              <button className="test-btn" onClick={testVoice}>
                {lang === 'ru' ? 'Тест' : 'Test'}
              </button>
              <button
                className={`toggle-btn ${settings.ttsEnabled ? 'active' : ''}`}
                onClick={() => update({ ttsEnabled: !settings.ttsEnabled })}
              >
                <span className="toggle-knob" />
              </button>
            </div>
          </div>

          {/* Voice picker */}
          {settings.ttsEnabled && voices.length > 0 && (
            <div className="voice-picker">
              <div className="setting-row">
                <span>{lang === 'ru' ? 'Голос' : 'Voice'}</span>
                <select
                  className="voice-select"
                  value={settings.voiceName}
                  onChange={(e) => {
                    update({ voiceName: e.target.value });
                    speak(
                      lang === 'ru' ? 'Привет! Я ваш голос' : 'Hello! I am your voice',
                      lang,
                      e.target.value || undefined
                    );
                  }}
                >
                  <option value="">{lang === 'ru' ? 'По умолчанию' : 'Default'}</option>
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
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
