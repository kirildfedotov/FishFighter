/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, Music, Sparkles, Edit2, Check } from 'lucide-react';
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

  const getBarGradient = (val: number) => {
    if (val > 60) return 'from-emerald-400 to-teal-400';
    if (val > 30) return 'from-amber-400 to-yellow-300';
    return 'from-rose-500 to-red-400';
  };

  return (
    <header className="relative z-20 w-full pointer-events-none px-2.5 pt-2.5 sm:px-5 sm:pt-4 select-none">
      <div className="max-w-7xl mx-auto glass-panel pointer-events-auto px-3 py-2 sm:px-5 sm:py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
          {/* Left: Fish Identity & Level */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-600/30 border border-white/15 flex items-center justify-center shrink-0">
              <span className="text-xl sm:text-2xl">🐟</span>
              {stats.isVip && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-[9px] bg-amber-400 text-slate-950 font-extrabold px-1.5 py-0.2 rounded-md shadow"
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
                    className="flex items-center gap-1.5 group cursor-pointer text-left"
                    onClick={() => {
                      setTempName(stats.name);
                      setIsEditingName(true);
                    }}
                  >
                    <span className="font-display font-bold text-sm sm:text-base text-white tracking-tight truncate">
                      {stats.name}
                    </span>
                    <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 transition" />
                  </button>
                )}
              </div>

              {/* Unboxed Level · EXP · Age */}
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300">
                <span className="font-semibold text-cyan-300 tabular-nums">Ур. {stats.level}</span>
                <div className="w-16 sm:w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(100, (stats.experience / stats.maxExperience) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-slate-400 tabular-nums hidden xs:inline">
                  · {stats.ageDays} дн.
                </span>
              </div>
            </div>
          </div>

          {/* Center (Desktop): Vitality Bars */}
          <div className="hidden lg:flex items-center gap-4 bg-slate-900/60 border border-white/10 px-4 py-1.5 rounded-xl">
            <div className="flex items-center gap-2" title="Сытость">
              <span className="text-xs text-slate-300 font-medium">Сытость</span>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getBarGradient(stats.hunger)} transition-all duration-300 rounded-full`}
                  style={{ width: `${stats.hunger}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-200 w-8 text-right">
                {stats.hunger}%
              </span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <div className="flex items-center gap-2" title="Чистота воды">
              <span className="text-xs text-slate-300 font-medium">Чистота</span>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getBarGradient(stats.cleanliness)} transition-all duration-300 rounded-full`}
                  style={{ width: `${stats.cleanliness}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-200 w-8 text-right">
                {stats.cleanliness}%
              </span>
            </div>

            <div className="w-px h-4 bg-white/10" />

            <div className="flex items-center gap-2" title="Настроение">
              <span className="text-xs text-slate-300 font-medium">Радость</span>
              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getBarGradient(stats.happiness)} transition-all duration-300 rounded-full`}
                  style={{ width: `${stats.happiness}%` }}
                />
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-200 w-8 text-right">
                {stats.happiness}%
              </span>
            </div>
          </div>

          {/* Right: Currency & Audio/Visual Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-3 px-2.5 py-1.5 rounded-xl bg-slate-900/75 border border-white/10 text-xs font-mono font-bold">
              <span className="text-amber-300 tabular-nums">🪙 {stats.coins}</span>
              <span className="text-white/15">|</span>
              <span className="text-fuchsia-300 tabular-nums">🦪 {stats.pearls}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onToggleBgm();
                retroAudio.playBlip(620, 0.05);
              }}
              className={`ui-btn px-2.5 py-1.5 text-xs ${
                bgmActive
                  ? 'bg-indigo-600/90 border-indigo-400/50 text-white'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:border-white/25'
              }`}
              title="Фоновая музыка"
              aria-label="Фоновая музыка"
            >
              <Music className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Музыка</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleMute();
                retroAudio.playBlip(550, 0.05);
              }}
              className={`ui-btn px-2.5 py-1.5 text-xs ${
                !soundMuted
                  ? 'bg-emerald-600/85 border-emerald-400/50 text-white'
                  : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Звуковые эффекты"
              aria-label="Звуковые эффекты"
            >
              {soundMuted ? (
                <VolumeX className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden md:inline">Звук</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleCrt();
                retroAudio.playBlip(700, 0.06);
              }}
              className={`ui-btn px-2.5 py-1.5 text-xs hidden sm:inline-flex ${
                crtEnabled
                  ? 'bg-cyan-600/80 border-cyan-400/50 text-white'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:border-white/25'
              }`}
              title="Атмосферный фильтр экрана"
              aria-label="Атмосферный фильтр"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Фильтр</span>
            </button>
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
