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
}

export const ActionDock: React.FC<ActionDockProps> = ({
  stats,
  onFeed,
  onClean,
  onOpenMirror,
  onEnterFighter,
  onOpenShop,
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
        ? 'glass-btn-sky'
        : 'glass-btn hover:border-sky-300/55',
      iconWrap: 'bg-sky-400/15 border-sky-300/30 backdrop-blur-sm',
      iconColor: 'text-sky-300',
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
        'glass-btn hover:border-emerald-300/55',
      iconWrap: 'bg-emerald-400/15 border-emerald-300/30 backdrop-blur-sm',
      iconColor: 'text-emerald-300',
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
        'glass-btn hover:border-violet-300/55',
      iconWrap: 'bg-violet-400/15 border-violet-300/30 backdrop-blur-sm',
      iconColor: 'text-violet-300',
      onClick: () => {
        onOpenMirror();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'shop',
      label: 'Магазин',
      hint: 'Окрасы и ₽',
      icon: ShoppingBag,
      buttonStyle:
        'glass-btn hover:border-amber-300/55',
      iconWrap: 'bg-amber-400/15 border-amber-300/30 backdrop-blur-sm',
      iconColor: 'text-amber-300',
      onClick: () => {
        onOpenShop();
        setShowFoodMenu(false);
      },
    },
    {
      id: 'fighter',
      label: 'FIGHTER',
      hint: 'Арена PvP',
      icon: Swords,
      buttonStyle:
        'col-span-2 sm:col-span-1 glass-btn-rose',
      iconWrap: 'bg-white/20 border-white/35 backdrop-blur-sm',
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
      className={`absolute bottom-2.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 w-[95%] max-w-[780px] pointer-events-auto transition-transform duration-300 ${
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
          className="bg-slate-900/45 backdrop-blur-md hover:bg-white/15 border-t border-x border-white/20 text-slate-200 hover:text-white px-4 py-1 rounded-t-xl text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? 'Открыть панель' : 'Скрыть'}</span>
        </button>
      </div>

      {/* Modern Floating Control Dock */}
      <div className="glass-panel p-2 sm:p-2.5 relative">
        {/* Popover Food Selector */}
        {showFoodMenu && !isCollapsed && (
          <div className="glass-panel border-sky-400/35 absolute bottom-full mb-2.5 left-0 sm:left-2 p-3.5 z-40 w-[280px] sm:w-[316px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
              <span className="font-display font-bold text-sm text-white">
                Выберите корм
              </span>
              <button
                type="button"
                onClick={() => setShowFoodMenu(false)}
                aria-label="Закрыть меню корма"
                className="ui-btn glass-btn p-1 rounded-lg"
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
                        ? 'glass-btn hover:border-sky-300/55'
                        : 'glass-btn text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-lg shrink-0">
                        {food.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold leading-tight truncate">{food.name}</div>
                        <div className="text-[11px] font-normal text-sky-300/90 tabular-nums">
                          +{food.hungerRestore}% сытость
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold shrink-0 tabular-nums ${
                        food.priceCoins === 0 ? 'text-emerald-300' : 'text-amber-300'
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

        {/* Responsive 2x2+1 Mobile / 5x1 Desktop Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={item.onClick}
                className={`ui-btn flex-col py-2 px-2 sm:py-2.5 sm:px-2.5 ${item.buttonStyle}`}
              >
                <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center ${item.iconWrap}`}>
                  <Icon className={`w-4 h-4 ${item.iconColor} shrink-0`} />
                </span>
                <span
                  className={`text-xs sm:text-[13px] leading-none whitespace-nowrap ${
                    item.isFeatured ? 'font-display font-extrabold tracking-wide' : 'font-semibold'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`text-[10px] leading-none hidden sm:block font-normal ${
                    item.isFeatured ? 'text-rose-100/95' : 'text-slate-400'
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
