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
  Swords,
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
  onEnterFighter: () => void;
  onOpenShop: () => void;
  onOpenDonate: () => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  stats,
  onFeed,
  onClean,
  onOpenMirror,
  onEnterFighter,
  onOpenShop,
  onOpenDonate,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFoodMenu, setShowFoodMenu] = useState(false);

  const actions = [
    {
      id: 'feed',
      label: 'Покормить',
      hint: 'Выбор корма',
      icon: Utensils,
      buttonStyle: showFoodMenu
        ? 'bg-sky-500/20 border-sky-400/60 text-white'
        : 'bg-slate-900/90 hover:bg-slate-800/95 border-white/10 hover:border-sky-400/50 text-slate-100',
      iconColor: 'text-sky-400',
      onClick: () => {
        setShowFoodMenu((prev) => !prev);
        retroAudio.playBlip(600, 0.05);
      },
    },
    {
      id: 'clean',
      label: 'Почистить',
      hint: 'Свежая вода',
      icon: Droplets,
      buttonStyle:
        'bg-slate-900/90 hover:bg-slate-800/95 border-white/10 hover:border-emerald-400/50 text-slate-100',
      iconColor: 'text-emerald-400',
      onClick: () => {
        onClean();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'mirror',
      label: 'Зеркало',
      hint: 'Тренировка',
      icon: Eye,
      buttonStyle:
        'bg-slate-900/90 hover:bg-slate-800/95 border-white/10 hover:border-violet-400/50 text-slate-100',
      iconColor: 'text-violet-400',
      onClick: () => {
        onOpenMirror();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'shop',
      label: 'Магазин',
      hint: 'Окрасы и темы',
      icon: ShoppingBag,
      buttonStyle:
        'bg-slate-900/90 hover:bg-slate-800/95 border-white/10 hover:border-amber-400/50 text-slate-100',
      iconColor: 'text-amber-400',
      onClick: () => {
        onOpenShop();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'donate',
      label: 'VIP Клуб',
      hint: 'Корона и x2',
      icon: Crown,
      buttonStyle:
        'bg-slate-900/90 hover:bg-slate-800/95 border-white/10 hover:border-fuchsia-400/50 text-slate-100',
      iconColor: 'text-fuchsia-400',
      onClick: () => {
        onOpenDonate();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'fighter',
      label: 'FIGHTER',
      hint: 'Арена PvP',
      icon: Swords,
      buttonStyle:
        'bg-gradient-to-br from-rose-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 border-rose-300/50 text-white shadow-[0_6px_22px_rgba(244,63,94,0.38)]',
      iconColor: 'text-white',
      isFeatured: true,
      onClick: () => {
        setShowFoodMenu(false);
        onEnterFighter();
      },
    },
  ];

  return (
    <div
      className={`absolute bottom-2.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-[860px] pointer-events-auto transition-transform duration-300 ${
        isCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
      }`}
    >
      {/* Sleek Collapse Toggle */}
      <div className="flex justify-center -mb-px">
        <button
          type="button"
          onClick={() => {
            setIsCollapsed(!isCollapsed);
            setShowFoodMenu(false);
            retroAudio.playBlip(500, 0.04);
          }}
          className="bg-[#0b1120]/95 hover:bg-slate-800 border-t border-x border-white/15 text-slate-300 hover:text-white px-4 py-1 rounded-t-xl text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? 'Открыть панель' : 'Скрыть'}</span>
        </button>
      </div>

      {/* Modern Floating Control Dock */}
      <div className="glass-panel p-2 sm:p-2.5 relative">
        {/* Popover Food Selector */}
        {showFoodMenu && !isCollapsed && (
          <div className="glass-panel border-sky-400/30 absolute bottom-full mb-2.5 left-0 sm:left-2 p-3.5 z-40 w-[275px] sm:w-[310px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
              <span className="font-display font-bold text-sm text-white">
                Выберите корм
              </span>
              <button
                type="button"
                onClick={() => setShowFoodMenu(false)}
                aria-label="Закрыть меню корма"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
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
                    className={`ui-btn w-full justify-between px-3 py-2.5 text-left ${
                      canAfford
                        ? 'bg-slate-900/90 hover:bg-slate-800 border-white/10 hover:border-sky-400/50 text-white'
                        : 'bg-slate-900/50 border-white/5 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{food.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold leading-tight truncate">{food.name}</div>
                        <div className="text-[11px] font-normal text-sky-300/90">
                          +{food.hungerRestore}% сытость
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold shrink-0 ${
                        food.priceCoins === 0 ? 'text-emerald-400' : 'text-amber-300'
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

        {/* Responsive 3x2 Mobile / 6x1 Desktop Action Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={item.onClick}
                className={`ui-btn flex-col py-2.5 px-2 sm:py-3 sm:px-2.5 ${item.buttonStyle}`}
              >
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.iconColor} shrink-0`} />
                <span
                  className={`text-xs sm:text-[13px] leading-none whitespace-nowrap ${
                    item.isFeatured ? 'font-display font-extrabold tracking-wide' : 'font-semibold'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`text-[10px] leading-none hidden sm:block font-normal ${
                    item.isFeatured ? 'text-rose-100/90' : 'text-slate-400'
                  }`}
                >
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
