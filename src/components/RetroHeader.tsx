/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, Music, Tv, Edit2, Check, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { FishStats } from '../types';
import { retroAudio } from '../services/retroAudio';

interface RetroHeaderProps {
  stats: FishStats;
  onUpdateName: (newName: string) => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  shellMode: boolean;
  onToggleShell: () => void;
  bgmActive: boolean;
  onToggleBgm: () => void;
  soundMuted: boolean;
  onToggleMute: () => void;
}

export const RetroHeader: React.FC<RetroHeaderProps> = ({
  stats,
  onUpdateName,
  crtEnabled,
  onToggleCrt,
  shellMode,
  onToggleShell,
  bgmActive,
  onToggleBgm,
  soundMuted,
  onToggleMute,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(stats.name);

  const handleNameSave = () => {
    if (tempName.trim()) {
      onUpdateName(tempName.trim().slice(0, 14));
      retroAudio.playBlip(750, 0.08);
    }
    setIsEditingName(false);
  };

  // Helper for color coding stat bars
  const getStatColor = (val: number) => {
    if (val > 60) return 'bg-[#22c55e] border-[#15803d]';
    if (val > 30) return 'bg-[#eab308] border-[#a16207]';
    return 'bg-[#ef4444] border-[#991b1b]';
  };

  return (
    <header className="relative z-20 w-full pointer-events-auto bg-[#0f111a]/90 border-b-4 border-[#312e81] shadow-2xl px-3 py-2 sm:px-5 sm:py-3 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Fish Identity & Level */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1e1b4b] border-2 border-[#6366f1] rounded flex items-center justify-center shadow-inner">
              <span className="text-xl sm:text-2xl filter drop-shadow">🐟</span>
            </div>
            {stats.isVip && (
              <span className="absolute -top-2 -right-2 text-xs bg-[#eab308] text-black font-bold px-1 rounded-sm border border-black shadow animate-bounce" title="VIP Золотой статус">
                VIP
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={14}
                    className="bg-[#181824] border border-[#6366f1] text-[#f8fafc] px-1.5 py-0.5 text-xs font-mono rounded outline-none w-28 sm:w-36"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                  />
                  <button
                    onClick={handleNameSave}
                    className="p-1 bg-[#22c55e] hover:bg-[#16a34a] text-black rounded text-xs transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                  <span className="font-['Press_Start_2P'] text-xs sm:text-sm text-[#facc15] tracking-wide">
                    {stats.name}
                  </span>
                  <Edit2 className="w-3 h-3 text-[#94a3b8] opacity-60 group-hover:opacity-100 transition" />
                </div>
              )}
              <span className="text-[10px] font-['DotGothic16'] text-[#a5b4fc] hidden md:inline">
                ベタゴッチ &apos;96
              </span>
            </div>

            {/* EXP Bar & Age */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-[#cbd5e1] bg-[#1e1b4b] px-1.5 py-0.2 rounded border border-[#4338ca]">
                УР.{stats.level}
              </span>
              <div className="w-16 sm:w-24 h-2 bg-[#1e1e2f] border border-[#4338ca] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4f46e5] to-[#06b6d4] transition-all duration-300"
                  style={{ width: `${Math.min(100, (stats.experience / stats.maxExperience) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#94a3b8]">
                {stats.ageDays} дн.
              </span>
            </div>
          </div>
        </div>

        {/* Center: Vitality Gauges */}
        <div className="hidden lg:flex items-center gap-3 bg-[#131422] border-2 border-[#312e81] px-3 py-1.5 rounded shadow-inner">
          {/* Hunger */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm" title="Сытость">🍱</span>
            <div className="w-16 h-2.5 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
              <div
                className={`h-full border-r ${getStatColor(stats.hunger)} transition-all duration-300`}
                style={{ width: `${stats.hunger}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0] w-6 text-right">
              {stats.hunger}%
            </span>
          </div>

          <div className="w-px h-4 bg-[#312e81]" />

          {/* Cleanliness */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm" title="Чистота воды">🧼</span>
            <div className="w-16 h-2.5 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
              <div
                className={`h-full border-r ${getStatColor(stats.cleanliness)} transition-all duration-300`}
                style={{ width: `${stats.cleanliness}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0] w-6 text-right">
              {stats.cleanliness}%
            </span>
          </div>

          <div className="w-px h-4 bg-[#312e81]" />

          {/* Happiness */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm" title="Настроение">💖</span>
            <div className="w-16 h-2.5 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
              <div
                className={`h-full border-r ${getStatColor(stats.happiness)} transition-all duration-300`}
                style={{ width: `${stats.happiness}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0] w-6 text-right">
              {stats.happiness}%
            </span>
          </div>
        </div>

        {/* Right: Currency & Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Coins */}
          <div className="flex items-center gap-1 bg-[#1a1b2e] border-2 border-[#b45309] px-2 py-1 rounded text-xs font-mono text-[#fde047] shadow">
            <span>🪙</span>
            <span className="tabular-nums font-bold">{stats.coins}</span>
          </div>

          {/* Pearls (VIP Currency) */}
          <div className="flex items-center gap-1 bg-[#231535] border-2 border-[#a855f7] px-2 py-1 rounded text-xs font-mono text-[#f0abfc] shadow">
            <span>🦪</span>
            <span className="tabular-nums font-bold">{stats.pearls}</span>
          </div>

          {/* Audio BGM Button */}
          <button
            onClick={() => {
              onToggleBgm();
              retroAudio.playBlip(620, 0.05);
            }}
            className={`p-1.5 sm:p-2 rounded border-2 transition ${
              bgmActive
                ? 'bg-[#4338ca] border-[#818cf8] text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                : 'bg-[#1e1b4b] border-[#312e81] text-[#94a3b8] hover:text-white'
            }`}
            title="Фоновая 8-бит музыка Dendy (BGM)"
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Sound FX Mute Button */}
          <button
            onClick={() => {
              onToggleMute();
              retroAudio.playBlip(550, 0.05);
            }}
            className={`p-1.5 sm:p-2 rounded border-2 transition ${
              !soundMuted
                ? 'bg-[#15803d] border-[#4ade80] text-white'
                : 'bg-[#1e1e2f] border-[#475569] text-[#64748b]'
            }`}
            title="Звуковые эффекты (SFX)"
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Retro CRT Scanlines Toggle */}
          <button
            onClick={() => {
              onToggleCrt();
              retroAudio.playBlip(700, 0.06);
            }}
            className={`p-1.5 sm:p-2 rounded border-2 transition hidden sm:inline-flex ${
              crtEnabled
                ? 'bg-[#b91c1c] border-[#f87171] text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                : 'bg-[#1e1b4b] border-[#312e81] text-[#94a3b8] hover:text-white'
            }`}
            title="Ретро ЭЛТ-монитор и сканлайны (CRT 90s)"
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* Shell / Fullscreen Switcher */}
          <button
            onClick={() => {
              onToggleShell();
              retroAudio.playBlip(800, 0.06);
            }}
            className={`p-1.5 sm:p-2 rounded border-2 transition ${
              shellMode
                ? 'bg-[#0369a1] border-[#38bdf8] text-white shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                : 'bg-[#1e1b4b] border-[#312e81] text-[#94a3b8] hover:text-white'
            }`}
            title={shellMode ? 'Переключить в полный экран' : 'Корпус Тамагочи 1996'}
          >
            {shellMode ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </button>
        </div>

      </div>
    </header>
  );
};
