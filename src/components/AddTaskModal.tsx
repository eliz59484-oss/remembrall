'use client';

import React, { useState } from 'react';
import { Lang, t } from '@/lib/i18n';
import { CreateTaskInput } from '@/lib/db';
import Tooltip from '@/components/Tooltip';

interface AddTaskModalProps {
  lang: Lang;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: CreateTaskInput) => void;
}

export default function AddTaskModal({ lang, isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<'critical' | 'important' | 'normal'>('normal');
  const [isFrog, setIsFrog] = useState(false);
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly'>('none');
  const [locationName, setLocationName] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [locationRadius, setLocationRadius] = useState(200);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  if (!isOpen) return null;

  const setQuickTime = (minutesFromNow: number) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setDueDate(d.toISOString().split('T')[0]);
    setDueTime(d.toTimeString().slice(0, 5));
  };

  const setTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setDueDate(d.toISOString().split('T')[0]);
    setDueTime('09:00');
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError(lang === 'ru' ? 'Геолокация не поддерживается' : 'Geolocation not supported');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationLat(pos.coords.latitude);
        setLocationLng(pos.coords.longitude);
        if (!locationName) {
          setLocationName(lang === 'ru' ? 'Текущее место' : 'Current location');
        }
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(lang === 'ru' ? 'Нет доступа к GPS' : 'GPS access denied');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    let due_at: string;
    if (dueDate && dueTime) {
      due_at = new Date(`${dueDate}T${dueTime}`).toISOString();
    } else {
      due_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
    onAdd({
      text: text.trim(),
      due_at,
      priority,
      is_frog: isFrog,
      is_recurring: recurrence !== 'none',
      recurrence_rule: recurrence,
      lang,
      ...(locationLat && locationLng ? {
        location_name: locationName || undefined,
        location_lat: locationLat,
        location_lng: locationLng,
        location_radius: locationRadius,
      } : {}),
    });
    setText('');
    setDueDate('');
    setDueTime('');
    setPriority('normal');
    setIsFrog(false);
    setRecurrence('none');
    setLocationName('');
    setLocationLat(null);
    setLocationLng(null);
    setLocationRadius(200);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{t(lang, 'addTask')}</h2>

        <div className="form-group">
          <input
            type="text"
            className="task-input"
            placeholder={t(lang, 'taskPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t(lang, 'quickAdd')}</label>
          <div className="quick-buttons">
            <button className="quick-btn" onClick={() => setQuickTime(5)}>{t(lang, 'in5min')}</button>
            <button className="quick-btn" onClick={() => setQuickTime(15)}>{t(lang, 'in15min')}</button>
            <button className="quick-btn" onClick={() => setQuickTime(30)}>{t(lang, 'in30min')}</button>
            <button className="quick-btn" onClick={() => setQuickTime(60)}>{t(lang, 'in1hour')}</button>
            <button className="quick-btn" onClick={() => setTomorrow()}>{t(lang, 'tomorrow')}</button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t(lang, 'selectTime')}</label>
          <div className="time-picker-row">
            <input
              type="date"
              className="time-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <input
              type="time"
              className="time-input"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t(lang, 'priority')}</label>
          <div className="priority-buttons">
            <button
              className={`priority-btn ${priority === 'critical' ? 'active' : ''}`}
              onClick={() => setPriority('critical')}
            >
              🔴 {t(lang, 'critical')}
            </button>
            <button
              className={`priority-btn ${priority === 'important' ? 'active' : ''}`}
              onClick={() => setPriority('important')}
            >
              🟡 {t(lang, 'important')}
            </button>
            <button
              className={`priority-btn ${priority === 'normal' ? 'active' : ''}`}
              onClick={() => setPriority('normal')}
            >
              🟢 {t(lang, 'normal')}
            </button>
          </div>
        </div>

        {/* Geo-location section */}
        <div className="form-group">
          <label className="form-label">📍 {t(lang, 'location')}</label>
          <div className="geo-section">
            <input
              type="text"
              className="task-input geo-name-input"
              placeholder={t(lang, 'locationPlaceholder')}
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
            <div className="geo-buttons">
              <button
                className={`quick-btn geo-btn ${locationLat ? 'geo-set' : ''}`}
                onClick={getCurrentLocation}
                disabled={geoLoading}
              >
                {geoLoading ? '⏳' : locationLat ? '✅ ' + t(lang, 'locationSet') : t(lang, 'useCurrentLocation')}
              </button>
              {locationLat && (
                <select
                  className="geo-radius-select"
                  value={locationRadius}
                  onChange={(e) => setLocationRadius(Number(e.target.value))}
                >
                  <option value={100}>100м</option>
                  <option value={200}>200м</option>
                  <option value={500}>500м</option>
                  <option value={1000}>1км</option>
                </select>
              )}
            </div>
            {geoError && <span className="geo-error">{geoError}</span>}
          </div>
        </div>

        <div className="form-group form-row">
          <label className="toggle-label">
            <Tooltip lang={lang} type="frog">
              <span>{t(lang, 'frog')} ℹ️</span>
            </Tooltip>
            <button
              className={`toggle-btn ${isFrog ? 'active' : ''}`}
              onClick={() => setIsFrog(!isFrog)}
            >
              <span className="toggle-knob" />
            </button>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">{t(lang, 'recurring')}</label>
          <div className="recurrence-buttons">
            <button className={`rec-btn ${recurrence === 'none' ? 'active' : ''}`} onClick={() => setRecurrence('none')}>
              {t(lang, 'none')}
            </button>
            <button className={`rec-btn ${recurrence === 'daily' ? 'active' : ''}`} onClick={() => setRecurrence('daily')}>
              {t(lang, 'daily')}
            </button>
            <button className={`rec-btn ${recurrence === 'weekly' ? 'active' : ''}`} onClick={() => setRecurrence('weekly')}>
              {t(lang, 'weekly')}
            </button>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="btn-cancel" onClick={onClose}>{t(lang, 'cancel')}</button>
          <button className="btn-save" onClick={handleSubmit} disabled={!text.trim()}>{t(lang, 'save')}</button>
        </div>
      </div>
    </div>
  );
}
