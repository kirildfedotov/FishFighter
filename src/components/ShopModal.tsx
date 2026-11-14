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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 select-none">
      <div className="glass-panel w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Clean Modern Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-white leading-tight">
                Магазин аквариума
              </h2>
              <p className="text-xs text-slate-400">
                Окрасы бойцового петушка и 3D-диорамы
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-mono font-bold">
              <span className="text-amber-300 tabular-nums">🪙 {stats.coins}</span>
              <span className="text-white/15">|</span>
              <span className="text-fuchsia-300 tabular-nums">🦪 {stats.pearls}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                retroAudio.playBlip(400, 0.04);
              }}
              aria-label="Закрыть магазин"
              className="ui-btn bg-slate-800/80 hover:bg-slate-700 border-white/15 text-slate-200 p-2 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modern Segmented Tabs */}
        <div className="px-4 pt-3 sm:px-6">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('skins');
                retroAudio.playBlip(550, 0.03);
              }}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'skins'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Окрасы</span>
              <span className="text-xs opacity-70 tabular-nums">{skinsList.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('themes');
                retroAudio.playBlip(550, 0.03);
              }}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'themes'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Аквариумы</span>
              <span className="text-xs opacity-70 tabular-nums">{themesList.length}</span>
            </button>
          </div>
        </div>

        {/* Showcase Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'skins' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {skinsList.map((skin) => {
                const isUnlocked = stats.unlockedSkins.includes(skin.id);
                const isEquipped = stats.skin === skin.id;
                const canBuy = stats.coins >= skin.priceCoins && stats.pearls >= skin.pricePearls;
                const gradId = `shop_skin_${skin.id}`;

                return (
                  <div
                    key={skin.id}
                    className={`rounded-2xl border flex flex-col justify-between overflow-hidden transition ${
                      isEquipped
                        ? 'bg-slate-900/95 border-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.12)]'
                        : 'bg-slate-900/65 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Live Palette Betta Preview */}
                    <div
                      className="h-28 relative flex items-center justify-center px-4 border-b border-white/10"
                      style={{
                        background: `radial-gradient(circle at 38% 50%, ${skin.primaryColor}30 0%, #070b15 78%)`,
                      }}
                    >
                      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between text-[11px] font-medium">
                        <span className="text-amber-300 font-semibold">
                          {skin.isVipOnly ? 'VIP-серия' : ''}
                        </span>
                        <span className={isEquipped ? 'text-cyan-300 font-semibold' : 'text-slate-400'}>
                          {isEquipped ? 'Выбрано' : isUnlocked ? 'В коллекции' : ''}
                        </span>
                      </div>

                      <svg
                        viewBox="0 0 160 90"
                        className="w-36 h-20 drop-shadow-[0_6px_14px_rgba(0,0,0,0.65)]"
                        aria-hidden="true"
                      >
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

                    {/* Info & Single Primary Action */}
                    <div className="p-4 flex flex-col justify-between flex-1 gap-3.5">
                      <div>
                        <h3 className="font-display text-sm sm:text-base font-bold text-white leading-snug mb-1">
                          {skin.name}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">{skin.description}</p>
                      </div>

                      {isUnlocked ? (
                        isEquipped ? (
                          <button
                            type="button"
                            disabled
                            className="ui-btn w-full py-2.5 px-4 bg-cyan-500/15 border-cyan-400/40 text-cyan-200 text-xs"
                          >
                            <Check className="w-4 h-4" />
                            <span>Сейчас выбран</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onEquipSkin(skin.id);
                              retroAudio.playBlip(750, 0.05);
                            }}
                            className="ui-btn w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border-white/15 text-white text-xs"
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
                          className={`ui-btn w-full py-2.5 px-4 text-xs ${
                            canBuy
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 border-amber-200/50 text-slate-950 font-bold'
                              : 'bg-slate-800/70 border-white/10 text-slate-400'
                          }`}
                        >
                          {`Купить · ${formatPriceLabel(skin.priceCoins, skin.pricePearls)}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {themesList.map((thm) => {
                const isUnlocked = stats.unlockedThemes.includes(thm.id);
                const isEquipped = stats.theme === thm.id;
                const canBuy = stats.coins >= thm.priceCoins && stats.pearls >= thm.pricePearls;
                const icon = THEME_BADGE_ICON[thm.id] || '🌊';

                return (
                  <div
                    key={thm.id}
                    className={`rounded-2xl border flex flex-col justify-between overflow-hidden transition ${
                      isEquipped
                        ? 'bg-slate-900/95 border-cyan-400/60 shadow-[0_0_25px_rgba(34,211,238,0.12)]'
                        : 'bg-slate-900/65 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Aquarium Panorama Preview */}
                    <div
                      className="h-28 relative flex flex-col justify-between p-3.5 overflow-hidden border-b border-white/10"
                      style={{
                        background: `linear-gradient(180deg, ${thm.waterColor} 0%, ${thm.fogColor} 72%, ${thm.sandColor} 100%)`,
                      }}
                    >
                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span className="text-amber-300 font-semibold">
                          {thm.isVipOnly ? 'VIP-диорама' : ''}
                        </span>
                        <span className={isEquipped ? 'text-cyan-300 font-semibold' : 'text-slate-300'}>
                          {isEquipped ? 'Активна' : isUnlocked ? 'В коллекции' : ''}
                        </span>
                      </div>

                      <div className="flex items-end justify-between">
                        <span className="text-3xl drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)]">{icon}</span>
                        <span className="text-[11px] font-medium text-white/80">
                          3D-сцена
                        </span>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col justify-between flex-1 gap-3.5">
                      <div>
                        <h3 className="font-display text-sm sm:text-base font-bold text-white leading-snug mb-1">
                          {thm.name}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">{thm.description}</p>
                      </div>

                      {isUnlocked ? (
                        isEquipped ? (
                          <button
                            type="button"
                            disabled
                            className="ui-btn w-full py-2.5 px-4 bg-cyan-500/15 border-cyan-400/40 text-cyan-200 text-xs"
                          >
                            <Check className="w-4 h-4" />
                            <span>Сейчас установлена</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onEquipTheme(thm.id);
                              retroAudio.playBlip(750, 0.05);
                            }}
                            className="ui-btn w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border-white/15 text-white text-xs"
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
                          className={`ui-btn w-full py-2.5 px-4 text-xs ${
                            canBuy
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 border-amber-200/50 text-slate-950 font-bold'
                              : 'bg-slate-800/70 border-white/10 text-slate-400'
                          }`}
                        >
                          {`Купить · ${formatPriceLabel(thm.priceCoins, thm.pricePearls)}`}
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
