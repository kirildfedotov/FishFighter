/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, ShoppingBag } from 'lucide-react';
import { FISH_SKINS, AQUARIUM_THEMES } from '../services/storage';
import { FishStats, FishColorPalette, AquariumThemeId } from '../types';
import { retroAudio } from '../services/retroAudio';

interface ShopModalProps {
  stats: FishStats;
  onClose: () => void;
  onBuySkin: (skinId: FishColorPalette, priceCoins: number, pricePearls: number) => void;
  onEquipSkin: (skinId: FishColorPalette) => void;
  onBuyTheme: (themeId: AquariumThemeId, priceCoins: number, pricePearls: number) => void;
  onEquipTheme: (themeId: AquariumThemeId) => void;
}

const THEME_BADGE_ICON: Record<AquariumThemeId, string> = {
  tokyo_neon_96: '🌃',
  zen_garden: '⛩️',
  dendy_castle: '🏰',
  sakura_shrine: '🌸',
  golden_palace: '👑',
};

export const ShopModal: React.FC<ShopModalProps> = ({
  stats,
  onClose,
  onBuySkin,
  onEquipSkin,
  onBuyTheme,
  onEquipTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'skins' | 'themes'>('skins');

  const skinsList = Object.values(FISH_SKINS);
  const themesList = Object.values(AQUARIUM_THEMES);

  const formatPriceLabel = (priceCoins: number, pricePearls: number): string => {
    if (priceCoins > 0 && pricePearls > 0) return `${priceCoins} 🪙 + ${pricePearls} 🦪`;
    if (priceCoins > 0) return `${priceCoins} 🪙`;
    if (pricePearls > 0) return `${pricePearls} 🦪`;
    return 'Бесплатно';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/85 select-none">
      <div className="arcade-panel border-4 border-[#eab308] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Clean Shop Header & Wallet Bar */}
        <div className="bg-[#18122b] px-4 py-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#eab308]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-[#eab308] border-2 border-[#fef08a] text-black flex items-center justify-center shadow">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-[#fde047] tracking-wide">
                МАГАЗИН АКВАРИУМА
              </h2>
              <p className="text-[11px] font-mono text-[#a5b4fc]">
                Окрасы рыбки и большие 3D-диорамы
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5 bg-[#0e1022] border-2 border-[#b45309] px-2.5 py-1 rounded-md text-xs font-mono font-bold text-[#fde047]">
              <span>🪙</span>
              <span className="tabular-nums">{stats.coins}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#1b0f2e] border-2 border-[#9333ea] px-2.5 py-1 rounded-md text-xs font-mono font-bold text-[#f0abfc]">
              <span>🦪</span>
              <span className="tabular-nums">{stats.pearls}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                retroAudio.playBlip(400, 0.04);
              }}
              aria-label="Закрыть магазин"
              className="arcade-btn bg-[#272744] hover:bg-[#383862] border-[#6366f1] text-white p-1.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Simple Unified Category Tabs */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#0b0d1e] border-b-2 border-[#312e81]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('skins');
              retroAudio.playBlip(550, 0.03);
            }}
            className={`arcade-btn py-2 px-2 text-[11px] sm:text-xs ${
              activeTab === 'skins'
                ? 'bg-[#eab308] border-[#fef08a] text-black'
                : 'bg-[#161936] border-[#312e81] text-[#cbd5e1] hover:border-[#6366f1]'
            }`}
          >
            <span>🐟 Окрасы</span>
            <span className="opacity-75 text-[10px]">({skinsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('themes');
              retroAudio.playBlip(550, 0.03);
            }}
            className={`arcade-btn py-2 px-2 text-[11px] sm:text-xs ${
              activeTab === 'themes'
                ? 'bg-[#eab308] border-[#fef08a] text-black'
                : 'bg-[#161936] border-[#312e81] text-[#cbd5e1] hover:border-[#6366f1]'
            }`}
          >
            <span>⛩️ Аквариумы</span>
            <span className="opacity-75 text-[10px]">({themesList.length})</span>
          </button>
        </div>

        {/* Shop Grid */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1">
          {activeTab === 'skins' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {skinsList.map((skin) => {
                const isUnlocked = stats.unlockedSkins.includes(skin.id);
                const isEquipped = stats.skin === skin.id;
                const canBuy = stats.coins >= skin.priceCoins && stats.pearls >= skin.pricePearls;
                const gradId = `shop_skin_${skin.id}`;

                return (
                  <div
                    key={skin.id}
                    className={`rounded-lg border-2 flex flex-col justify-between overflow-hidden transition ${
                      isEquipped
                        ? 'bg-[#14244d] border-[#38bdf8]'
                        : isUnlocked
                        ? 'bg-[#151833] border-[#4338ca]'
                        : 'bg-[#101226] border-[#2b2e4a]'
                    }`}
                  >
                    {/* Visual Betta Preview Banner */}
                    <div
                      className="h-24 relative flex items-center justify-center px-4 border-b border-white/10"
                      style={{
                        background: `radial-gradient(circle at 35% 50%, ${skin.primaryColor}33 0%, #090b1a 78%)`,
                      }}
                    >
                      {skin.isVipOnly && (
                        <span className="absolute top-2 left-2 bg-[#eab308] text-black font-mono font-black text-[9px] px-1.5 py-0.5 rounded-sm border border-black">
                          VIP
                        </span>
                      )}
                      {isEquipped && (
                        <span className="absolute top-2 right-2 bg-[#0284c7] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-sm flex items-center gap-1">
                          <Check className="w-3 h-3" /> Надето
                        </span>
                      )}
                      {!isEquipped && isUnlocked && (
                        <span className="absolute top-2 right-2 bg-[#1e293b] text-[#93c5fd] font-mono text-[10px] px-2 py-0.5 rounded-sm">
                          Куплено
                        </span>
                      )}

                      {/* Custom SVG Mini Betta Fish showing true palette */}
                      <svg viewBox="0 0 160 90" className="w-36 h-20 drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)]" aria-hidden="true">
                        <defs>
                          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={skin.secondaryColor} />
                            <stop offset="55%" stopColor={skin.primaryColor} />
                            <stop offset="100%" stopColor={skin.fresnelColor} />
                          </linearGradient>
                        </defs>
                        <path
                          d="M66 45 C48 16, 18 6, 18 26 C28 32, 16 38, 12 45 C16 52, 28 58, 18 64 C18 84, 48 74, 66 45 Z"
                          fill={`url(#${gradId})`}
                          stroke={skin.fresnelColor}
                          strokeWidth="1.2"
                        />
                        <path
                          d="M74 34 C70 12, 92 8, 104 24 C106 31, 96 34, 88 35 Z"
                          fill={`url(#${gradId})`}
                        />
                        <path
                          d="M70 55 C64 76, 94 84, 108 68 C108 60, 96 56, 86 55 Z"
                          fill={`url(#${gradId})`}
                        />
                        <path
                          d="M64 45 C70 32, 98 28, 122 38 C132 42, 136 45, 134 49 C130 55, 114 59, 92 58 C76 57, 67 52, 64 45 Z"
                          fill={skin.primaryColor}
                          stroke={skin.bellyColor}
                          strokeWidth="1.4"
                        />
                        <circle cx="122" cy="43" r="3.2" fill={skin.bellyColor} />
                        <circle cx="122.6" cy="43" r="1.6" fill="#020617" />
                      </svg>
                    </div>

                    {/* Info + Single Clear Action Button */}
                    <div className="p-3 flex flex-col justify-between flex-1 gap-3">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-sm font-bold text-white leading-tight">{skin.name}</h3>
                        </div>
                        <p className="text-xs text-[#cbd5e1] leading-snug">{skin.description}</p>
                      </div>

                      {isUnlocked ? (
                        isEquipped ? (
                          <button
                            type="button"
                            disabled
                            className="arcade-btn w-full py-2 px-3 bg-[#0c4a6e] border-[#38bdf8] text-[#bae6fd] text-xs"
                          >
                            <Check className="w-4 h-4" /> Сейчас выбран
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onEquipSkin(skin.id);
                              retroAudio.playBlip(750, 0.05);
                            }}
                            className="arcade-btn w-full py-2 px-3 bg-[#4338ca] hover:bg-[#4f46e5] border-[#818cf8] text-white text-xs"
                          >
                            Выбрать окрас
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            onBuySkin(skin.id, skin.priceCoins, skin.pricePearls);
                            retroAudio.playCoin();
                          }}
                          className={`arcade-btn w-full py-2 px-3 text-xs ${
                            canBuy
                              ? 'bg-[#eab308] hover:bg-[#facc15] border-[#fef08a] text-black'
                              : 'bg-[#1a1c33] border-[#333659] text-[#94a3b8]'
                          }`}
                        >
                          {`Купить • ${formatPriceLabel(skin.priceCoins, skin.pricePearls)}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themesList.map((thm) => {
                const isUnlocked = stats.unlockedThemes.includes(thm.id);
                const isEquipped = stats.theme === thm.id;
                const canBuy = stats.coins >= thm.priceCoins && stats.pearls >= thm.pricePearls;
                const icon = THEME_BADGE_ICON[thm.id] || '🌊';

                return (
                  <div
                    key={thm.id}
                    className={`rounded-lg border-2 flex flex-col justify-between overflow-hidden transition ${
                      isEquipped
                        ? 'bg-[#14244d] border-[#38bdf8]'
                        : isUnlocked
                        ? 'bg-[#151833] border-[#4338ca]'
                        : 'bg-[#101226] border-[#2b2e4a]'
                    }`}
                  >
                    {/* Aquarium Panorama Swatch Preview */}
                    <div
                      className="h-24 relative flex flex-col justify-between p-2.5 overflow-hidden border-b border-white/10"
                      style={{
                        background: `linear-gradient(180deg, ${thm.waterColor} 0%, ${thm.fogColor} 72%, ${thm.sandColor} 100%)`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        {thm.isVipOnly ? (
                          <span className="bg-[#eab308] text-black font-mono font-black text-[9px] px-1.5 py-0.5 rounded-sm border border-black">
                            VIP
                          </span>
                        ) : (
                          <span />
                        )}
                        {isEquipped ? (
                          <span className="bg-[#0284c7] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-sm flex items-center gap-1">
                            <Check className="w-3 h-3" /> Активна
                          </span>
                        ) : isUnlocked ? (
                          <span className="bg-[#1e293b]/90 text-[#93c5fd] font-mono text-[10px] px-2 py-0.5 rounded-sm">
                            Куплено
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-end justify-between">
                        <span className="text-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">{icon}</span>
                        <span className="text-[10px] font-mono text-white/80 bg-black/45 px-2 py-0.5 rounded-sm">
                          3D-Диорама
                        </span>
                      </div>
                    </div>

                    {/* Info + Single Clear Action Button */}
                    <div className="p-3 flex flex-col justify-between flex-1 gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight mb-1">{thm.name}</h3>
                        <p className="text-xs text-[#cbd5e1] leading-snug">{thm.description}</p>
                      </div>

                      {isUnlocked ? (
                        isEquipped ? (
                          <button
                            type="button"
                            disabled
                            className="arcade-btn w-full py-2 px-3 bg-[#0c4a6e] border-[#38bdf8] text-[#bae6fd] text-xs"
                          >
                            <Check className="w-4 h-4" /> Сейчас установлена
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onEquipTheme(thm.id);
                              retroAudio.playBlip(750, 0.05);
                            }}
                            className="arcade-btn w-full py-2 px-3 bg-[#4338ca] hover:bg-[#4f46e5] border-[#818cf8] text-white text-xs"
                          >
                            Установить тему
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            onBuyTheme(thm.id, thm.priceCoins, thm.pricePearls);
                            retroAudio.playCoin();
                          }}
                          className={`arcade-btn w-full py-2 px-3 text-xs ${
                            canBuy
                              ? 'bg-[#eab308] hover:bg-[#facc15] border-[#fef08a] text-black'
                              : 'bg-[#1a1c33] border-[#333659] text-[#94a3b8]'
                          }`}
                        >
                          {`Купить • ${formatPriceLabel(thm.priceCoins, thm.pricePearls)}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
