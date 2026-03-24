'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lang } from '@/lib/i18n';
import { getSettings, saveSettings } from '@/lib/storage';

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('ru');

  useEffect(() => {
    const settings = getSettings();
    setLangState(settings.lang);
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    const settings = getSettings();
    saveSettings({ ...settings, lang: newLang });
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === 'ru' ? 'en' : 'ru');
  }, [lang, setLang]);

  return { lang, setLang, toggle };
}
