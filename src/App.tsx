/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AquariumCanvas } from './components/AquariumCanvas';
import { RetroHeader } from './components/RetroHeader';
import { ActionDock } from './components/ActionDock';
import { ShopModal } from './components/ShopModal';
import { MirrorModal } from './components/MirrorModal';
import { SplashScreen } from './components/SplashScreen';
import { FighterOverlay, RIVAL_ROSTER } from './components/FighterOverlay';
import { loadFishStats, saveFishStats, FOOD_ITEMS, FISH_SKINS, AQUARIUM_THEMES } from './services/storage';
import { FishStats, FoodType, FishColorPalette, AquariumThemeId, DonationTier } from './types';
import { AquariumScene } from './game/AquariumScene';
import { retroAudio } from './services/retroAudio';

function applyExperience(prev: FishStats, expGain: number): {
  experience: number;
  level: number;
  maxExperience: number;
} {
  let nextExp = prev.experience + expGain;
  let nextLevel = prev.level;
  let nextMaxExp = prev.maxExperience;

  while (nextExp >= nextMaxExp) {
    nextExp -= nextMaxExp;
    nextLevel++;
    nextMaxExp = Math.round(nextMaxExp * 1.5);
  }

  return {
    experience: nextExp,
    level: nextLevel,
    maxExperience: nextMaxExp,
  };
}

export default function App() {
  const [stats, setStats] = useState<FishStats>(loadFishStats);
  const [crtEnabled, setCrtEnabled] = useState(false);
  const [bgmActive, setBgmActive] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // PvP Fighter Arena Mode
  const [fighterMode, setFighterMode] = useState(false);
  const [rivalIndex, setRivalIndex] = useState(0);

  // Modals
  const [showShop, setShowShop] = useState(false);
  const [showMirror, setShowMirror] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const sceneRef = useRef<AquariumScene | null>(null);
  const prevLevelRef = useRef(stats.level);

  useEffect(() => {
    saveFishStats(stats);
  }, [stats]);

  useEffect(() => {
    if (stats.level > prevLevelRef.current) {
      retroAudio.playFanfare();
      showToast(`Уровень повышен! Теперь уровень ${stats.level}`);
    }
    prevLevelRef.current = stats.level;
  }, [stats.level]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => {
        const newHunger = Math.max(10, prev.hunger - 1);
        const newClean = Math.max(15, prev.cleanliness - 1);
        const newHappy = Math.max(15, prev.happiness - (newHunger < 30 ? 2 : 0));
        const newHealth = Math.round((newHunger + newClean + newHappy) / 3);

        return {
          ...prev,
          hunger: newHunger,
          cleanliness: newClean,
          happiness: newHappy,
          health: newHealth,
        };
      });
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleFeed = (foodType: FoodType) => {
    const food = FOOD_ITEMS.find((f) => f.id === foodType) || FOOD_ITEMS[0];
    if (stats.coins < food.priceCoins) {
      showToast('Недостаточно монет для этого корма');
      retroAudio.playBlip(200, 0.1);
      return;
    }

    if (sceneRef.current) {
      sceneRef.current.dropFood(food.id, food.hungerRestore);
    }

    setStats((prev) => ({
      ...prev,
      coins: prev.coins - food.priceCoins,
      totalFeedings: prev.totalFeedings + 1,
      lastFedTimestamp: Date.now(),
    }));

    showToast(`Рыбка поплыла к корму «${food.name}»`);
  };

  const handleFishFed = (nutrition: number) => {
    setStats((prev) => {
      const nextHunger = Math.min(100, prev.hunger + nutrition);
      const nextHappy = Math.min(100, prev.happiness + 8);
      const expResult = applyExperience(prev, 15);

      return {
        ...prev,
        hunger: nextHunger,
        happiness: nextHappy,
        health: Math.round((nextHunger + prev.cleanliness + nextHappy) / 3),
        ...expResult,
        coins: prev.coins + 5,
      };
    });
  };

  const handleClean = () => {
    retroAudio.playSplash();
    sceneRef.current?.triggerCleanBurst();
    setStats((prev) => {
      const nextClean = 100;
      const nextHappy = Math.min(100, prev.happiness + 15);
      const expResult = applyExperience(prev, 20);

      return {
        ...prev,
        cleanliness: nextClean,
        happiness: nextHappy,
        health: Math.round((prev.hunger + nextClean + nextHappy) / 3),
        ...expResult,
        coins: prev.coins + 10,
        totalCleans: prev.totalCleans + 1,
        lastCleanedTimestamp: Date.now(),
      };
    });

    showToast('Вода кристально чистая (+10 🪙)');
  };

  const enterFighterArena = () => {
    const rival = RIVAL_ROSTER[rivalIndex % RIVAL_ROSTER.length];
    setShowShop(false);
    setShowMirror(false);
    setFighterMode(true);
    retroAudio.playFlare();
    sceneRef.current?.enterFighterMode(rival.skin, Boolean(rival.isVip), true);
  };

  const exitFighterArena = () => {
    setFighterMode(false);
    sceneRef.current?.exitFighterMode();
  };

  const handleSelectRival = (nextIndex: number) => {
    setRivalIndex(nextIndex);
    const rival = RIVAL_ROSTER[nextIndex % RIVAL_ROSTER.length];
    sceneRef.current?.setOpponentSkin(rival.skin, Boolean(rival.isVip));
  };

  const handleFighterMatchEnd = (
    won: boolean,
    coins: number,
    pearls: number,
    exp: number,
    rivalId: string,
    ratingDelta: number
  ) => {
    setStats((prev) => {
      const expResult = applyExperience(prev, exp);
      const prevDefeated = Array.isArray(prev.defeatedRivals) ? prev.defeatedRivals : [];
      const nextDefeated = won && !prevDefeated.includes(rivalId) ? [...prevDefeated, rivalId] : prevDefeated;
      const nextRating = Math.max(800, (prev.fighterRating ?? 1000) + ratingDelta);

      return {
        ...prev,
        coins: prev.coins + coins,
        pearls: prev.pearls + pearls,
        happiness: Math.min(100, prev.happiness + (won ? 15 : 5)),
        totalPlays: prev.totalPlays + 1,
        fighterWins: (prev.fighterWins ?? 0) + (won ? 1 : 0),
        fighterLosses: (prev.fighterLosses ?? 0) + (won ? 0 : 1),
        fighterRating: nextRating,
        defeatedRivals: nextDefeated,
        ...expResult,
      };
    });
  };

  const handleFeedRef = useRef(handleFeed);
  const handleCleanRef = useRef(handleClean);
  const enterFighterRef = useRef(enterFighterArena);
  const exitFighterRef = useRef(exitFighterArena);
  handleFeedRef.current = handleFeed;
  handleCleanRef.current = handleClean;
  enterFighterRef.current = enterFighterArena;
  exitFighterRef.current = exitFighterArena;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        if (fighterMode) {
          exitFighterRef.current();
        }
        setShowShop(false);
        setShowMirror(false);
        return;
      }

      if (showSplash || fighterMode || showShop || showMirror) return;

      switch (e.key.toLowerCase()) {
        case '1':
        case 'f':
          handleFeedRef.current('pellet');
          break;
        case '2':
        case 'c':
          handleCleanRef.current();
          break;
        case '3':
        case 'm':
          setShowMirror(true);
          break;
        case '4':
        case 'g':
          enterFighterRef.current();
          break;
        case '5':
        case 's':
          setShowShop(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSplash, fighterMode, showShop, showMirror]);

  const handleFishTapped = () => {
    setStats((prev) => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 2),
      energy: Math.min(100, prev.energy + 1),
    }));
  };

  const handleBuySkin = (skinId: FishColorPalette, priceCoins: number, pricePearls: number) => {
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - priceCoins,
      pearls: prev.pearls - pricePearls,
      unlockedSkins: [...prev.unlockedSkins, skinId],
      skin: skinId,
    }));
    showToast(`Приобретён окрас: ${FISH_SKINS[skinId]?.name}`);
  };

  const handleEquipSkin = (skinId: FishColorPalette) => {
    setStats((prev) => ({ ...prev, skin: skinId }));
    showToast(`Выбран окрас: ${FISH_SKINS[skinId]?.name}`);
  };

  const handleBuyTheme = (themeId: AquariumThemeId, priceCoins: number, pricePearls: number) => {
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - priceCoins,
      pearls: prev.pearls - pricePearls,
      unlockedThemes: [...prev.unlockedThemes, themeId],
      theme: themeId,
    }));
    showToast(`Открыта тема: ${AQUARIUM_THEMES[themeId]?.name}`);
  };

  const handleEquipTheme = (themeId: AquariumThemeId) => {
    setStats((prev) => ({ ...prev, theme: themeId }));
    showToast(`Тема аквариума: ${AQUARIUM_THEMES[themeId]?.name}`);
  };

  const handleApplyDonation = (tier: DonationTier) => {
    setStats((prev) => {
      const isSuper = tier.id === 'tier_emperor';
      const allSkins = Object.keys(FISH_SKINS) as FishColorPalette[];
      const allThemes = Object.keys(AQUARIUM_THEMES) as AquariumThemeId[];

      return {
        ...prev,
        isVip: true,
        coins: prev.coins + tier.coinsAwarded,
        pearls: prev.pearls + tier.pearlsAwarded,
        unlockedSkins: isSuper
          ? allSkins
          : prev.unlockedSkins.includes('golden_imperial')
          ? prev.unlockedSkins
          : [...prev.unlockedSkins, 'golden_imperial'],
        unlockedThemes: isSuper
          ? allThemes
          : prev.unlockedThemes.includes('golden_palace')
          ? prev.unlockedThemes
          : [...prev.unlockedThemes, 'golden_palace'],
        skin: 'golden_imperial',
        happiness: 100,
        energy: 100,
      };
    });

    setShowShop(false);
    showToast(`Активирован ${tier.titleBadge} — золотая корона надета!`);
  };

  const handleMirrorTrainingComplete = () => {
    setStats((prev) => {
      const nextHappy = 100;
      const expResult = applyExperience(prev, 35);
      return {
        ...prev,
        happiness: nextHappy,
        energy: 100,
        health: Math.round((prev.hunger + prev.cleanliness + nextHappy) / 3),
        ...expResult,
        coins: prev.coins + 25,
        totalPlays: prev.totalPlays + 1,
      };
    });
    showToast('Тренировка завершена (+25 🪙, +35 EXP)');
  };

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#060913] font-sans">
      <div className="relative w-full h-full overflow-hidden">
        {/* 3D WebGL Canvas Viewport */}
        <AquariumCanvas
          skin={stats.skin}
          theme={stats.theme}
          isVip={stats.isVip}
          cleanliness={stats.cleanliness}
          onSceneReady={(scene) => {
            sceneRef.current = scene;
          }}
          onFishFed={handleFishFed}
          onFishTapped={handleFishTapped}
        />

        {/* Subtle ambient edge vignette for atmospheric tank framing */}
        <div className="absolute inset-0 viewport-vignette pointer-events-none z-10" />

        {/* Optional Subtle Screen Atmosphere Filter */}
        {crtEnabled && (
          <div className="absolute inset-0 crt-overlay crt-vignette pointer-events-none z-10" />
        )}

        {/* Aquarium Mode HUD vs PvP Fighter Arena HUD */}
        {!fighterMode ? (
          <>
            <RetroHeader
              stats={stats}
              onUpdateName={(name) => setStats((prev) => ({ ...prev, name }))}
              crtEnabled={crtEnabled}
              onToggleCrt={() => setCrtEnabled(!crtEnabled)}
              bgmActive={bgmActive}
              onToggleBgm={() => {
                const active = retroAudio.toggleBGM();
                setBgmActive(active);
              }}
              soundMuted={soundMuted}
              onToggleMute={() => {
                const nextMuted = !soundMuted;
                retroAudio.setMuted(nextMuted);
                setSoundMuted(nextMuted);
              }}
            />

            <ActionDock
              stats={stats}
              onFeed={handleFeed}
              onClean={handleClean}
              onOpenMirror={() => setShowMirror(true)}
              onEnterFighter={enterFighterArena}
              onOpenShop={() => setShowShop(true)}
            />
          </>
        ) : (
          <FighterOverlay
            stats={stats}
            rivalIndex={rivalIndex}
            onSelectRival={handleSelectRival}
            onFightStateChange={(isFighting) => sceneRef.current?.setFighterActive(isFighting)}
            onMove={(actor, kind) => sceneRef.current?.playFighterMove(actor, kind)}
            onMatchEnd={handleFighterMatchEnd}
            onExit={exitFighterArena}
          />
        )}

        {/* Modern Toast Notification */}
        {toastMessage && !fighterMode && (
          <div className="glass-panel absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 z-40 border-cyan-400/35 text-slate-100 px-4 py-2 text-xs sm:text-sm font-medium max-w-[90vw] text-center select-none pointer-events-none">
            {toastMessage}
          </div>
        )}
      </div>

      {/* Modals */}
      {showShop && (
        <ShopModal
          stats={stats}
          onClose={() => setShowShop(false)}
          onBuySkin={handleBuySkin}
          onEquipSkin={handleEquipSkin}
          onBuyTheme={handleBuyTheme}
          onEquipTheme={handleEquipTheme}
          onApplyDonation={handleApplyDonation}
        />
      )}

      {showMirror && (
        <MirrorModal
          onClose={() => setShowMirror(false)}
          onFlareToggle={(active) => {
            if (sceneRef.current && sceneRef.current.fish) {
              sceneRef.current.fish.triggerFlare(active);
            }
          }}
          onTrainingComplete={handleMirrorTrainingComplete}
        />
      )}

      {/* Initial FishFighter Splash Screen */}
      {showSplash && (
        <SplashScreen
          stats={stats}
          onStart={(enableBgm) => {
            setShowSplash(false);
            if (enableBgm && !soundMuted) {
              retroAudio.startBGM();
              setBgmActive(true);
            }
          }}
        />
      )}
    </div>
  );
}
