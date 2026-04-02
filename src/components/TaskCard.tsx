import React from 'react';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  title: string;
  category?: string;
  isUrgent?: boolean;
  time?: string;
}

export default function TaskCard({ title, category, isUrgent, time }: TaskCardProps) {
  return (
    <div className={`${styles.card} ${isUrgent ? styles.urgent : ''}`}>
      <div className={styles.content}>
        <div className={styles.checkbox}></div>
        <div className={styles.details}>
          <h3 className={styles.title}>{title}</h3>
          {category && <span className={styles.category}>{category}</span>}
        </div>
        {time && <div className={styles.time}>{time}</div>}
      </div>
    </div>
  );
}
