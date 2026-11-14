/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AquariumCanvas } from './components/AquariumCanvas';
import { RetroHeader } from './components/RetroHeader';
import { ActionDock } from './components/ActionDock';
import { ShopModal } from './components/ShopModal';
import { DonateModal } from './components/DonateModal';
import { MiniGameModal } from './components/MiniGameModal';
import { MirrorModal } from './components/MirrorModal';
import { SplashScreen } from './components/SplashScreen';
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
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [bgmActive, setBgmActive] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Modals
  const [showShop, setShowShop] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showMirror, setShowMirror] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const sceneRef = useRef<AquariumScene | null>(null);
  const prevLevelRef = useRef(stats.level);

  // Auto-save stats to localStorage
  useEffect(() => {
    saveFishStats(stats);
  }, [stats]);

  // Announce level-ups cleanly outside setState updaters
  useEffect(() => {
    if (stats.level > prevLevelRef.current) {
      retroAudio.playFanfare();
      showToast(`🎉 УРОВЕНЬ ПОВЫШЕН! Теперь уровень ${stats.level}!`);
    }
    prevLevelRef.current = stats.level;
  }, [stats.level]);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Periodic stat gentle decay & level check
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
    }, 45000); // Check every 45s

    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Action: Feed
  const handleFeed = (foodType: FoodType) => {
    const food = FOOD_ITEMS.find((f) => f.id === foodType) || FOOD_ITEMS[0];
    if (stats.coins < food.priceCoins) {
      showToast('Недостаточно монет для этого корма! 🪙');
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

    showToast(`Рыбка устремилась к ${food.name}! 🍱`);
  };

  // Scene Callback when fish catches pellet
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

  // Action: Clean
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

    showToast('Стекло начищено до блеска, вода кристальная! 🧼 (+10 🪙)');
  };

  const handleFeedRef = useRef(handleFeed);
  const handleCleanRef = useRef(handleClean);
  handleFeedRef.current = handleFeed;
  handleCleanRef.current = handleClean;

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        setShowShop(false);
        setShowDonate(false);
        setShowMiniGame(false);
        setShowMirror(false);
        return;
      }

      // Do not trigger global hotkeys while splash, mini-game or modals are open
      if (showSplash || showMiniGame || showShop || showDonate || showMirror) return;

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
          setShowMiniGame(true);
          break;
        case '5':
        case 's':
          setShowShop(true);
          break;
        case '6':
        case 'd':
          setShowDonate(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSplash, showMiniGame, showShop, showDonate, showMirror]);

  // Tap glass
  const handleFishTapped = () => {
    setStats((prev) => ({
      ...prev,
      happiness: Math.min(100, prev.happiness + 2),
      energy: Math.min(100, prev.energy + 1),
    }));
  };

  // Shop purchase skin
  const handleBuySkin = (skinId: FishColorPalette, priceCoins: number, pricePearls: number) => {
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - priceCoins,
      pearls: prev.pearls - pricePearls,
      unlockedSkins: [...prev.unlockedSkins, skinId],
      skin: skinId,
    }));
    showToast(`Приобретен новый окрас: ${FISH_SKINS[skinId]?.name}! 🐟`);
  };

  // Shop equip skin
  const handleEquipSkin = (skinId: FishColorPalette) => {
    setStats((prev) => ({ ...prev, skin: skinId }));
    showToast(`Окрас изменен на ${FISH_SKINS[skinId]?.name}!`);
  };

  // Shop purchase theme
  const handleBuyTheme = (themeId: AquariumThemeId, priceCoins: number, pricePearls: number) => {
    setStats((prev) => ({
      ...prev,
      coins: prev.coins - priceCoins,
      pearls: prev.pearls - pricePearls,
      unlockedThemes: [...prev.unlockedThemes, themeId],
      theme: themeId,
    }));
    showToast(`Разблокирована тема: ${AQUARIUM_THEMES[themeId]?.name}! ⛩️`);
  };

  // Shop equip theme
  const handleEquipTheme = (themeId: AquariumThemeId) => {
    setStats((prev) => ({ ...prev, theme: themeId }));
    showToast(`Тема аквариума изменена на ${AQUARIUM_THEMES[themeId]?.name}!`);
  };

  // Donation Tier applied
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
        unlockedSkins: isSuper ? allSkins : (prev.unlockedSkins.includes('golden_imperial') ? prev.unlockedSkins : [...prev.unlockedSkins, 'golden_imperial']),
        unlockedThemes: isSuper ? allThemes : (prev.unlockedThemes.includes('golden_palace') ? prev.unlockedThemes : [...prev.unlockedThemes, 'golden_palace']),
        skin: 'golden_imperial',
        happiness: 100,
        energy: 100,
      };
    });

    setShowDonate(false);
    showToast(`🌟 Активирован ${tier.titleBadge}! Золотая корона надета!`);
  };

  // Reward from mini-game
  const handleMiniGameReward = (coins: number, pearls: number) => {
    setStats((prev) => ({
      ...prev,
      coins: prev.coins + coins,
      pearls: prev.pearls + pearls,
      happiness: Math.min(100, prev.happiness + 20),
    }));
    showToast(`Награда за игру: +${coins} 🪙 ${pearls > 0 ? `+${pearls} 🦪` : ''}!`);
  };

  // Mirror flare training complete
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
    showToast('Петушок расправил плавники и полон царской энергии! 🪞 (+25 🪙)');
  };

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#0a0a14] font-sans">
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

          {/* 90s CRT Scanline Overlay */}
          {crtEnabled && (
            <div className="absolute inset-0 crt-overlay crt-vignette pointer-events-none z-10" />
          )}

          {/* Top HUD Header */}
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

          {/* Notification Toast Message (Retro Pixel Banner) */}
          {toastMessage && (
            <div className="arcade-panel absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 border-[#facc15] text-[#fef08a] px-4 py-2 font-mono font-bold text-xs sm:text-sm max-w-[90vw] text-center select-none pointer-events-none">
              {toastMessage}
            </div>
          )}

          {/* Collapsible Unified Bottom Action Dock */}
          <ActionDock
            stats={stats}
            onFeed={handleFeed}
            onClean={handleClean}
            onOpenMirror={() => setShowMirror(true)}
            onOpenMiniGame={() => setShowMiniGame(true)}
            onOpenShop={() => setShowShop(true)}
            onOpenDonate={() => setShowDonate(true)}
          />

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
        />
      )}

      {showDonate && (
        <DonateModal
          stats={stats}
          onClose={() => setShowDonate(false)}
          onApplyDonation={handleApplyDonation}
        />
      )}

      {showMiniGame && (
        <MiniGameModal
          onClose={() => setShowMiniGame(false)}
          onReward={handleMiniGameReward}
          isVip={stats.isVip}
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

      {/* Initial FishFighter Arcade Splash Screen */}
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
