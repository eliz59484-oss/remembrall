'use client';

import React, { useState, useRef } from 'react';
import { Lang, t } from '@/lib/i18n';

interface ParsedTask {
  text: string;
  priority: 'critical' | 'important' | 'normal';
  timeHint: string | null;
}

interface PhotoCaptureProps {
  lang: Lang;
  isOpen: boolean;
  onClose: () => void;
  onTasksFound: (tasks: ParsedTask[]) => void;
}

export default function PhotoCapture({ lang, isOpen, onClose, onTasksFound }: PhotoCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleParse = async () => {
    if (!preview) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/parse-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview, lang }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error');
        setLoading(false);
        return;
      }

      if (data.tasks && data.tasks.length > 0) {
        onTasksFound(data.tasks);
        setPreview(null);
        onClose();
      } else {
        setError(lang === 'ru' ? 'Задачи не найдены на фото' : 'No tasks found in photo');
      }
    } catch {
      setError(lang === 'ru' ? 'Ошибка обработки' : 'Processing error');
    }
    setLoading(false);
  };

  const handleClose = () => {
    setPreview(null);
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content photo-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          📷 {lang === 'ru' ? 'Фото → Задачи' : 'Photo → Tasks'}
        </h2>

        {!preview ? (
          <div className="photo-upload-zone" onClick={() => inputRef.current?.click()}>
            <div className="photo-upload-icon">📸</div>
            <p className="photo-upload-text">
              {lang === 'ru'
                ? 'Сфотографируй свои заметки или загрузи фото'
                : 'Take a photo of your notes or upload'}
            </p>
            <p className="photo-upload-hint">
              {lang === 'ru'
                ? 'ИИ распознает текст и создаст задачи'
                : 'AI will recognize text and create tasks'}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="photo-input-hidden"
            />
          </div>
        ) : (
          <div className="photo-preview-zone">
            <img src={preview} alt="Preview" className="photo-preview-img" />

            {error && <p className="photo-error">{error}</p>}

            <div className="photo-actions">
              <button
                className="btn-cancel"
                onClick={() => { setPreview(null); setError(''); }}
              >
                {lang === 'ru' ? 'Другое фото' : 'Other photo'}
              </button>
              <button
                className="btn-save"
                onClick={handleParse}
                disabled={loading}
              >
                {loading
                  ? (lang === 'ru' ? '🔮 Распознаю...' : '🔮 Processing...')
                  : (lang === 'ru' ? '🔮 Распознать' : '🔮 Recognize')}
              </button>
            </div>
          </div>
        )}

        <div className="modal-buttons">
          <button className="btn-cancel" onClick={handleClose}>
            {lang === 'ru' ? 'Закрыть' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
