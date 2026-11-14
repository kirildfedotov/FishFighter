/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Shield, Swords, Zap, Flame, Trophy, RotateCcw, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FishColorPalette, FishStats } from '../types';
import { retroAudio } from '../services/retroAudio';

export interface RivalProfile {
  id: string;
  name: string;
  title: string;
  skin: FishColorPalette;
  isVip?: boolean;
  maxHp: number;
  attackPower: number;
  rewardCoins: number;
  rewardPearls: number;
  accentHex: string;
}

export const RIVAL_ROSTER: RivalProfile[] = [
  {
    id: 'ronin',
    name: 'Алый Ронин',
    title: 'Стихия огня',
    skin: 'ruby_dragon',
    maxHp: 110,
    attackPower: 14,
    rewardCoins: 80,
    rewardPearls: 3,
    accentHex: '#ef4444',
  },
  {
    id: 'samurai',
    name: 'Тень Самурая',
    title: 'Стальной панцирь',
    skin: 'black_samurai',
    maxHp: 135,
    attackPower: 17,
    rewardCoins: 120,
    rewardPearls: 5,
    accentHex: '#94a3b8',
  },
  {
    id: 'sakura',
    name: 'Клинок Сакуры',
    title: 'Мастер скорости',
    skin: 'sakura_blossom',
    maxHp: 150,
    attackPower: 19,
    rewardCoins: 160,
    rewardPearls: 7,
    accentHex: '#f472b6',
  },
  {
    id: 'emperor',
    name: 'Золотой Сёгун',
    title: 'Чемпион арены',
    skin: 'golden_imperial',
    isVip: true,
    maxHp: 185,
    attackPower: 22,
    rewardCoins: 240,
    rewardPearls: 12,
    accentHex: '#facc15',
  },
];

interface FighterOverlayProps {
  stats: FishStats;
  rivalIndex: number;
  onSelectRival: (index: number) => void;
  onMove: (
    actor: 'player' | 'opponent',
    kind: 'light' | 'heavy' | 'ultimate' | 'guard_on' | 'guard_off' | 'hit'
  ) => void;
  onMatchEnd: (won: boolean, coins: number, pearls: number, exp: number) => void;
  onExit: () => void;
}

export const FighterOverlay: React.FC<FighterOverlayProps> = ({
  stats,
  rivalIndex,
  onSelectRival,
  onMove,
  onMatchEnd,
  onExit,
}) => {
  const rival = RIVAL_ROSTER[rivalIndex % RIVAL_ROSTER.length];
  const playerMaxHp = 110 + (stats.level - 1) * 12 + (stats.isVip ? 20 : 0);

  const [playerHp, setPlayerHp] = useState(playerMaxHp);
  const [rivalHp, setRivalHp] = useState(rival.maxHp);
  const [playerRage, setPlayerRage] = useState(0);
  const [isGuarding, setIsGuarding] = useState(false);
  const [rivalCharging, setRivalCharging] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string>('Арена PvP готова — начните поединок!');
  const [matchResult, setMatchResult] = useState<'none' | 'win' | 'lose'>('none');

  // Cooldowns in seconds
  const [heavyCd, setHeavyCd] = useState(0);
  const [guardCd, setGuardCd] = useState(0);
  const [actionLock, setActionLock] = useState(false);

  const isGuardingRef = useRef(isGuarding);
  const matchResultRef = useRef(matchResult);
  const playerHpRef = useRef(playerHp);
  const rivalHpRef = useRef(rivalHp);
  const onMoveRef = useRef(onMove);
  const onMatchEndRef = useRef(onMatchEnd);

  isGuardingRef.current = isGuarding;
  matchResultRef.current = matchResult;
  playerHpRef.current = playerHp;
  rivalHpRef.current = rivalHp;
  onMoveRef.current = onMove;
  onMatchEndRef.current = onMatchEnd;

  // Reset fight cleanly when rival changes
  const resetMatch = useCallback(() => {
    setPlayerHp(playerMaxHp);
    setRivalHp(rival.maxHp);
    setPlayerRage(0);
    setIsGuarding(false);
    setRivalCharging(false);
    setHeavyCd(0);
    setGuardCd(0);
    setActionLock(false);
    setMatchResult('none');
    setStatusBanner(`Бой против: ${rival.name}`);
    onMoveRef.current('player', 'guard_off');
  }, [playerMaxHp, rival.maxHp, rival.name]);

  useEffect(() => {
    resetMatch();
  }, [rivalIndex, resetMatch]);

  // Cooldown ticker (100ms precision)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeavyCd((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))));
      setGuardCd((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const finishMatch = useCallback(
    (won: boolean) => {
      if (matchResultRef.current !== 'none') return;
      matchResultRef.current = won ? 'win' : 'lose';
      setMatchResult(won ? 'win' : 'lose');
      setRivalCharging(false);
      setIsGuarding(false);
      onMoveRef.current('player', 'guard_off');

      if (won) {
        retroAudio.playFanfare();
        try {
          confetti({
            particleCount: 85,
            spread: 70,
            origin: { y: 0.55 },
            colors: ['#22d3ee', '#facc15', '#f43f5e', '#ffffff'],
          });
        } catch {}
        const mult = stats.isVip ? 2 : 1;
        onMatchEndRef.current(true, rival.rewardCoins * mult, rival.rewardPearls * mult, 45);
      } else {
        retroAudio.playBlip(190, 0.25);
        onMatchEndRef.current(false, 15, 0, 12);
      }
    },
    [rival.rewardCoins, rival.rewardPearls, stats.isVip]
  );

  // Rival AI loop with readable telegraph window
  useEffect(() => {
    if (matchResult !== 'none') return;

    let telegraphTimer: number | undefined;
    let strikeTimer: number | undefined;

    const scheduleNextAi = () => {
      const delay = 2200 + Math.random() * 1400;
      telegraphTimer = window.setTimeout(() => {
        if (matchResultRef.current !== 'none') return;

        const isHeavy = Math.random() > 0.45;
        setRivalCharging(true);
        setStatusBanner(
          isHeavy
            ? `${rival.name} готовит мощный таран — активируйте ЩИТ!`
            : `${rival.name} идёт в атаку!`
        );
        retroAudio.playBlip(340, 0.06);

        strikeTimer = window.setTimeout(() => {
          if (matchResultRef.current !== 'none') return;
          setRivalCharging(false);

          onMoveRef.current('opponent', isHeavy ? 'heavy' : 'light');

          if (isGuardingRef.current) {
            // Perfect Parry + Counter Damage!
            retroAudio.playBlip(880, 0.08);
            const parryDmg = 10 + stats.level * 2;
            setStatusBanner(`Блок и контратака! -${parryDmg} HP сопернику`);
            onMoveRef.current('opponent', 'hit');

            setRivalHp((prev) => {
              const next = Math.max(0, prev - parryDmg);
              if (next <= 0) {
                window.setTimeout(() => finishMatch(true), 240);
              }
              return next;
            });
            setPlayerRage((r) => Math.min(100, r + 20));
          } else {
            // Player takes hit
            retroAudio.playKnock();
            onMoveRef.current('player', 'hit');
            const rawDmg = isHeavy ? Math.round(rival.attackPower * 1.35) : rival.attackPower;
            setStatusBanner(`${rival.name} наносит удар (-${rawDmg} HP)`);

            setPlayerHp((prev) => {
              const next = Math.max(0, prev - rawDmg);
              if (next <= 0) {
                window.setTimeout(() => finishMatch(false), 240);
              }
              return next;
            });
            setPlayerRage((r) => Math.min(100, r + 15));
          }

          if (matchResultRef.current === 'none') {
            scheduleNextAi();
          }
        }, isHeavy ? 880 : 620);
      }, delay);
    };

    scheduleNextAi();

    return () => {
      if (telegraphTimer) clearTimeout(telegraphTimer);
      if (strikeTimer) clearTimeout(strikeTimer);
    };
  }, [matchResult, rival.attackPower, rival.name, stats.level, finishMatch]);

  const handlePlayerAttack = (kind: 'light' | 'heavy' | 'ultimate') => {
    if (matchResult !== 'none' || actionLock) return;
    if (kind === 'heavy' && heavyCd > 0) return;
    if (kind === 'ultimate' && playerRage < 100) return;

    setActionLock(true);
    window.setTimeout(() => setActionLock(false), 280);

    const levelBonus = (stats.level - 1) * 3 + (stats.isVip ? 5 : 0);
    let dmg = 14 + levelBonus;
    let rageGain = 24;

    if (kind === 'heavy') {
      dmg = 26 + levelBonus;
      rageGain = 32;
      setHeavyCd(3.2);
      setStatusBanner(`Мощный таран! -${dmg} HP`);
      retroAudio.playSplash();
    } else if (kind === 'ultimate') {
      dmg = 44 + levelBonus * 1.4;
      setPlayerRage(0);
      setStatusBanner(`Вихрь Катаны! Сокрушительный урон -${Math.round(dmg)} HP`);
      retroAudio.playFanfare();
    } else {
      setStatusBanner(`Быстрый удар плавником! -${dmg} HP`);
      retroAudio.playBlip(720, 0.05);
    }

    onMove('player', kind);
    window.setTimeout(() => onMove('opponent', 'hit'), 120);

    if (kind !== 'ultimate') {
      setPlayerRage((r) => Math.min(100, r + rageGain));
    }

    setRivalHp((prev) => {
      const next = Math.max(0, prev - Math.round(dmg));
      if (next <= 0) {
        window.setTimeout(() => finishMatch(true), 260);
      }
      return next;
    });
  };

  const handleGuard = () => {
    if (matchResult !== 'none' || guardCd > 0 || isGuarding) return;
    setIsGuarding(true);
    setGuardCd(3.0);
    onMove('player', 'guard_on');
    retroAudio.playBlip(540, 0.06);
    setStatusBanner('Водяной щит активирован!');

    window.setTimeout(() => {
      setIsGuarding(false);
      onMoveRef.current('player', 'guard_off');
    }, 1250);
  };

  const playerPct = Math.max(0, Math.round((playerHp / playerMaxHp) * 100));
  const rivalPct = Math.max(0, Math.round((rivalHp / rival.maxHp) * 100));

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* TOP PVP BATTLE HUD */}
      <div className="w-full max-w-5xl mx-auto space-y-2.5 pointer-events-auto">
        <div className="glass-panel px-3.5 py-2.5 sm:px-5 sm:py-3 flex flex-col gap-2.5">
          {/* Top action row: Back button + Arena Title + Rival Picker */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                retroAudio.playBlip(440, 0.05);
                onExit();
              }}
              className="ui-btn bg-slate-800/90 hover:bg-slate-700 border-white/15 text-slate-100 px-3 py-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>В аквариум</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 tracking-wide">
              <Swords className="w-4 h-4 text-rose-400" />
              <span className="font-display font-bold text-sm sm:text-base">АРЕНА PVP</span>
            </div>

            <button
              type="button"
              onClick={() => {
                retroAudio.playBlip(580, 0.05);
                onSelectRival((rivalIndex + 1) % RIVAL_ROSTER.length);
              }}
              className="ui-btn bg-slate-800/90 hover:bg-slate-700 border-white/15 text-slate-200 px-3 py-1.5 text-xs"
              title="Сменить соперника"
            >
              <span>Соперник</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* VS Health & Rage Bars */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 sm:gap-4">
            {/* Player Fighter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 truncate">
                  {stats.name} <span className="text-slate-400 font-normal">· Ур.{stats.level}</span>
                </span>
                <span className="font-mono tabular-nums font-bold text-white">
                  {playerHp}/{playerMaxHp}
                </span>
              </div>
              <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all duration-200"
                  style={{ width: `${playerPct}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-200"
                    style={{ width: `${playerRage}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-nums text-amber-300">
                  {playerRage}%
                </span>
              </div>
            </div>

            {/* VS Center Divider */}
            <div className="font-display font-extrabold text-sm sm:text-lg text-rose-400 px-1.5">
              VS
            </div>

            {/* Opponent Fighter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums font-bold text-white">
                  {rivalHp}/{rival.maxHp}
                </span>
                <span className="font-bold text-rose-300 truncate text-right">
                  {rival.name}
                </span>
              </div>
              <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-l from-rose-500 to-orange-400 transition-all duration-200 ml-auto"
                  style={{ width: `${rivalPct}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-right truncate">
                {rival.title} · Награда {rival.rewardCoins} 🪙
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Battle Cue Strip */}
        <div className="flex justify-center">
          <div
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              rivalCharging
                ? 'bg-rose-950/95 border-rose-400/60 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.35)]'
                : isGuarding
                ? 'bg-cyan-950/95 border-cyan-400/60 text-cyan-100'
                : 'bg-[#0b1120]/90 border-white/10 text-slate-200'
            }`}
          >
            {statusBanner}
          </div>
        </div>
      </div>

      {/* CENTER MATCH RESULT MODAL (IF FINISHED) */}
      {matchResult !== 'none' && (
        <div className="pointer-events-auto mx-auto my-auto w-full max-w-sm glass-panel p-5 sm:p-6 text-center border-white/20">
          <div
            className={`w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center ${
              matchResult === 'win'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
            }`}
          >
            <Trophy className="w-6 h-6" />
          </div>

          <h3 className="font-display text-xl font-extrabold text-white mb-1">
            {matchResult === 'win' ? 'Победа на арене!' : 'Поражение в бою'}
          </h3>
          <p className="text-xs text-slate-300 mb-4">
            {matchResult === 'win'
              ? `${stats.name} одолел бойца «${rival.name}»`
              : `${rival.name} оказался сильнее — попробуйте вовремя ставить Щит!`}
          </p>

          <div className="bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-3 mb-4 text-xs font-mono flex items-center justify-center gap-4">
            {matchResult === 'win' ? (
              <>
                <span className="text-amber-300 font-bold">
                  +{rival.rewardCoins * (stats.isVip ? 2 : 1)} 🪙
                </span>
                <span className="text-fuchsia-300 font-bold">
                  +{rival.rewardPearls * (stats.isVip ? 2 : 1)} 🦪
                </span>
                <span className="text-cyan-300 font-bold">+45 EXP</span>
              </>
            ) : (
              <>
                <span className="text-amber-300 font-bold">+15 🪙</span>
                <span className="text-cyan-300 font-bold">+12 EXP</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={resetMatch}
              className="ui-btn py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border-white/15 text-white text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Реванш</span>
            </button>

            {matchResult === 'win' ? (
              <button
                type="button"
                onClick={() => onSelectRival((rivalIndex + 1) % RIVAL_ROSTER.length)}
                className="ui-btn py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-cyan-300/40 text-white text-xs"
              >
                <span>Дальше</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onExit}
                className="ui-btn py-2.5 px-3 bg-gradient-to-r from-rose-600 to-rose-500 border-rose-300/40 text-white text-xs"
              >
                <span>В аквариум</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM PVP COMBAT CONTROLS */}
      <div className="w-full max-w-2xl mx-auto pointer-events-auto">
        <div className="glass-panel p-2 sm:p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            disabled={matchResult !== 'none' || actionLock}
            onClick={() => handlePlayerAttack('light')}
            className="ui-btn flex-col py-2.5 px-3 bg-slate-900/90 hover:bg-slate-800 border-cyan-500/40 text-white"
          >
            <div className="flex items-center gap-1.5 text-cyan-300 text-xs sm:text-sm font-bold">
              <Zap className="w-4 h-4" />
              <span>Удар плавником</span>
            </div>
            <span className="text-[11px] font-normal text-slate-400">+24% ярости</span>
          </button>

          <button
            type="button"
            disabled={matchResult !== 'none' || actionLock || heavyCd > 0}
            onClick={() => handlePlayerAttack('heavy')}
            className="ui-btn flex-col py-2.5 px-3 bg-slate-900/90 hover:bg-slate-800 border-orange-500/45 text-white"
          >
            <div className="flex items-center gap-1.5 text-orange-300 text-xs sm:text-sm font-bold">
              <Swords className="w-4 h-4" />
              <span>Таран</span>
            </div>
            <span className="text-[11px] font-mono font-normal text-slate-400">
              {heavyCd > 0 ? `${heavyCd}с` : 'Сильный выпад'}
            </span>
          </button>

          <button
            type="button"
            disabled={matchResult !== 'none' || guardCd > 0 || isGuarding}
            onClick={handleGuard}
            className={`ui-btn flex-col py-2.5 px-3 border ${
              isGuarding
                ? 'bg-cyan-500/25 border-cyan-300 text-white'
                : 'bg-slate-900/90 hover:bg-slate-800 border-sky-400/45 text-white'
            }`}
          >
            <div className="flex items-center gap-1.5 text-sky-300 text-xs sm:text-sm font-bold">
              <Shield className="w-4 h-4" />
              <span>{isGuarding ? 'Щит активен' : 'Щит / Блок'}</span>
            </div>
            <span className="text-[11px] font-mono font-normal text-slate-400">
              {guardCd > 0 ? `${guardCd}с` : 'Контратака'}
            </span>
          </button>

          <button
            type="button"
            disabled={matchResult !== 'none' || actionLock || playerRage < 100}
            onClick={() => handlePlayerAttack('ultimate')}
            className={`ui-btn flex-col py-2.5 px-3 border ${
              playerRage >= 100
                ? 'bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 border-amber-200/60 text-white shadow-[0_0_24px_rgba(244,63,94,0.45)]'
                : 'bg-slate-900/75 border-white/10 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
              <Flame className="w-4 h-4" />
              <span>Вихрь Катаны</span>
            </div>
            <span className="text-[11px] font-mono font-normal">
              {playerRage >= 100 ? 'Готово!' : `${playerRage}/100%`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
