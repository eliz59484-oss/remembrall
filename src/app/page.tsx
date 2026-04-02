'use client';

import { useState } from 'react';
import styles from './page.module.css';
import Orb from '@/components/Orb';
import TaskCard from '@/components/TaskCard';

export default function Home() {
  const [orbState, setOrbState] = useState<'idle' | 'listening' | 'processing'>('idle');

  const handleOrbClick = () => {
    // Toggle state for demonstration purposes
    setOrbState(prev => prev === 'idle' ? 'listening' : 'idle');
  };

  return (
    <main className={styles.main}>
      {/* Subtle stardust overlay */}
      <div className={styles.stardust}></div>

      <header className={styles.header}>
        <h1 className={styles.title}>Remembrall</h1>
      </header>

      <section className={styles.orbSection}>
        <Orb state={orbState} onClick={handleOrbClick} />
      </section>

      <section className={styles.listSection}>
        <h2 className={styles.sectionTitle}>Сегодня</h2>
        
        <TaskCard 
          title="Съешь лягушку: Отправить резюме" 
          category="Карьера" 
          isUrgent={true} 
          time="Осталось 2ч" 
        />
        <TaskCard 
          title="Написать план на неделю" 
          category="Продуктивность" 
          time="14:00" 
        />
        <TaskCard 
          title="Записаться к стоматологу" 
          category="Здоровье" 
          time="Вечером" 
        />
      </section>
    </main>
  );
}
