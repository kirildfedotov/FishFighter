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
import { TamagotchiShell } from './components/TamagotchiShell';
import { loadFishStats, saveFishStats, FOOD_ITEMS, FISH_SKINS, AQUARIUM_THEMES } from './services/storage';
import { FishStats, FoodType, FishColorPalette, AquariumThemeId, DonationTier } from './types';
import { AquariumScene } from './game/AquariumScene';
import { retroAudio } from './services/retroAudio';

export default function App() {
  const [stats, setStats] = useState<FishStats>(loadFishStats);
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [shellMode, setShellMode] = useState(false);
  const [bgmActive, setBgmActive] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  // Modals
  const [showShop, setShowShop] = useState(false);
  const [showDonate, setShowDonate] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showMirror, setShowMirror] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const sceneRef = useRef<AquariumScene | null>(null);

  // Auto-save stats to localStorage
  useEffect(() => {
    saveFishStats(stats);
  }, [stats]);

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

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case '1':
        case 'f':
          handleFeed('pellet');
          break;
        case '2':
        case 'c':
          handleClean();
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
        case 't':
          setShellMode((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stats.coins]);

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
      const expGain = 15;
      const nextExp = prev.experience + expGain;
      let nextLevel = prev.level;
      let nextMaxExp = prev.maxExperience;

      if (nextExp >= prev.maxExperience) {
        nextLevel++;
        nextMaxExp = Math.round(prev.maxExperience * 1.5);
        retroAudio.playFanfare();
        showToast(`🎉 УРОВЕНЬ ПОВЫШЕН! Теперь уровень ${nextLevel}!`);
      }

      return {
        ...prev,
        hunger: Math.min(100, prev.hunger + nutrition),
        happiness: Math.min(100, prev.happiness + 8),
        experience: nextExp % nextMaxExp,
        level: nextLevel,
        maxExperience: nextMaxExp,
        coins: prev.coins + 5,
      };
    });
  };

  // Action: Clean
  const handleClean = () => {
    retroAudio.playSplash();
    setStats((prev) => {
      const expGain = 20;
      const nextExp = prev.experience + expGain;
      let nextLevel = prev.level;
      let nextMaxExp = prev.maxExperience;

      if (nextExp >= prev.maxExperience) {
        nextLevel++;
        nextMaxExp = Math.round(prev.maxExperience * 1.5);
        retroAudio.playFanfare();
        showToast(`🎉 УРОВЕНЬ ПОВЫШЕН! Уровень ${nextLevel}!`);
      }

      return {
        ...prev,
        cleanliness: 100,
        happiness: Math.min(100, prev.happiness + 15),
        experience: nextExp % nextMaxExp,
        level: nextLevel,
        maxExperience: nextMaxExp,
        coins: prev.coins + 10,
        totalCleans: prev.totalCleans + 1,
        lastCleanedTimestamp: Date.now(),
      };
    });

    showToast('Стекло начищено до блеска, вода кристальная! 🧼 (+10 🪙)');
  };

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
    setStats((prev) => ({
      ...prev,
      happiness: 100,
      energy: 100,
      experience: prev.experience + 35,
      coins: prev.coins + 25,
      totalPlays: prev.totalPlays + 1,
    }));
    showToast('Петушок расправил плавники и полон царской энергии! 🪞 (+25 🪙)');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0a14] font-sans">
      
      {/* Handheld Tamagotchi Shell / Fullscreen Switcher Wrapper */}
      <TamagotchiShell
        active={shellMode}
        onButtonA={() => handleFeed('pellet')}
        onButtonB={() => setShowMirror(true)}
        onButtonC={() => handleClean()}
      >
        <div className="relative w-full h-full overflow-hidden">
          
          {/* 3D WebGL Canvas Viewport */}
          <AquariumCanvas
            skin={stats.skin}
            theme={stats.theme}
            isVip={stats.isVip}
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
            shellMode={shellMode}
            onToggleShell={() => setShellMode(!shellMode)}
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

          {/* Notification Toast Message (Retro Pixel Balloon) */}
          {toastMessage && (
            <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 bg-[#1e1b4b]/95 border-2 border-[#facc15] text-[#fef08a] px-4 py-2 rounded-lg shadow-2xl font-['Press_Start_2P'] text-[9px] sm:text-[11px] max-w-[90vw] text-center animate-bounce select-none pointer-events-none">
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
      </TamagotchiShell>

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

    </div>
  );
}
