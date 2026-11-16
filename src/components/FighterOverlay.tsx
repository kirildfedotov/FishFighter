/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Shield,
  Swords,
  Zap,
  Flame,
  Trophy,
  RotateCcw,
  Crown,
  CheckCircle2,
  Users,
  BarChart3,
  Play,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FishColorPalette, FishStats } from '../types';
import { retroAudio } from '../services/retroAudio';

export interface RivalProfile {
  id: string;
  name: string;
  title: string;
  difficulty: string;
  skin: FishColorPalette;
  isVip?: boolean;
  maxHp: number;
  attackPower: number;
  rewardCoins: number;
  baseRating: number;
  baseWins: number;
  baseLosses: number;
  ratingGain: number;
  accentHex: string;
}

export const RIVAL_ROSTER: RivalProfile[] = [
  {
    id: 'ronin',
    name: 'Алый Ронин',
    title: 'Стихия огня',
    difficulty: 'Новичок',
    skin: 'ruby_dragon',
    maxHp: 110,
    attackPower: 14,
    rewardCoins: 100,
    baseRating: 1020,
    baseWins: 6,
    baseLosses: 4,
    ratingGain: 35,
    accentHex: '#ef4444',
  },
  {
    id: 'samurai',
    name: 'Тень Самурая',
    title: 'Стальной панцирь',
    difficulty: 'Боец',
    skin: 'black_samurai',
    maxHp: 135,
    attackPower: 17,
    rewardCoins: 160,
    baseRating: 1140,
    baseWins: 11,
    baseLosses: 4,
    ratingGain: 45,
    accentHex: '#94a3b8',
  },
  {
    id: 'sakura',
    name: 'Клинок Сакуры',
    title: 'Мастер скорости',
    difficulty: 'Ветеран',
    skin: 'sakura_blossom',
    maxHp: 150,
    attackPower: 19,
    rewardCoins: 220,
    baseRating: 1280,
    baseWins: 17,
    baseLosses: 3,
    ratingGain: 55,
    accentHex: '#f472b6',
  },
  {
    id: 'emperor',
    name: 'Золотой Сёгун',
    title: 'Чемпион арены',
    difficulty: 'Легенда',
    skin: 'golden_imperial',
    isVip: true,
    maxHp: 185,
    attackPower: 22,
    rewardCoins: 350,
    baseRating: 1440,
    baseWins: 24,
    baseLosses: 2,
    ratingGain: 75,
    accentHex: '#facc15',
  },
];

type FighterPhase = 'lobby' | 'fighting' | 'result';
type LobbyTab = 'opponents' | 'standings';

interface FloatingCallout {
  id: number;
  text: string;
  side: 'player' | 'opponent';
  tone: 'cyan' | 'orange' | 'gold' | 'rose' | 'parry';
}

interface FighterOverlayProps {
  stats: FishStats;
  rivalIndex: number;
  onSelectRival: (index: number) => void;
  onFightStateChange?: (isFighting: boolean) => void;
  onMove: (
    actor: 'player' | 'opponent',
    kind:
      | 'light'
      | 'heavy'
      | 'ultimate'
      | 'parry'
      | 'windup'
      | 'guard_on'
      | 'guard_off'
      | 'hit'
      | 'crit_hit'
  ) => void;
  onMatchEnd: (
    won: boolean,
    coins: number,
    exp: number,
    rivalId: string,
    ratingDelta: number
  ) => void;
  onExit: () => void;
}

export const FighterOverlay: React.FC<FighterOverlayProps> = ({
  stats,
  rivalIndex,
  onSelectRival,
  onFightStateChange,
  onMove,
  onMatchEnd,
  onExit,
}) => {
  const rival = RIVAL_ROSTER[rivalIndex % RIVAL_ROSTER.length];
  const playerMaxHp = 110 + (stats.level - 1) * 12 + (stats.isVip ? 20 : 0);

  const [phase, setPhase] = useState<FighterPhase>('lobby');
  const [lobbyTab, setLobbyTab] = useState<LobbyTab>('opponents');

  const [playerHp, setPlayerHp] = useState(playerMaxHp);
  const [rivalHp, setRivalHp] = useState(rival.maxHp);
  const [playerRage, setPlayerRage] = useState(0);
  const [isGuarding, setIsGuarding] = useState(false);
  const [rivalCharging, setRivalCharging] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string>('Арена готова — выберите тактику!');
  const [matchResult, setMatchResult] = useState<'none' | 'win' | 'lose'>('none');
  const [lastRatingDelta, setLastRatingDelta] = useState(0);

  // Cooldowns & combo state
  const [heavyCd, setHeavyCd] = useState(0);
  const [guardCd, setGuardCd] = useState(0);
  const [actionLock, setActionLock] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [floatingCallouts, setFloatingCallouts] = useState<FloatingCallout[]>([]);

  const isGuardingRef = useRef(isGuarding);
  const matchResultRef = useRef(matchResult);
  const phaseRef = useRef(phase);
  const onMoveRef = useRef(onMove);
  const onMatchEndRef = useRef(onMatchEnd);
  const onFightStateChangeRef = useRef(onFightStateChange);
  const rivalTelegraphActiveRef = useRef(false);
  const comboTimerRef = useRef<number | undefined>(undefined);
  const guardTimerRef = useRef<number | undefined>(undefined);
  const calloutIdRef = useRef(1);

  isGuardingRef.current = isGuarding;
  matchResultRef.current = matchResult;
  phaseRef.current = phase;
  onMoveRef.current = onMove;
  onMatchEndRef.current = onMatchEnd;
  onFightStateChangeRef.current = onFightStateChange;

  const pushCallout = useCallback(
    (text: string, side: FloatingCallout['side'], tone: FloatingCallout['tone']) => {
      const id = calloutIdRef.current++;
      setFloatingCallouts((prev) => [...prev.slice(-6), { id, text, side, tone }]);
      window.setTimeout(() => {
        setFloatingCallouts((prev) => prev.filter((item) => item.id !== id));
      }, 950);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    };
  }, []);

  const defeatedList = useMemo(() => stats.defeatedRivals ?? [], [stats.defeatedRivals]);
  const playerWins = stats.fighterWins ?? 0;
  const playerLosses = stats.fighterLosses ?? 0;
  const playerRating = stats.fighterRating ?? 1000;

  const standings = useMemo(() => {
    const playerEntry = {
      id: '__player__',
      name: stats.name,
      subtitle: `Ур.${stats.level}${stats.isVip ? ' · VIP' : ''}`,
      wins: playerWins,
      losses: playerLosses,
      rating: playerRating,
      isPlayer: true,
      isDefeated: false,
      accentHex: '#22d3ee',
      rivalIdx: -1,
    };

    const rivalEntries = RIVAL_ROSTER.map((r, idx) => {
      const defeated = defeatedList.includes(r.id);
      return {
        id: r.id,
        name: r.name,
        subtitle: r.title,
        wins: r.baseWins,
        losses: r.baseLosses + (defeated ? 1 : 0),
        rating: defeated ? Math.max(850, r.baseRating - 25) : r.baseRating,
        isPlayer: false,
        isDefeated: defeated,
        accentHex: r.accentHex,
        rivalIdx: idx,
      };
    });

    return [playerEntry, ...rivalEntries].sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.wins - a.wins;
    });
  }, [stats.name, stats.level, stats.isVip, playerWins, playerLosses, playerRating, defeatedList]);

  const playerRank = standings.findIndex((entry) => entry.isPlayer) + 1;

  // Reset match state cleanly
  const prepareMatchState = useCallback(() => {
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    rivalTelegraphActiveRef.current = false;
    setPlayerHp(playerMaxHp);
    setRivalHp(rival.maxHp);
    setPlayerRage(0);
    setIsGuarding(false);
    setRivalCharging(false);
    setHeavyCd(0);
    setGuardCd(0);
    setActionLock(false);
    setComboCount(0);
    setFloatingCallouts([]);
    setMatchResult('none');
    matchResultRef.current = 'none';
    setStatusBanner(`Бой против: ${rival.name} · Копите комбо и парируйте Щитом!`);
    onMoveRef.current('player', 'guard_off');
  }, [playerMaxHp, rival.maxHp, rival.name]);

  const startFight = useCallback(() => {
    retroAudio.playFlare();
    prepareMatchState();
    setPhase('fighting');
    phaseRef.current = 'fighting';
    onFightStateChangeRef.current?.(true);
  }, [prepareMatchState]);

  const backToLobby = useCallback(() => {
    retroAudio.playBlip(440, 0.05);
    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    rivalTelegraphActiveRef.current = false;
    setIsGuarding(false);
    setRivalCharging(false);
    setComboCount(0);
    setFloatingCallouts([]);
    setMatchResult('none');
    matchResultRef.current = 'none';
    setPhase('lobby');
    phaseRef.current = 'lobby';
    onMoveRef.current('player', 'guard_off');
    onFightStateChangeRef.current?.(false);
  }, []);

  // Keep HP bars synced when user switches rival in Lobby
  useEffect(() => {
    if (phaseRef.current === 'lobby') {
      setPlayerHp(playerMaxHp);
      setRivalHp(rival.maxHp);
    }
  }, [rivalIndex, playerMaxHp, rival.maxHp]);

  // Cooldown ticker (active during fighting phase)
  useEffect(() => {
    if (phase !== 'fighting') return;
    const timer = window.setInterval(() => {
      setHeavyCd((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))));
      setGuardCd((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))));
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  const finishMatch = useCallback(
    (won: boolean) => {
      if (matchResultRef.current !== 'none' || phaseRef.current !== 'fighting') return;
      matchResultRef.current = won ? 'win' : 'lose';
      setMatchResult(won ? 'win' : 'lose');
      setPhase('result');
      phaseRef.current = 'result';
      setRivalCharging(false);
      setIsGuarding(false);
      onMoveRef.current('player', 'guard_off');
      onFightStateChangeRef.current?.(false);

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
        setLastRatingDelta(rival.ratingGain);
        onMatchEndRef.current(
          true,
          rival.rewardCoins * mult,
          45,
          rival.id,
          rival.ratingGain
        );
      } else {
        retroAudio.playBlip(190, 0.25);
        setLastRatingDelta(-12);
        onMatchEndRef.current(false, 15, 12, rival.id, -12);
      }
    },
    [rival.id, rival.ratingGain, rival.rewardCoins, stats.isVip]
  );

  // Rival AI loop — ONLY runs during active fighting phase
  useEffect(() => {
    if (phase !== 'fighting' || matchResult !== 'none') return;

    let telegraphTimer: number | undefined;
    let strikeTimer: number | undefined;

    const scheduleNextAi = () => {
      const delay = 1950 + Math.random() * 1350;
      telegraphTimer = window.setTimeout(() => {
        if (matchResultRef.current !== 'none' || phaseRef.current !== 'fighting') return;

        const isHeavy = Math.random() > 0.42;
        rivalTelegraphActiveRef.current = true;
        setRivalCharging(true);
        onMoveRef.current('opponent', 'windup');
        setStatusBanner(
          isHeavy
            ? `${rival.name} заряжает сокрушительный таран — ЩИТ [Space] для парирования!`
            : `${rival.name} замахивается — время для ЩИТА [Space]!`
        );
        retroAudio.playBlip(340, 0.06);

        strikeTimer = window.setTimeout(() => {
          if (matchResultRef.current !== 'none' || phaseRef.current !== 'fighting') return;
          const wasTelegraphed = rivalTelegraphActiveRef.current;
          rivalTelegraphActiveRef.current = false;
          setRivalCharging(false);

          onMoveRef.current('opponent', isHeavy ? 'heavy' : 'light');

          if (isGuardingRef.current) {
            retroAudio.playFlare();
            retroAudio.playBlip(960, 0.08);
            const parryDmg = wasTelegraphed ? 16 + stats.level * 3 : 12 + stats.level * 2;
            setStatusBanner(`ПАРИРОВАНИЕ! Мощная контратака -${parryDmg} HP`);
            onMoveRef.current('player', 'parry');
            window.setTimeout(() => onMoveRef.current('opponent', 'crit_hit'), 90);
            pushCallout(`ПАРИРОВАНИЕ! -${parryDmg}`, 'opponent', 'parry');

            setGuardCd((cd) => Math.min(cd, 1.1));
            setRivalHp((prev) => {
              const next = Math.max(0, prev - parryDmg);
              if (next <= 0) {
                window.setTimeout(() => finishMatch(true), 240);
              }
              return next;
            });
            setPlayerRage((r) => Math.min(100, r + 35));
          } else {
            retroAudio.playKnock();
            onMoveRef.current('player', isHeavy ? 'crit_hit' : 'hit');
            const rawDmg = isHeavy ? Math.round(rival.attackPower * 1.38) : rival.attackPower;
            setComboCount(0);
            if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
            setStatusBanner(`${rival.name} наносит удар (-${rawDmg} HP)`);
            pushCallout(`-${rawDmg}`, 'player', 'rose');

            setPlayerHp((prev) => {
              const next = Math.max(0, prev - rawDmg);
              if (next <= 0) {
                window.setTimeout(() => finishMatch(false), 240);
              }
              return next;
            });
            setPlayerRage((r) => Math.min(100, r + 16));
          }

          if (matchResultRef.current === 'none' && phaseRef.current === 'fighting') {
            scheduleNextAi();
          }
        }, isHeavy ? 920 : 660);
      }, delay);
    };

    scheduleNextAi();

    return () => {
      rivalTelegraphActiveRef.current = false;
      if (telegraphTimer) clearTimeout(telegraphTimer);
      if (strikeTimer) clearTimeout(strikeTimer);
    };
  }, [phase, matchResult, rival.attackPower, rival.name, stats.level, finishMatch, pushCallout]);

  const handlePlayerAttack = useCallback(
    (kind: 'light' | 'heavy' | 'ultimate') => {
      if (phase !== 'fighting' || matchResult !== 'none' || actionLock) return;
      if (kind === 'heavy' && heavyCd > 0) return;
      if (kind === 'ultimate' && playerRage < 100) return;

      setActionLock(true);
      window.setTimeout(() => setActionLock(false), 260);

      const levelBonus = (stats.level - 1) * 3 + (stats.isVip ? 5 : 0);
      let dmg = 14 + levelBonus;
      let rageGain = 22;
      let isCrit = false;

      if (kind === 'heavy') {
        const stacks = comboCount;
        const comboMult = 1 + stacks * 0.15;
        dmg = Math.round((26 + levelBonus) * comboMult);
        rageGain = 30;
        isCrit = stacks >= 2;
        if (stacks > 0) {
          setComboCount(0);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        }
        setHeavyCd(3.2);
        if (isCrit) {
          setStatusBanner(`КОМБО-ТАРАН x${stacks}! Критический удар -${dmg} HP`);
          pushCallout(`КОМБО КРИТ! -${dmg}`, 'opponent', 'gold');
          retroAudio.playFlare();
          retroAudio.playSplash();
        } else if (stacks === 1) {
          setStatusBanner(`Усиленный таран (+15%)! -${dmg} HP`);
          pushCallout(`ТАРАН -${dmg}`, 'opponent', 'orange');
          retroAudio.playSplash();
        } else {
          setStatusBanner(`Мощный таран! -${dmg} HP`);
          pushCallout(`-${dmg}`, 'opponent', 'orange');
          retroAudio.playSplash();
        }
      } else if (kind === 'ultimate') {
        const stacks = comboCount;
        dmg = Math.round((46 + levelBonus * 1.45) * (1 + stacks * 0.1));
        isCrit = true;
        if (stacks > 0) {
          setComboCount(0);
          if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        }
        setPlayerRage(0);
        setStatusBanner(`ВИХРЬ КАТАНЫ! Сокрушительный урон -${dmg} HP`);
        pushCallout(`УЛЬТА! -${dmg}`, 'opponent', 'gold');
        retroAudio.playFanfare();
      } else {
        const nextCombo = Math.min(4, comboCount + 1);
        setComboCount(nextCombo);
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = window.setTimeout(() => {
          setComboCount(0);
        }, 3200);
        setStatusBanner(
          nextCombo >= 2
            ? `Серия x${nextCombo}! Таран усилен на +${nextCombo * 15}%`
            : `Быстрый выпад плавником! -${dmg} HP`
        );
        pushCallout(nextCombo >= 2 ? `-${dmg} (x${nextCombo})` : `-${dmg}`, 'opponent', 'cyan');
        retroAudio.playBlip(720 + nextCombo * 45, 0.05);
      }

      onMove('player', kind);
      window.setTimeout(() => onMove('opponent', isCrit ? 'crit_hit' : 'hit'), 115);

      if (kind !== 'ultimate') {
        setPlayerRage((r) => Math.min(100, r + rageGain));
      }

      setRivalHp((prev) => {
        const next = Math.max(0, prev - dmg);
        if (next <= 0) {
          window.setTimeout(() => finishMatch(true), 260);
        }
        return next;
      });
    },
    [
      phase,
      matchResult,
      actionLock,
      heavyCd,
      playerRage,
      stats.level,
      stats.isVip,
      comboCount,
      pushCallout,
      onMove,
      finishMatch,
    ]
  );

  const handleGuard = useCallback(() => {
    if (phase !== 'fighting' || matchResult !== 'none' || guardCd > 0 || isGuarding) return;
    setIsGuarding(true);
    setGuardCd(2.8);
    onMove('player', 'guard_on');
    retroAudio.playBlip(560, 0.06);
    setStatusBanner(
      rivalTelegraphActiveRef.current
        ? 'Щит поднят вовремя — готовьтесь к парированию!'
        : 'Водяной щит активирован!'
    );

    if (guardTimerRef.current) clearTimeout(guardTimerRef.current);
    guardTimerRef.current = window.setTimeout(() => {
      setIsGuarding(false);
      onMoveRef.current('player', 'guard_off');
    }, 1300);
  }, [phase, matchResult, guardCd, isGuarding, onMove]);

  // Responsive layout-independent keyboard hotkeys during active PvP combat
  useEffect(() => {
    if (phase !== 'fighting' || matchResult !== 'none') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      switch (e.code) {
        case 'KeyQ':
        case 'Digit1':
        case 'KeyA':
          e.preventDefault();
          handlePlayerAttack('light');
          break;
        case 'KeyW':
        case 'Digit2':
        case 'KeyS':
          e.preventDefault();
          handlePlayerAttack('heavy');
          break;
        case 'KeyE':
        case 'Digit3':
        case 'Space':
          e.preventDefault();
          handleGuard();
          break;
        case 'KeyR':
        case 'Digit4':
        case 'KeyF':
          e.preventDefault();
          handlePlayerAttack('ultimate');
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, matchResult, handlePlayerAttack, handleGuard]);

  const playerPct = Math.max(0, Math.round((playerHp / playerMaxHp) * 100));
  const rivalPct = Math.max(0, Math.round((rivalHp / rival.maxHp) * 100));

  // ===================== PHASE 1: PRE-FIGHT LOBBY (OPPONENTS + TOURNAMENT TABLE) =====================
  if (phase === 'lobby') {
    return (
      <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none">
        {/* TOP LOBBY HEADER */}
        <div className="w-full max-w-5xl mx-auto pointer-events-auto">
          <div className="glass-panel px-3.5 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 border-rose-500/25">
            <button
              type="button"
              onClick={() => {
                retroAudio.playBlip(440, 0.05);
                onExit();
              }}
              className="ui-btn glass-btn px-3 py-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>В аквариум</span>
            </button>

            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-400" />
              <span className="font-display font-bold text-sm sm:text-base text-white tracking-wide">
                АРЕНА FISHFIGHTER
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-300/80 font-mono">
                · Место #{playerRank} ({playerRating})
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/[0.06] backdrop-blur-md p-1 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => {
                  retroAudio.playBlip(540, 0.04);
                  setLobbyTab('opponents');
                }}
                className={`ui-btn px-2.5 py-1 text-xs rounded-lg ${
                  lobbyTab === 'opponents'
                    ? 'glass-btn-rose'
                    : 'bg-transparent border-transparent shadow-none text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Соперники</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  retroAudio.playBlip(580, 0.04);
                  setLobbyTab('standings');
                }}
                className={`ui-btn px-2.5 py-1 text-xs rounded-lg ${
                  lobbyTab === 'standings'
                    ? 'glass-btn-amber'
                    : 'bg-transparent border-transparent shadow-none text-slate-300 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Турнир</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM LOBBY DOCK — KEEPS CENTER VIEWPORT OPEN TO SHOWCASE 3D BETTA MATCHUP */}
        <div className="w-full max-w-5xl mx-auto pointer-events-auto">
          <div className="glass-panel p-3 sm:p-4 border-rose-500/30 space-y-3">
            {lobbyTab === 'opponents' ? (
              <>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-200">
                    Выберите противника для поединка
                  </span>
                  <span className="text-slate-400 font-mono">
                    Побеждено: {defeatedList.length}/{RIVAL_ROSTER.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                  {RIVAL_ROSTER.map((item, idx) => {
                    const isSelected = idx === rivalIndex % RIVAL_ROSTER.length;
                    const isDefeated = defeatedList.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          retroAudio.playBlip(620, 0.05);
                          onSelectRival(idx);
                        }}
                        className={`text-left p-2.5 sm:p-3 rounded-xl border backdrop-blur-md transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 ${
                          isSelected
                            ? 'bg-gradient-to-b from-rose-500/28 to-slate-900/55 border-rose-300/75 shadow-[0_0_24px_rgba(244,63,94,0.28),inset_0_1px_0_rgba(253,164,175,0.35)]'
                            : 'bg-white/[0.06] border-white/15 hover:border-white/30 hover:bg-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/15"
                              style={{ backgroundColor: item.accentHex }}
                            />
                            <span className="font-bold text-xs sm:text-sm text-white truncate">
                              {item.name}
                            </span>
                          </div>
                          {isDefeated && (
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-emerald-400 shrink-0"
                              aria-label="Побеждён"
                            />
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 truncate mb-2">
                          {item.title} · {item.difficulty}
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-300 pt-1.5 border-t border-white/10">
                          <span>HP {item.maxHp}</span>
                          <span>АТК {item.attackPower}</span>
                          <span className="text-amber-300 font-bold">+{item.rewardCoins} 🪙</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Турнирная таблица арены</span>
                  </div>
                  <div className="text-slate-300 font-mono text-[11px]">
                    Ваш счёт: <span className="text-emerald-300 font-bold">{playerWins}В</span> /{' '}
                    <span className="text-rose-300 font-bold">{playerLosses}П</span> · Побеждено боссов:{' '}
                    {defeatedList.length}/{RIVAL_ROSTER.length}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/80">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] text-slate-400">
                        <th className="py-2 px-3 font-medium">#</th>
                        <th className="py-2 px-3 font-medium">Боец</th>
                        <th className="py-2 px-3 font-medium text-center">В / П</th>
                        <th className="py-2 px-3 font-medium text-right">Рейтинг</th>
                        <th className="py-2 px-3 font-medium text-right">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, idx) => (
                        <tr
                          key={row.id}
                          onClick={() => {
                            if (!row.isPlayer && row.rivalIdx >= 0) {
                              retroAudio.playBlip(580, 0.04);
                              onSelectRival(row.rivalIdx);
                            }
                          }}
                          className={`border-b border-white/5 last:border-b-0 transition-colors ${
                            row.isPlayer
                              ? 'bg-cyan-500/15 text-white'
                              : row.rivalIdx === rivalIndex % RIVAL_ROSTER.length
                              ? 'bg-rose-500/10 text-slate-100 cursor-pointer'
                              : 'text-slate-300 hover:bg-white/5 cursor-pointer'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono font-bold">
                            {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-300">
                                <Crown className="w-3.5 h-3.5" />1
                              </span>
                            ) : (
                              `#${idx + 1}`
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: row.accentHex }}
                              />
                              <div>
                                <div className="font-bold leading-tight">{row.name}</div>
                                <div className="text-[10px] text-slate-400">{row.subtitle}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">
                            {row.wins} / {row.losses}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-amber-300">
                            {row.rating}
                          </td>
                          <td className="py-2 px-3 text-right text-[11px]">
                            {row.isPlayer ? (
                              <span className="text-cyan-300 font-semibold">Ваш боец</span>
                            ) : row.isDefeated ? (
                              <span className="text-emerald-400 font-semibold">Побеждён ✓</span>
                            ) : (
                              <span className="text-slate-400">Готов к бою</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MATCHUP SUMMARY + EXPLICIT BACK / START BATTLE ACTIONS */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="text-xs text-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  <span className="text-cyan-300 font-bold">{stats.name}</span>{' '}
                  <span className="text-slate-400">(HP {playerMaxHp})</span>
                </span>
                <span className="text-rose-400 font-display font-bold">VS</span>
                <span>
                  <span className="text-rose-300 font-bold">{rival.name}</span>{' '}
                  <span className="text-slate-400">
                    (HP {rival.maxHp} · Награда {rival.rewardCoins * (stats.isVip ? 2 : 1)} 🪙)
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.playBlip(440, 0.05);
                    onExit();
                  }}
                  className="ui-btn glass-btn py-2.5 px-4 text-xs sm:text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Вернуться</span>
                </button>

                <button
                  type="button"
                  onClick={startFight}
                  className="ui-btn glass-btn-rose py-2.5 px-5 text-xs sm:text-sm font-bold"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Начать бой</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== PHASE 2 & 3: LIVE PVP COMBAT & RESULT =====================
  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none">
      {/* TOP PVP BATTLE HUD */}
      <div className="w-full max-w-5xl mx-auto space-y-2.5 pointer-events-auto">
        <div className="glass-panel px-3.5 py-2.5 sm:px-5 sm:py-3 flex flex-col gap-2.5">
          {/* Top action row */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={backToLobby}
              className="ui-btn glass-btn px-3 py-1.5 text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>К выбору бойца</span>
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 tracking-wide">
              <Swords className="w-4 h-4 text-rose-400" />
              <span className="font-display font-bold text-sm sm:text-base">АРЕНА PVP</span>
            </div>

            <button
              type="button"
              onClick={() => {
                retroAudio.playBlip(440, 0.05);
                onExit();
              }}
              className="ui-btn glass-btn px-3 py-1.5 text-xs"
            >
              <span>В аквариум</span>
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
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/15">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 progress-sheen transition-all duration-200"
                  style={{ width: `${playerPct}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 progress-sheen transition-all duration-200"
                    style={{ width: `${playerRage}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-nums text-amber-300">
                  {playerRage}%
                </span>
              </div>
            </div>

            {/* VS Center Divider */}
            <div className="font-display font-extrabold text-sm sm:text-lg text-rose-400 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-400/25">
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
              <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-white/15">
                <div
                  className="h-full bg-gradient-to-l from-rose-500 to-orange-400 progress-sheen transition-all duration-200 ml-auto"
                  style={{ width: `${rivalPct}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 text-right truncate tabular-nums">
                {rival.title} · Награда {rival.rewardCoins} 🪙
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Battle Cue Strip & Combo Status */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              rivalCharging
                ? 'bg-rose-950/95 border-rose-400/75 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.45)]'
                : isGuarding
                ? 'bg-cyan-950/95 border-cyan-400/60 text-cyan-100'
                : 'bg-[#0b1120]/90 border-white/10 text-slate-200'
            }`}
          >
            {statusBanner}
          </div>

          {comboCount > 0 && phase === 'fighting' && (
            <div className="px-3 py-1 rounded-lg bg-amber-950/90 border border-amber-400/45 text-[11px] font-mono font-bold text-amber-200 tabular-nums shadow-[0_4px_16px_rgba(245,158,11,0.2)]">
              КОМБО x{comboCount} · +{comboCount * 15}% урон Тарана
            </div>
          )}
        </div>
      </div>

      {/* FLOATING ARENA DAMAGE & PARRY CALLOUTS */}
      <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingCallouts.map((c) => {
          const toneCls =
            c.tone === 'gold'
              ? 'text-amber-300 text-xl sm:text-2xl drop-shadow-[0_2px_10px_rgba(250,204,21,0.75)]'
              : c.tone === 'parry'
              ? 'text-sky-300 text-lg sm:text-xl drop-shadow-[0_2px_10px_rgba(56,189,248,0.8)]'
              : c.tone === 'orange'
              ? 'text-orange-300 text-lg sm:text-xl drop-shadow-[0_2px_8px_rgba(249,115,22,0.7)]'
              : c.tone === 'rose'
              ? 'text-rose-400 text-lg sm:text-xl drop-shadow-[0_2px_8px_rgba(244,63,94,0.75)]'
              : 'text-cyan-300 text-base sm:text-lg drop-shadow-[0_2px_8px_rgba(34,211,238,0.65)]';

          return (
            <div
              key={c.id}
              className={`animate-float-damage absolute top-[43%] font-display font-extrabold tracking-tight tabular-nums whitespace-nowrap ${toneCls} ${
                c.side === 'player' ? 'left-[31%]' : 'left-[69%]'
              }`}
            >
              {c.text}
            </div>
          );
        })}
      </div>

      {/* CENTER MATCH RESULT MODAL */}
      {phase === 'result' && matchResult !== 'none' && (
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
              : `${rival.name} оказался сильнее — ставьте Щит перед тараном!`}
          </p>

          <div className="bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-3 mb-4 text-xs font-mono flex flex-wrap items-center justify-center gap-3">
            {matchResult === 'win' ? (
              <>
                <span className="text-amber-300 font-bold">
                  +{rival.rewardCoins * (stats.isVip ? 2 : 1)} 🪙
                </span>
                <span className="text-cyan-300 font-bold">+45 EXP</span>
                <span className="text-emerald-300 font-bold">+{lastRatingDelta} рейтинг</span>
              </>
            ) : (
              <>
                <span className="text-amber-300 font-bold">+15 🪙</span>
                <span className="text-cyan-300 font-bold">+12 EXP</span>
                <span className="text-rose-300 font-bold">{lastRatingDelta} рейтинг</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={startFight}
              className="ui-btn glass-btn py-2.5 px-3 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Реванш</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLobbyTab('standings');
                backToLobby();
              }}
              className="ui-btn glass-btn-amber py-2.5 px-3 text-xs"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Таблица / Бойцы</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="ui-btn glass-btn w-full py-2.5 px-3 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Вернуться в аквариум</span>
          </button>
        </div>
      )}

      {/* BOTTOM PVP COMBAT CONTROLS */}
      <div className="w-full max-w-3xl mx-auto pointer-events-auto">
        <div className="glass-panel p-2 sm:p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            disabled={matchResult !== 'none' || actionLock}
            onClick={() => handlePlayerAttack('light')}
            className="ui-btn glass-btn-cyan relative flex-col py-2.5 px-3"
          >
            <span className="hidden sm:inline-flex absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px] text-cyan-100/80 leading-none">
              Q
            </span>
            <div className="flex items-center gap-1.5 text-cyan-200 text-xs sm:text-sm font-bold">
              <Zap className="w-4 h-4" />
              <span>Выпад</span>
            </div>
            <span className="text-[11px] font-normal text-cyan-100/75">+Комбо · +22% ярости</span>
          </button>

          <button
            type="button"
            disabled={matchResult !== 'none' || actionLock || heavyCd > 0}
            onClick={() => handlePlayerAttack('heavy')}
            className={`ui-btn relative flex-col py-2.5 px-3 ${
              comboCount >= 2 && heavyCd <= 0
                ? 'glass-btn-amber shadow-[0_0_22px_rgba(245,158,11,0.34)]'
                : 'glass-btn hover:border-orange-300/60'
            }`}
          >
            <span className="hidden sm:inline-flex absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px] text-slate-200/85 leading-none">
              W
            </span>
            <div className="flex items-center gap-1.5 text-orange-300 text-xs sm:text-sm font-bold">
              <Swords className="w-4 h-4" />
              <span>Таран</span>
            </div>
            <span className="text-[11px] font-mono font-normal text-slate-200/75 tabular-nums">
              {heavyCd > 0
                ? `${heavyCd}с`
                : comboCount > 0
                ? `Финишер +${comboCount * 15}%`
                : 'Сильный выпад'}
            </span>
          </button>

          <button
            type="button"
            disabled={matchResult !== 'none' || guardCd > 0 || isGuarding}
            onClick={handleGuard}
            className={`ui-btn relative flex-col py-2.5 px-3 ${
              isGuarding
                ? 'glass-btn-cyan shadow-[0_0_24px_rgba(34,211,238,0.4)]'
                : rivalCharging && guardCd <= 0
                ? 'glass-btn-amber shadow-[0_0_24px_rgba(251,191,36,0.45)]'
                : 'glass-btn-sky'
            }`}
          >
            <span className="hidden sm:inline-flex absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px] text-sky-100/85 leading-none">
              Space
            </span>
            <div
              className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold ${
                rivalCharging && guardCd <= 0 && !isGuarding ? 'text-amber-200' : 'text-sky-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>
                {isGuarding
                  ? 'Щит активен'
                  : rivalCharging && guardCd <= 0
                  ? 'ПАРИРУЙ!'
                  : 'Щит / Блок'}
              </span>
            </div>
            <span className="text-[11px] font-mono font-normal text-sky-100/75 tabular-nums">
              {guardCd > 0 ? `${guardCd}с` : 'Контратака'}
            </span>
          </button>

          <button
            type="button"
            disabled={matchResult !== 'none' || actionLock || playerRage < 100}
            onClick={() => handlePlayerAttack('ultimate')}
            className={`ui-btn relative flex-col py-2.5 px-3 ${
              playerRage >= 100
                ? 'glass-btn-rose'
                : 'glass-btn text-slate-300'
            }`}
          >
            <span className="hidden sm:inline-flex absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-[10px] text-slate-200/85 leading-none">
              R
            </span>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold">
              <Flame className="w-4 h-4" />
              <span>Вихрь Катаны</span>
            </div>
            <span className="text-[11px] font-mono font-normal tabular-nums">
              {playerRage >= 100 ? 'Готово!' : `${playerRage}/100%`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
