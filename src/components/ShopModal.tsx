/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, Lock, Sparkles, Coins } from 'lucide-react';
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

export const ShopModal: React.FC<ShopModalProps> = ({
  stats,
  onClose,
  onBuySkin,
  onEquipSkin,
  onBuyTheme,
  onEquipTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'skins' | 'themes'>('skins');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs select-none">
      <div className="bg-[#121324] border-4 border-[#eab308] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(234,179,8,0.3)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#854d0e] via-[#ca8a04] to-[#854d0e] px-4 py-3 flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-black tracking-wider drop-shadow">
                МАГАЗИН «САКУРА 96»
              </h2>
              <div className="font-['DotGothic16'] text-xs text-yellow-950 font-bold">
                アクアリウムショップ
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded text-xs font-mono text-[#fef08a]">
              <span>🪙</span>
              <span className="font-bold">{stats.coins}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded text-xs font-mono text-[#f0abfc]">
              <span>🦪</span>
              <span className="font-bold">{stats.pearls}</span>
            </div>
            <button
              onClick={() => {
                onClose();
                retroAudio.playBlip(400, 0.04);
              }}
              className="bg-black/60 hover:bg-black text-white p-1 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b-2 border-[#312e81] bg-[#0c0d18]">
          <button
            onClick={() => {
              setActiveTab('skins');
              retroAudio.playBlip(550, 0.03);
            }}
            className={`flex-1 py-2.5 font-['Press_Start_2P'] text-[10px] sm:text-xs transition ${
              activeTab === 'skins'
                ? 'bg-[#1e1b4b] text-[#facc15] border-b-2 border-[#facc15]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            🐟 ОКРАСЫ ПЕТУШКА
          </button>
          <button
            onClick={() => {
              setActiveTab('themes');
              retroAudio.playBlip(550, 0.03);
            }}
            className={`flex-1 py-2.5 font-['Press_Start_2P'] text-[10px] sm:text-xs transition ${
              activeTab === 'themes'
                ? 'bg-[#1e1b4b] text-[#facc15] border-b-2 border-[#facc15]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            ⛩️ ТЕМЫ И ДЕКОР
          </button>
        </div>

        {/* Tab Content List */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'skins' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(FISH_SKINS).map((skin) => {
                const isUnlocked = stats.unlockedSkins.includes(skin.id);
                const isEquipped = stats.skin === skin.id;
                const canAffordCoins = stats.coins >= skin.priceCoins;
                const canAffordPearls = stats.pearls >= skin.pricePearls;
                const canBuy = (skin.priceCoins > 0 ? canAffordCoins : true) && (skin.pricePearls > 0 ? canAffordPearls : true);

                return (
                  <div
                    key={skin.id}
                    className={`p-3 rounded-lg border-2 flex flex-col justify-between transition relative ${
                      isEquipped
                        ? 'bg-[#172554] border-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                        : isUnlocked
                        ? 'bg-[#1a1b30] border-[#4338ca]'
                        : 'bg-[#111222] border-[#27273a]'
                    }`}
                  >
                    {skin.isVipOnly && (
                      <div className="absolute top-2 right-2 bg-[#eab308] text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        VIP
                      </div>
                    )}

                    <div>
                      {/* Color Preview Swatch */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-7 h-7 rounded-full border-2 border-white/60 shadow"
                          style={{
                            background: `linear-gradient(135deg, ${skin.primaryColor}, ${skin.secondaryColor})`,
                          }}
                        />
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">
                            {skin.name}
                          </div>
                          <div className="text-[10px] font-['DotGothic16'] text-[#a5b4fc]">
                            {skin.jpName}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#cbd5e1] mb-3 leading-relaxed">
                        {skin.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#312e81] flex items-center justify-between">
                      {isUnlocked ? (
                        isEquipped ? (
                          <div className="flex items-center gap-1 text-[#38bdf8] text-xs font-mono font-bold">
                            <Check className="w-4 h-4" /> ВЫБРАН
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onEquipSkin(skin.id);
                              retroAudio.playBlip(750, 0.05);
                            }}
                            className="w-full py-1.5 px-3 bg-[#4338ca] hover:bg-[#4f46e5] text-white rounded text-xs font-mono font-bold transition"
                          >
                            НАДЕТЬ
                          </button>
                        )
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            {skin.priceCoins > 0 && (
                              <span className="text-[#facc15]">{skin.priceCoins} 🪙</span>
                            )}
                            {skin.pricePearls > 0 && (
                              <span className="text-[#f0abfc]">{skin.pricePearls} 🦪</span>
                            )}
                          </div>
                          <button
                            disabled={!canBuy}
                            onClick={() => {
                              onBuySkin(skin.id, skin.priceCoins, skin.pricePearls);
                              retroAudio.playCoin();
                            }}
                            className={`py-1.5 px-3 rounded text-xs font-mono font-bold transition ${
                              canBuy
                                ? 'bg-[#ca8a04] hover:bg-[#eab308] text-black shadow cursor-pointer'
                                : 'bg-[#27273a] text-[#64748b] cursor-not-allowed'
                            }`}
                          >
                            КУПИТЬ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(AQUARIUM_THEMES).map((thm) => {
                const isUnlocked = stats.unlockedThemes.includes(thm.id);
                const isEquipped = stats.theme === thm.id;
                const canAffordCoins = stats.coins >= thm.priceCoins;
                const canAffordPearls = stats.pearls >= thm.pricePearls;
                const canBuy = (thm.priceCoins > 0 ? canAffordCoins : true) && (thm.pricePearls > 0 ? canAffordPearls : true);

                return (
                  <div
                    key={thm.id}
                    className={`p-3 rounded-lg border-2 flex flex-col justify-between transition relative ${
                      isEquipped
                        ? 'bg-[#172554] border-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                        : isUnlocked
                        ? 'bg-[#1a1b30] border-[#4338ca]'
                        : 'bg-[#111222] border-[#27273a]'
                    }`}
                  >
                    {thm.isVipOnly && (
                      <div className="absolute top-2 right-2 bg-[#eab308] text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        VIP
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-7 h-7 rounded-md border-2 border-white/60 shadow"
                          style={{
                            background: `linear-gradient(135deg, ${thm.waterColor}, ${thm.sandColor})`,
                          }}
                        />
                        <div>
                          <div className="text-xs font-bold text-white leading-tight">
                            {thm.name}
                          </div>
                          <div className="text-[10px] font-['DotGothic16'] text-[#a5b4fc]">
                            {thm.jpName}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#cbd5e1] mb-3 leading-relaxed">
                        {thm.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#312e81] flex items-center justify-between">
                      {isUnlocked ? (
                        isEquipped ? (
                          <div className="flex items-center gap-1 text-[#38bdf8] text-xs font-mono font-bold">
                            <Check className="w-4 h-4" /> АКТИВНА
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              onEquipTheme(thm.id);
                              retroAudio.playBlip(750, 0.05);
                            }}
                            className="w-full py-1.5 px-3 bg-[#4338ca] hover:bg-[#4f46e5] text-white rounded text-xs font-mono font-bold transition"
                          >
                            ПРИМЕНИТЬ
                          </button>
                        )
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            {thm.priceCoins > 0 && (
                              <span className="text-[#facc15]">{thm.priceCoins} 🪙</span>
                            )}
                            {thm.pricePearls > 0 && (
                              <span className="text-[#f0abfc]">{thm.pricePearls} 🦪</span>
                            )}
                          </div>
                          <button
                            disabled={!canBuy}
                            onClick={() => {
                              onBuyTheme(thm.id, thm.priceCoins, thm.pricePearls);
                              retroAudio.playCoin();
                            }}
                            className={`py-1.5 px-3 rounded text-xs font-mono font-bold transition ${
                              canBuy
                                ? 'bg-[#ca8a04] hover:bg-[#eab308] text-black shadow cursor-pointer'
                                : 'bg-[#27273a] text-[#64748b] cursor-not-allowed'
                            }`}
                          >
                            КУПИТЬ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0d0e1a] border-t-2 border-[#312e81] text-center text-[10px] font-mono text-[#94a3b8]">
          Зарабатывайте монеты в мини-играх «Денди» или получите VIP жемчужины через Донат!
        </div>

      </div>
    </div>
  );
};
