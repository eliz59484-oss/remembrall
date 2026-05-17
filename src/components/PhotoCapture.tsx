'use client';

import React, { useState, useRef } from 'react';
import { Lang } from '@/lib/i18n';

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

/** Compress image via canvas: max 1280px, jpeg 0.78 quality → ~300-500KB */
function compressImage(dataUrl: string, maxPx = 1280, quality = 0.78): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // fallback — send as-is
    img.src = dataUrl;
  });
}

export default function PhotoCapture({ lang, isOpen, onClose, onTasksFound }: PhotoCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      setCompressing(true);
      setError('');
      try {
        const raw = reader.result as string;
        const compressed = await compressImage(raw);
        const kb = Math.round(compressed.length * 0.75 / 1024);
        console.log(`[photo] Compressed to ~${kb}KB`);
        setPreview(compressed);
      } catch {
        setPreview(reader.result as string);
      }
      setCompressing(false);
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
    const kb = Math.round(preview.length * 0.75 / 1024);
    console.log(`[photo] Sending ~${kb}KB to API`);

    try {
      const res = await fetch('/api/parse-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview, lang }),
      });

      const data = await res.json();
      console.log('Photo API response:', JSON.stringify(data).substring(0, 500));

      if (!res.ok) {
        setError(data.error || 'Error');
        setLoading(false);
        return;
      }

      if (data.tasks && data.tasks.length > 0) {
        console.log(`Adding ${data.tasks.length} tasks from photo`);
        onTasksFound(data.tasks);
        setPreview(null);
        onClose();
      } else {
        console.log('No tasks in response:', data);
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

        {compressing ? (
          <div className="photo-upload-zone" style={{ padding: '40px 20px' }}>
            <div className="photo-upload-icon">⏳</div>
            <p className="photo-upload-text">
              {lang === 'ru' ? 'Сжимаю фото...' : 'Compressing...'}
            </p>
          </div>
        ) : !preview ? (
        <div className="photo-upload-zone">
            {/* Hidden inputs */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputChange}
              className="photo-input-hidden"
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="photo-input-hidden"
            />

            <div className="photo-upload-icon">📸</div>
            <p className="photo-upload-text">
              {lang === 'ru'
                ? 'Сфотографируй заметки или выбери из галереи'
                : 'Take a photo of your notes or choose from gallery'}
            </p>
            <p className="photo-upload-hint">
              {lang === 'ru'
                ? 'ИИ распознает текст и создаст задачи'
                : 'AI will recognize text and create tasks'}
            </p>

            {/* Two buttons: camera + gallery */}
            <div className="photo-source-btns">
              <button
                className="photo-source-btn"
                onClick={() => cameraRef.current?.click()}
              >
                📷 {lang === 'ru' ? 'Камера' : 'Camera'}
              </button>
              <button
                className="photo-source-btn photo-source-gallery"
                onClick={() => galleryRef.current?.click()}
              >
                🖼️ {lang === 'ru' ? 'Галерея' : 'Gallery'}
              </button>
            </div>
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
