/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Utensils,
  Droplets,
  Eye,
  Gamepad2,
  ShoppingBag,
  Crown,
  X,
} from 'lucide-react';
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

  const actions = [
    {
      id: 'feed',
      label: 'Покормить',
      hint: 'Выбрать корм',
      icon: Utensils,
      accentBar: 'bg-[#38bdf8]',
      borderColor: showFoodMenu ? 'border-[#38bdf8] bg-[#1b2952]' : 'border-[#3b82f6]/80 hover:border-[#60a5fa]',
      iconColor: 'text-[#7dd3fc]',
      onClick: () => {
        setShowFoodMenu((prev) => !prev);
        retroAudio.playBlip(600, 0.05);
      },
    },
    {
      id: 'clean',
      label: 'Почистить',
      hint: 'Вода 100%',
      icon: Droplets,
      accentBar: 'bg-[#10b981]',
      borderColor: 'border-[#10b981]/80 hover:border-[#34d399]',
      iconColor: 'text-[#6ee7b7]',
      onClick: () => {
        onClean();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'mirror',
      label: 'Зеркало',
      hint: 'Кураж рыбки',
      icon: Eye,
      accentBar: 'bg-[#d946ef]',
      borderColor: 'border-[#d946ef]/80 hover:border-[#f0abfc]',
      iconColor: 'text-[#f0abfc]',
      onClick: () => {
        onOpenMirror();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'minigame',
      label: 'Игра Денди',
      hint: 'Заработать 🪙',
      icon: Gamepad2,
      accentBar: 'bg-[#ef4444]',
      borderColor: 'border-[#ef4444]/80 hover:border-[#f87171]',
      iconColor: 'text-[#fca5a5]',
      onClick: () => {
        onOpenMiniGame();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'shop',
      label: 'Магазин',
      hint: 'Скины и декор',
      icon: ShoppingBag,
      accentBar: 'bg-[#eab308]',
      borderColor: 'border-[#eab308]/90 hover:border-[#fde047]',
      iconColor: 'text-[#fde047]',
      onClick: () => {
        onOpenShop();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'donate',
      label: 'VIP Донат',
      hint: 'Корона и x2',
      icon: Crown,
      accentBar: 'bg-[#a855f7]',
      borderColor: 'border-[#a855f7]/85 hover:border-[#d8b4fe]',
      iconColor: 'text-[#e9d5ff]',
      badge: 'VIP',
      onClick: () => {
        onOpenDonate();
        setShowFoodMenu(false);
      },
    },
  ];

  return (
    <div
      className={`absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[96%] max-w-[880px] pointer-events-auto transition-transform duration-300 ${
        isCollapsed ? 'translate-y-[calc(100%-26px)]' : 'translate-y-0'
      }`}
    >
      {/* Unified Collapse Toggle Tab */}
      <div className="flex justify-center -mb-[2px]">
        <button
          type="button"
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            setShowFoodMenu(false);
            retroAudio.playBlip(500, 0.04);
          }}
          className="bg-[#12152e] hover:bg-[#1c2046] border-t-2 border-x-2 border-[#4338ca] text-[#c7d2fe] px-4 py-1 rounded-t-md text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? 'ОТКРЫТЬ ПАНЕЛЬ' : 'СКРЫТЬ ПАНЕЛЬ'}</span>
        </button>
      </div>

      {/* Main Dock Frame */}
      <div className="arcade-panel p-2 sm:p-2.5 relative">
        
        {/* Floating Food Selector Tray */}
        {showFoodMenu && !isCollapsed && (
          <div className="arcade-panel border-[#38bdf8] absolute bottom-full mb-2 left-0 sm:left-2 p-3 z-40 w-[265px] sm:w-[300px]">
            <div className="flex items-center justify-between border-b border-[#312e81] pb-2 mb-2">
              <span className="font-['Press_Start_2P'] text-[10px] text-[#7dd3fc]">
                ВЫБЕРИТЕ КОРМ
              </span>
              <button
                type="button"
                onClick={() => setShowFoodMenu(false)}
                aria-label="Закрыть меню корма"
                className="text-[#94a3b8] hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {FOOD_ITEMS.map((food) => {
                const canAfford = stats.coins >= food.priceCoins;
                return (
                  <button
                    type="button"
                    key={food.id}
                    disabled={!canAfford}
                    onClick={() => {
                      onFeed(food.id);
                      setShowFoodMenu(false);
                    }}
                    className={`arcade-btn w-full justify-between px-2.5 py-2 text-left ${
                      canAfford
                        ? 'bg-[#161a3b] hover:bg-[#232959] border-[#38bdf8]/75 text-white'
                        : 'bg-[#121322] border-[#2e324d] text-[#64748b]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg shrink-0">{food.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight truncate">{food.name}</div>
                        <div className="text-[10px] font-normal text-[#93c5fd]">
                          +{food.hungerRestore}% сытость
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono font-bold shrink-0 px-1.5 py-0.5 rounded bg-black/35 ${
                        food.priceCoins === 0 ? 'text-[#4ade80]' : 'text-[#fde047]'
                      }`}
                    >
                      {food.priceCoins > 0 ? `${food.priceCoins} 🪙` : 'Бесплатно'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Unified Action Grid: 3x2 on Phones, 6x1 on Tablets/Desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2.5">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={item.onClick}
                className={`arcade-btn relative flex-col py-2 px-1.5 sm:py-2.5 sm:px-2 bg-[#141733] hover:bg-[#1d224a] text-white overflow-hidden ${item.borderColor}`}
              >
                {/* Top Arcade Accent Stripe */}
                <span className={`absolute top-0 inset-x-0 h-[3px] ${item.accentBar}`} />

                {item.badge && (
                  <span className="absolute top-[3px] right-0 bg-[#eab308] text-black font-black text-[8px] px-1 py-0.2 rounded-bl">
                    {item.badge}
                  </span>
                )}

                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.iconColor} shrink-0`} />
                <span className="text-[11px] sm:text-xs font-bold leading-none tracking-tight text-white">
                  {item.label}
                </span>
                <span className="text-[9px] font-normal text-[#94a3b8] leading-none hidden sm:block">
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
