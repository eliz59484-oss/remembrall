import React from 'react';
import styles from './Orb.module.css';

interface OrbProps {
  state?: 'idle' | 'listening' | 'processing';
  onClick?: () => void;
}

export default function Orb({ state = 'idle', onClick }: OrbProps) {
  return (
    <div className={styles.orbWrapper} onClick={onClick}>
      <div className={`${styles.orbContainer} ${styles[state]}`}>
        {/* Deep Inner Shadows & Core */}
        <div className={styles.orbCore}></div>
        
        /* Swirling Smoke / Magic Layers */
        <div className={styles.smokeLayer1}></div>
        <div className={styles.smokeLayer2}></div>
        <div className={styles.smokeLayer3}></div>
        
        {/* Crystal Highlights and Glare */}
        <div className={styles.orbHighlightTop}></div>
        <div className={styles.orbHighlightSide}></div>
        
        {/* Outer Surface Glass */}
        <div className={styles.orbGlass}></div>
      </div>
      
      {/* Outer Glows */}
      <div className={`${styles.orbGlow} ${styles[state]}`}></div>
      
      {/* Platform/Shadow beneath the orb */}
      <div className={styles.orbShadow}></div>
    </div>
  );
}
