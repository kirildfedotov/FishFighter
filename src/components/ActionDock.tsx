/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, ShoppingBag, Gamepad2 } from 'lucide-react';
import { FOOD_ITEMS } from '../services/storage';
import { FoodType, FishStats } from '../types';
import { retroAudio } from '../services/retroAudio';

interface ActionDockProps {
  stats: FishStats;
  onFeed: (foodType: FoodType) => void;
  onClean: () => void;
  onOpenMirror: () => void;
  onOpenMiniGame: () => void;
  onOpenShop: () => void;
  onOpenDonate: () => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  stats,
  onFeed,
  onClean,
  onOpenMirror,
  onOpenMiniGame,
  onOpenShop,
  onOpenDonate,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFoodMenu, setShowFoodMenu] = useState(false);

  return (
    <div
      className={`absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[96%] max-w-[880px] pointer-events-auto transition-transform duration-300 ${
        isCollapsed ? 'translate-y-[calc(100%-24px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <div className="flex justify-center -mb-px">
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            retroAudio.playBlip(500, 0.04);
          }}
          className="bg-[#181a2e] hover:bg-[#252849] border-t-2 border-x-2 border-[#4338ca] text-[#c7d2fe] px-4 py-1 rounded-t-lg text-xs font-mono flex items-center gap-1.5 shadow-lg transition cursor-pointer"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span className="font-bold tracking-wider">
            {isCollapsed ? '▴ ПАНЕЛЬ УХОДА' : '▾ СКРЫТЬ'}
          </span>
        </button>
      </div>

      {/* Main Dock Container */}
      <div className="bg-[#0f111a]/95 border-2 border-[#4338ca] rounded-xl shadow-2xl p-2 sm:p-3 relative">
        
        {/* Floating Food Submenu */}
        {showFoodMenu && !isCollapsed && (
          <div className="absolute bottom-full mb-2 left-1 sm:left-3 bg-[#14162b] border-2 border-[#f59e0b] rounded-lg p-2.5 shadow-2xl flex flex-col gap-2 z-40 min-w-[220px] sm:min-w-[260px]">
            <div className="flex items-center justify-between border-b border-[#312e81] pb-1">
              <span className="text-[11px] font-['Press_Start_2P'] text-[#fde047]">
                ВЫБОР КОРМА
              </span>
              <button
                onClick={() => setShowFoodMenu(false)}
                className="text-[#94a3b8] hover:text-white text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              {FOOD_ITEMS.map((food) => {
                const canAfford = stats.coins >= food.priceCoins;
                return (
                  <button
                    key={food.id}
                    disabled={!canAfford}
                    onClick={() => {
                      onFeed(food.id);
                      setShowFoodMenu(false);
                    }}
                    className={`flex items-center justify-between p-1.5 rounded border text-left transition ${
                      canAfford
                        ? 'bg-[#1e1b4b] hover:bg-[#2e2b6b] border-[#4f46e5] text-white cursor-pointer'
                        : 'bg-[#181824] border-[#374151] text-[#6b7280] cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{food.icon}</span>
                      <div>
                        <div className="text-xs font-bold leading-tight">{food.name}</div>
                        <div className="text-[10px] text-[#93c5fd]">
                          +{food.hungerRestore}% сытость
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-[#facc15]">
                      {food.priceCoins > 0 ? `${food.priceCoins} 🪙` : 'Бесплатно'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button Grid */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-3">
          
          {/* 1. Feed */}
          <button
            onClick={() => {
              setShowFoodMenu(!showFoodMenu);
              retroAudio.playBlip(600, 0.05);
            }}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-lg bg-gradient-to-b from-[#1e3a8a] to-[#172554] border-2 border-[#3b82f6] hover:border-[#60a5fa] text-white shadow hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer group"
          >
            <span className="text-lg sm:text-2xl group-hover:scale-110 transition">🍱</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold mt-1 text-[#93c5fd]">
              Корм
            </span>
            <span className="text-[8px] text-[#60a5fa] hidden sm:inline">Хлопья / Мотыль</span>
          </button>

          {/* 2. Clean */}
          <button
            onClick={() => {
              onClean();
              setShowFoodMenu(false);
            }}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-lg bg-gradient-to-b from-[#065f46] to-[#022c22] border-2 border-[#10b981] hover:border-[#34d49a] text-white shadow hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer group"
          >
            <span className="text-lg sm:text-2xl group-hover:rotate-12 transition">🧼</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold mt-1 text-[#a7f3d0]">
              Чистка
            </span>
            <span className="text-[8px] text-[#34d399] hidden sm:inline">Стекло & Фильтр</span>
          </button>

          {/* 3. Mirror Flare */}
          <button
            onClick={() => {
              onOpenMirror();
              setShowFoodMenu(false);
            }}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-lg bg-gradient-to-b from-[#701a75] to-[#4a044e] border-2 border-[#d946ef] hover:border-[#f0abfc] text-white shadow hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer group"
          >
            <span className="text-lg sm:text-2xl group-hover:scale-110 transition">🪞</span>
            <span className="text-[10px] sm:text-xs font-mono font-bold mt-1 text-[#f5d0fe]">
              Зеркало
            </span>
            <span className="text-[8px] text-[#e879f9] hidden sm:inline">Кураж & Плавники</span>
          </button>

          {/* 4. Dendy Mini-game */}
          <button
            onClick={() => {
              onOpenMiniGame();
              setShowFoodMenu(false);
            }}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-lg bg-gradient-to-b from-[#991b1b] to-[#450a0a] border-2 border-[#ef4444] hover:border-[#f87171] text-white shadow hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer group"
          >
            <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#fca5a5] group-hover:scale-110 transition" />
            <span className="text-[10px] sm:text-xs font-mono font-bold mt-1 text-[#fecaca]">
              Денди
            </span>
            <span className="text-[8px] text-[#f87171] hidden sm:inline">8-Бит Игра</span>
          </button>

          {/* 5. Shop */}
          <button
            onClick={() => {
              onOpenShop();
              setShowFoodMenu(false);
            }}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-lg bg-gradient-to-b from-[#854d0e] to-[#451a03] border-2 border-[#eab308] hover:border-[#fde047] text-white shadow hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer group"
          >
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#fef08a] group-hover:scale-110 transition" />
            <span className="text-[10px] sm:text-xs font-mono font-bold mt-1 text-[#fef08a]">
              Магазин
            </span>
            <span className="text-[8px] text-[#facc15] hidden sm:inline">Скины & Темы</span>
          </button>

          {/* 6. VIP Donate & Support */}
          <button
            onClick={() => {
              onOpenDonate();
              setShowFoodMenu(false);
            }}
            className="flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-lg bg-gradient-to-b from-[#6b21a8] to-[#3b0764] border-2 border-[#c084fc] hover:border-[#e9d5ff] text-white shadow hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-[#eab308] text-black font-black text-[7px] px-1 py-0.2 rounded-bl">
              VIP
            </div>
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#f0abfc] group-hover:rotate-45 transition" />
            <span className="text-[10px] sm:text-xs font-mono font-bold mt-1 text-[#f0abfc]">
              Донат
            </span>
            <span className="text-[8px] text-[#d8b4fe] hidden sm:inline">VIP Статус</span>
          </button>

        </div>
      </div>
    </div>
  );
};
