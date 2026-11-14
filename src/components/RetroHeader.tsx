/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, Music, Tv, Edit2, Check } from 'lucide-react';
import { FishStats } from '../types';
import { retroAudio } from '../services/retroAudio';

interface RetroHeaderProps {
  stats: FishStats;
  onUpdateName: (newName: string) => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
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

  const getStatColor = (val: number) => {
    if (val > 60) return 'bg-[#22c55e] border-[#15803d]';
    if (val > 30) return 'bg-[#eab308] border-[#a16207]';
    return 'bg-[#ef4444] border-[#991b1b]';
  };

  return (
    <header className="relative z-20 w-full pointer-events-auto bg-[#0f111a]/92 border-b-4 border-[#312e81] shadow-2xl px-2.5 py-2 sm:px-5 sm:py-2.5 select-none">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Fish Identity & Level */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#1e1b4b] border-2 border-[#6366f1] rounded flex items-center justify-center shadow-inner">
              <span className="text-lg sm:text-2xl">🐟</span>
            </div>
            {stats.isVip && (
              <span className="absolute -top-2 -right-2 text-[9px] bg-[#eab308] text-black font-black px-1 rounded-sm border border-black shadow" title="VIP Золотой статус">
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
                    className="bg-[#181824] border border-[#6366f1] text-[#f8fafc] px-1.5 py-0.5 text-xs font-mono rounded outline-none w-24 sm:w-36"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleNameSave}
                    className="p-1 bg-[#22c55e] hover:bg-[#16a34a] text-black rounded text-xs transition"
                    aria-label="Сохранить имя"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="flex items-center gap-1.5 group cursor-pointer text-left"
                  onClick={() => {
                    setTempName(stats.name);
                    setIsEditingName(true);
                  }}
                >
                  <span className="font-['Press_Start_2P'] text-[11px] sm:text-sm text-[#facc15] tracking-wide">
                    {stats.name}
                  </span>
                  <Edit2 className="w-3 h-3 text-[#94a3b8] opacity-60 group-hover:opacity-100 transition" />
                </button>
              )}
              <span className="text-[10px] font-['DotGothic16'] text-[#a5b4fc] hidden md:inline">
                ベタゴッチ &apos;96
              </span>
            </div>

            {/* EXP Bar & Age */}
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
              <span className="text-[10px] font-mono text-[#cbd5e1] bg-[#1e1b4b] px-1.5 py-0.2 rounded border border-[#4338ca] tabular-nums">
                УР.{stats.level}
              </span>
              <div className="w-14 sm:w-24 h-2 bg-[#1e1e2f] border border-[#4338ca] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4f46e5] to-[#06b6d4] transition-all duration-300"
                  style={{ width: `${Math.min(100, (stats.experience / stats.maxExperience) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#94a3b8] tabular-nums">
                {stats.ageDays} дн.
              </span>
            </div>
          </div>
        </div>

        {/* Center (Desktop): Vitality Gauges */}
        <div className="hidden lg:flex items-center gap-3 bg-[#131422] border-2 border-[#312e81] px-3 py-1.5 rounded shadow-inner">
          <div className="flex items-center gap-1.5" title="Сытость">
            <span className="text-sm">🍱</span>
            <div className="w-16 h-2.5 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
              <div
                className={`h-full border-r ${getStatColor(stats.hunger)} transition-all duration-300`}
                style={{ width: `${stats.hunger}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0] w-7 text-right">
              {stats.hunger}%
            </span>
          </div>

          <div className="w-px h-4 bg-[#312e81]" />

          <div className="flex items-center gap-1.5" title="Чистота воды">
            <span className="text-sm">🧼</span>
            <div className="w-16 h-2.5 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
              <div
                className={`h-full border-r ${getStatColor(stats.cleanliness)} transition-all duration-300`}
                style={{ width: `${stats.cleanliness}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0] w-7 text-right">
              {stats.cleanliness}%
            </span>
          </div>

          <div className="w-px h-4 bg-[#312e81]" />

          <div className="flex items-center gap-1.5" title="Настроение">
            <span className="text-sm">💖</span>
            <div className="w-16 h-2.5 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
              <div
                className={`h-full border-r ${getStatColor(stats.happiness)} transition-all duration-300`}
                style={{ width: `${stats.happiness}%` }}
              />
            </div>
            <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0] w-7 text-right">
              {stats.happiness}%
            </span>
          </div>
        </div>

        {/* Right: Currency & Unified Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 bg-[#161830] border-2 border-[#b45309] px-2 py-1 rounded-md text-[11px] sm:text-xs font-mono text-[#fde047] shadow-inner">
            <span>🪙</span>
            <span className="tabular-nums font-bold">{stats.coins}</span>
          </div>

          <div className="flex items-center gap-1 bg-[#1e1233] border-2 border-[#9333ea] px-2 py-1 rounded-md text-[11px] sm:text-xs font-mono text-[#f0abfc] shadow-inner">
            <span>🦪</span>
            <span className="tabular-nums font-bold">{stats.pearls}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              onToggleBgm();
              retroAudio.playBlip(620, 0.05);
            }}
            className={`arcade-btn px-2 py-1.5 text-[11px] ${
              bgmActive
                ? 'bg-[#4338ca] border-[#818cf8] text-white'
                : 'bg-[#161830] border-[#312e81] text-[#94a3b8] hover:text-white hover:border-[#6366f1]'
            }`}
            title="Фоновая 8-бит музыка"
            aria-label="Фоновая музыка"
          >
            <Music className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">МУЗ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleMute();
              retroAudio.playBlip(550, 0.05);
            }}
            className={`arcade-btn px-2 py-1.5 text-[11px] ${
              !soundMuted
                ? 'bg-[#15803d] border-[#4ade80] text-white'
                : 'bg-[#161830] border-[#475569] text-[#94a3b8] hover:text-white'
            }`}
            title="Звуковые эффекты"
            aria-label="Звуковые эффекты"
          >
            {soundMuted ? <VolumeX className="w-3.5 h-3.5 shrink-0" /> : <Volume2 className="w-3.5 h-3.5 shrink-0" />}
            <span className="hidden md:inline">ЗВУК</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleCrt();
              retroAudio.playBlip(700, 0.06);
            }}
            className={`arcade-btn px-2 py-1.5 text-[11px] hidden sm:inline-flex ${
              crtEnabled
                ? 'bg-[#b91c1c] border-[#f87171] text-white'
                : 'bg-[#161830] border-[#312e81] text-[#94a3b8] hover:text-white hover:border-[#6366f1]'
            }`}
            title="Эффект ретро ЭЛТ-экрана"
            aria-label="Режим CRT"
          >
            <Tv className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">CRT</span>
          </button>
        </div>
      </div>

      {/* Compact Mobile & Shell Vitality Gauges Row */}
      <div className="lg:hidden mt-2 pt-1.5 border-t border-[#312e81]/70 grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🍱</span>
          <div className="flex-1 h-2 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
            <div className={`h-full ${getStatColor(stats.hunger)} transition-all duration-300`} style={{ width: `${stats.hunger}%` }} />
          </div>
          <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0]">{stats.hunger}%</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs">🧼</span>
          <div className="flex-1 h-2 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
            <div className={`h-full ${getStatColor(stats.cleanliness)} transition-all duration-300`} style={{ width: `${stats.cleanliness}%` }} />
          </div>
          <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0]">{stats.cleanliness}%</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs">💖</span>
          <div className="flex-1 h-2 bg-[#1f2037] border border-[#3730a3] rounded-xs overflow-hidden">
            <div className={`h-full ${getStatColor(stats.happiness)} transition-all duration-300`} style={{ width: `${stats.happiness}%` }} />
          </div>
          <span className="text-[10px] font-mono tabular-nums text-[#e2e8f0]">{stats.happiness}%</span>
        </div>
      </div>
    </header>
  );
};
