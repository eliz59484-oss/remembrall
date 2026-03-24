'use client';

import React, { useState } from 'react';
import { Lang } from '@/lib/i18n';

interface TooltipProps {
  lang: Lang;
  type: 'pomodoro' | 'frog';
  position?: 'top' | 'bottom';
  children: React.ReactNode;
}

const tooltipContent = {
  pomodoro: {
    ru: {
      title: '🍅 Техника Помодоро',
      text: '25 минут работай сфокусированно — как «ловец» в матче по квиддичу! Потом 5 минут отдыха. После 4 циклов — длинный перерыв 15 мин. Изобрёл Франческо Чирилло, а таймер был в форме помидора!',
    },
    en: {
      title: '🍅 Pomodoro Technique',
      text: '25 min focused work — like a Quidditch match! Then 5 min rest. After 4 cycles — 15 min long break. Invented by Francesco Cirillo, whose timer was shaped like a tomato!',
    },
  },
  frog: {
    ru: {
      title: '🐸 Съешь лягушку!',
      text: '«Съешь лягушку первой с утра!» — Марк Твен. Делай самое сложное дело первым! А Рон Уизли вместо лягушки ел слизней... 🐌✨',
    },
    en: {
      title: '🐸 Eat the Frog!',
      text: '"Eat the frog first thing in the morning!" — Mark Twain. Do the hardest task first! And Ron Weasley ate slugs instead of frogs... 🐌✨',
    },
  },
};

export default function Tooltip({ lang, type, position = 'top', children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const content = tooltipContent[type][lang];

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      {children}
      {show && (
        <div
          className={`tooltip-bubble tooltip-${position}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tooltip-title">{content.title}</div>
          <div className="tooltip-text">{content.text}</div>
        </div>
      )}
    </span>
  );
}
