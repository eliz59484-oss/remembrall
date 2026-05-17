'use client';
import React, { useEffect, useState } from 'react';

export default function MemoryPalace() {
  const [mana, setMana] = useState(0);

  useEffect(() => {
    // Animate mana on load
    const timer = setTimeout(() => setMana(84), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="palace-container">
      {/* Top Section - Mana Level */}
      <div className="mana-section">
        <h2 className="mana-title">Mana Level: High</h2>
        <div className="mana-ring-container">
          <svg className="mana-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" className="mana-ring-bg" />
            <circle 
              cx="60" 
              cy="60" 
              r="50" 
              className="mana-ring-progress" 
              strokeDasharray="314" 
              strokeDashoffset={314 - (314 * mana) / 100}
            />
          </svg>
          <div className="mana-value">
            <span className="mana-number">{mana}%</span>
            <span className="mana-label">Resonance</span>
          </div>
        </div>
        <p className="mana-desc">
          Your cognitive resonance is peaking. Now is the ideal time for complex ritual work and legendary scrolls.
        </p>
      </div>

      {/* Middle Section - Stats */}
      <div className="stats-grid">
        <div className="stat-card violet-glow">
          <div className="stat-icon spark-icon">✨</div>
          <div className="stat-info">
            <h3>Spells Cast</h3>
            <p>12/15 Completed</p>
          </div>
        </div>
        
        <div className="stat-card emerald-glow">
          <div className="stat-icon potion-icon">🧪</div>
          <div className="stat-info">
            <h3>Potions Brewed</h3>
            <p>5/8 Concocted</p>
          </div>
        </div>
        
        <div className="stat-card sapphire-glow">
          <div className="stat-icon scroll-icon">📜</div>
          <div className="stat-info">
            <h3>Scrolls Read</h3>
            <p>2/2 Archived</p>
          </div>
        </div>
      </div>

      {/* Bottom Section - Prophecies */}
      <div className="prophecies-section">
        <h2 className="section-title">Upcoming Prophecies</h2>
        <div className="prophecy-list">
          <div className="prophecy-card legendary">
            <div className="prophecy-badge legend-badge">Legendary</div>
            <h3>Refine the Aetherial Protocol</h3>
            <p>Synchronize the fragmented data nodes across the neural mesh.</p>
            <div className="prophecy-due">Due: Midnight</div>
          </div>
          
          <div className="prophecy-card rare">
            <div className="prophecy-badge rare-badge">Rare</div>
            <h3>Alchemical Inventory</h3>
            <p>Audit the storage vaults for rare catalysts and volatile essences.</p>
            <div className="prophecy-due">Due: Tomorrow</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .palace-container {
          padding: 10px 0 40px;
          animation: fade-in 0.5s ease-out;
        }

        .mana-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 24px;
          padding: 30px 20px;
          text-align: center;
          margin-bottom: 24px;
          box-shadow: inset 0 0 40px rgba(168, 85, 247, 0.1), 0 8px 32px rgba(0, 0, 0, 0.4);
          position: relative;
          overflow: hidden;
        }

        .mana-section::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top, rgba(168, 85, 247, 0.15), transparent 70%);
          pointer-events: none;
        }

        .mana-title {
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin-bottom: 24px;
          text-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
        }

        .mana-ring-container {
          position: relative;
          width: 140px;
          height: 140px;
          margin: 0 auto 20px;
        }

        .mana-ring {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }

        .mana-ring-bg {
          fill: none;
          stroke: rgba(255, 255, 255, 0.05);
          stroke-width: 8;
        }

        .mana-ring-progress {
          fill: none;
          stroke: url(#mana-grad);
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1);
          filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.8));
        }

        .mana-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .mana-number {
          font-size: 32px;
          font-weight: 800;
          color: white;
        }

        .mana-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #a1a1aa;
          letter-spacing: 1px;
        }

        .mana-desc {
          font-size: 14px;
          color: #d4d4d8;
          line-height: 1.5;
          max-width: 300px;
          margin: 0 auto;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 16px 20px;
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateX(4px);
        }

        .stat-icon {
          font-size: 24px;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
          background: rgba(0,0,0,0.3);
        }

        .violet-glow {
          box-shadow: inset 2px 0 0 rgba(168, 85, 247, 0.5);
        }
        .emerald-glow {
          box-shadow: inset 2px 0 0 rgba(16, 185, 129, 0.5);
        }
        .sapphire-glow {
          box-shadow: inset 2px 0 0 rgba(59, 130, 246, 0.5);
        }

        .stat-info h3 {
          font-size: 13px;
          text-transform: uppercase;
          color: #a1a1aa;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .stat-info p {
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: white;
          margin-bottom: 16px;
          padding-left: 4px;
        }

        .prophecy-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .prophecy-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .prophecy-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
        }

        .legendary {
          background: linear-gradient(135deg, rgba(234, 179, 8, 0.05), rgba(255, 255, 255, 0.02));
          border-color: rgba(234, 179, 8, 0.2);
        }
        
        .rare {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(255, 255, 255, 0.02));
          border-color: rgba(59, 130, 246, 0.2);
        }

        .prophecy-badge {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          padding: 6px 12px;
          border-bottom-left-radius: 12px;
          letter-spacing: 1px;
        }

        .legend-badge {
          background: rgba(234, 179, 8, 0.15);
          color: #fde047;
          box-shadow: inset 0 0 10px rgba(234, 179, 8, 0.2);
        }

        .rare-badge {
          background: rgba(59, 130, 246, 0.15);
          color: #93c5fd;
          box-shadow: inset 0 0 10px rgba(59, 130, 246, 0.2);
        }

        .prophecy-card h3 {
          font-size: 16px;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
          padding-right: 60px;
        }

        .prophecy-card p {
          font-size: 13px;
          color: #a1a1aa;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .prophecy-due {
          font-size: 12px;
          font-weight: 500;
          color: #d4d4d8;
          display: inline-flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 8px;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* SVG Definitions for Gradients */}
      <svg width="0" height="0">
        <defs>
          <linearGradient id="mana-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
