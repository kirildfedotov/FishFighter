/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music, Sparkles, Edit2, Check, Settings, X } from 'lucide-react';
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
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showSettings) return;
    const handleOutside = (e: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettings(false);
    };
    window.addEventListener('pointerdown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [showSettings]);

  const handleNameSave = () => {
    if (tempName.trim()) {
      onUpdateName(tempName.trim().slice(0, 14));
      retroAudio.playBlip(750, 0.08);
    }
    setIsEditingName(false);
  };

  const getBarGradient = (val: number) => {
    if (val > 60) return 'from-emerald-400 to-teal-400';
    if (val > 30) return 'from-amber-400 to-yellow-300';
    return 'from-rose-500 to-red-400';
  };

  return (
    <header className="relative z-20 w-full pointer-events-none px-2.5 pt-2.5 sm:px-5 sm:pt-4 select-none">
      <div className="max-w-7xl mx-auto glass-panel pointer-events-auto px-3 py-2 sm:px-5 sm:py-2.5 relative">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Fish Identity & Level */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-cyan-500/25 via-blue-600/20 to-indigo-700/35 border border-cyan-300/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 36 28" className="w-6 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" aria-hidden="true">
                <defs>
                  <linearGradient id="hdrBettaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#67e8f9" />
                    <stop offset="55%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
                <path
                  d="M15 14 C10 5, 3 2, 3 8 C6 10, 3 12, 2 14 C3 16, 6 18, 3 20 C3 26, 10 23, 15 14 Z"
                  fill="url(#hdrBettaGrad)"
                  stroke="#bae6fd"
                  strokeWidth="0.9"
                />
                <path d="M17 10 C16 4, 23 3, 25 8 C25 10, 21 11, 18 11 Z" fill="url(#hdrBettaGrad)" />
                <path d="M16 18 C14 24, 23 26, 26 21 C26 18, 21 18, 18 18 Z" fill="url(#hdrBettaGrad)" />
                <path
                  d="M14 14 C16 10, 24 9, 30 12 C33 13, 34 14, 33 15.5 C31 17.5, 26 19, 20 18.5 C16.5 18, 14.5 16, 14 14 Z"
                  fill="#60a5fa"
                  stroke="#e0f2fe"
                  strokeWidth="0.9"
                />
                <circle cx="29.5" cy="13.5" r="1.3" fill="#0f172a" />
                <circle cx="29.9" cy="13.1" r="0.45" fill="#ffffff" />
              </svg>
              {stats.isVip && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-[9px] bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded-md border border-amber-100/60 shadow"
                  title="VIP статус"
                >
                  VIP
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      maxLength={14}
                      className="bg-slate-900 border border-cyan-400/50 text-white px-2 py-0.5 text-sm font-semibold rounded-lg outline-none w-28 sm:w-36"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameSave();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleNameSave}
                      className="ui-btn p-1.5 bg-emerald-500 hover:bg-emerald-400 border-emerald-300/40 text-slate-950 rounded-lg"
                      aria-label="Сохранить имя"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 group cursor-pointer text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
                    onClick={() => {
                      setTempName(stats.name);
                      setIsEditingName(true);
                    }}
                  >
                    <span className="font-display font-bold text-sm sm:text-base text-white tracking-tight truncate">
                      {stats.name}
                    </span>
                    <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-55 group-hover:opacity-100 transition" />
                  </button>
                )}
              </div>

              {/* Level · EXP · Age */}
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300">
                <span className="font-semibold text-cyan-300 tabular-nums">Ур. {stats.level}</span>
                <div className="w-16 sm:w-24 h-1.5 bg-slate-900/90 border border-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 progress-sheen transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, (stats.experience / stats.maxExperience) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-slate-400 tabular-nums hidden sm:inline">
                  · {stats.ageDays} дн.
                </span>
              </div>
            </div>
          </div>

          {/* Center (Desktop): Vitality Bars */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-950/65 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] px-4 py-1.5 rounded-xl">
            <div className="flex items-center gap-2" title="Сытость">
              <span className="text-xs text-slate-300 font-medium">Сытость</span>
              <div className="w-16 h-2 bg-slate-900 border border-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getBarGradient(stats.hunger)} progress-sheen transition-all duration-300 rounded-full`}
                  style={{ width: `${stats.hunger}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-100 w-8 text-right">
                {stats.hunger}%
              </span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <div className="flex items-center gap-2" title="Чистота воды">
              <span className="text-xs text-slate-300 font-medium">Чистота</span>
              <div className="w-16 h-2 bg-slate-900 border border-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getBarGradient(stats.cleanliness)} progress-sheen transition-all duration-300 rounded-full`}
                  style={{ width: `${stats.cleanliness}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-100 w-8 text-right">
                {stats.cleanliness}%
              </span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <div className="flex items-center gap-2" title="Настроение">
              <span className="text-xs text-slate-300 font-medium">Радость</span>
              <div className="w-16 h-2 bg-slate-900 border border-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getBarGradient(stats.happiness)} progress-sheen transition-all duration-300 rounded-full`}
                  style={{ width: `${stats.happiness}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-100 w-8 text-right">
                {stats.happiness}%
              </span>
            </div>
          </div>

          {/* Right: Currency & Settings Gear */}
          <div className="flex items-center gap-2" ref={settingsRef}>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/75 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-xs font-mono font-bold">
              <span className="text-amber-300 tabular-nums whitespace-nowrap">🪙 {stats.coins}</span>
              <span className="text-white/15">|</span>
              <span className="text-fuchsia-300 tabular-nums whitespace-nowrap">🦪 {stats.pearls}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                retroAudio.playBlip(640, 0.05);
                setShowSettings((prev) => !prev);
              }}
              className={`ui-btn p-2 rounded-xl transition-all ${
                showSettings
                  ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-200'
                  : 'bg-slate-900/85 border-white/15 text-slate-200 hover:text-white hover:border-white/30'
              }`}
              title="Настройки"
              aria-label="Настройки"
              aria-expanded={showSettings}
            >
              <Settings className={`w-4 h-4 transition-transform duration-300 ${showSettings ? 'rotate-45' : ''}`} />
            </button>

            {/* Settings Popover Panel */}
            {showSettings && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-68 sm:w-72 glass-panel p-3.5 border-white/20 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-cyan-300" />
                    <span className="font-display font-bold text-sm text-white">Настройки</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Закрыть настройки"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Music Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleBgm();
                      retroAudio.playBlip(620, 0.05);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800/90 border border-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgmActive ? 'bg-indigo-500/25 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                        <Music className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Музыка</div>
                        <div className="text-[11px] text-slate-400">Фоновая мелодия</div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${bgmActive ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
                      {bgmActive ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                  </button>

                  {/* Sound Effects Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMute();
                      retroAudio.playBlip(550, 0.05);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800/90 border border-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${!soundMuted ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                        {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Звук</div>
                        <div className="text-[11px] text-slate-400">Эффекты воды и арены</div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${!soundMuted ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
                      {!soundMuted ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                  </button>

                  {/* Screen Filter Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      onToggleCrt();
                      retroAudio.playBlip(700, 0.06);
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-slate-900/85 hover:bg-slate-800/90 border border-white/10 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${crtEnabled ? 'bg-cyan-500/25 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Фильтр</div>
                        <div className="text-[11px] text-slate-400">Атмосферный ретро-эффект</div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${crtEnabled ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
                      {crtEnabled ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compact Mobile Vitality Row */}
        <div className="lg:hidden mt-2 pt-2 border-t border-white/10 grid grid-cols-3 gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">🍱</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getBarGradient(stats.hunger)} transition-all duration-300`}
                style={{ width: `${stats.hunger}%` }}
              />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-200">{stats.hunger}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">🧼</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getBarGradient(stats.cleanliness)} transition-all duration-300`}
                style={{ width: `${stats.cleanliness}%` }}
              />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-200">{stats.cleanliness}%</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">💖</span>
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getBarGradient(stats.happiness)} transition-all duration-300`}
                style={{ width: `${stats.happiness}%` }}
              />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-slate-200">{stats.happiness}%</span>
          </div>
        </div>
      </div>
    </header>
  );
};
