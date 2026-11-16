/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, ShoppingBag, Copy, Crown, CreditCard } from 'lucide-react';
import confetti from 'canvas-confetti';
import { FISH_SKINS, AQUARIUM_THEMES, DONATION_TIERS } from '../services/storage';
import { FishStats, FishColorPalette, AquariumThemeId, DonationTier } from '../types';
import { retroAudio } from '../services/retroAudio';

interface ShopModalProps {
  stats: FishStats;
  initialTab?: 'skins' | 'themes' | 'donate';
  onClose: () => void;
  onBuySkin: (skinId: FishColorPalette, priceCoins: number) => void;
  onEquipSkin: (skinId: FishColorPalette) => void;
  onBuyTheme: (themeId: AquariumThemeId, priceCoins: number) => void;
  onEquipTheme: (themeId: AquariumThemeId) => void;
  onApplyDonation: (tier: DonationTier) => void;
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
  initialTab = 'skins',
  onClose,
  onBuySkin,
  onEquipSkin,
  onBuyTheme,
  onEquipTheme,
  onApplyDonation,
}) => {
  const [activeTab, setActiveTab] = useState<'skins' | 'themes' | 'donate'>(initialTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('300');

  const skinsList = Object.values(FISH_SKINS);
  const themesList = Object.values(AQUARIUM_THEMES);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    retroAudio.playBlip(900, 0.05);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const triggerDonation = (tier: DonationTier) => {
    retroAudio.playFanfare();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#f59e0b', '#ec4899', '#38bdf8'],
      });
    } catch {}
    onApplyDonation(tier);
  };

  const formatPriceLabel = (priceCoins: number): string => {
    if (priceCoins > 0) return `${priceCoins} 🪙`;
    return 'Бесплатно';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/55 backdrop-blur-sm select-none">
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
                Окрасы, 3D-диорамы и донат-наборы за реальные деньги
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 backdrop-blur-md border border-amber-300/30 text-xs font-mono font-bold">
              <span className="text-amber-200 tabular-nums">🪙 {stats.coins}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                retroAudio.playBlip(400, 0.04);
              }}
              aria-label="Закрыть магазин"
              className="ui-btn glass-btn p-2 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modern Glass Segmented 3-Tab Switcher */}
        <div className="px-4 pt-3 sm:px-6">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/[0.05] backdrop-blur-md border border-white/15 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('skins');
                retroAudio.playBlip(550, 0.03);
              }}
              className={`ui-btn py-2 px-2.5 rounded-lg text-xs sm:text-sm border ${
                activeTab === 'skins'
                  ? 'glass-btn border-white/35 text-white'
                  : 'bg-transparent border-transparent shadow-none text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span>Окрасы</span>
              <span className="text-[11px] opacity-70 tabular-nums hidden sm:inline">{skinsList.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('themes');
                retroAudio.playBlip(550, 0.03);
              }}
              className={`ui-btn py-2 px-2.5 rounded-lg text-xs sm:text-sm border ${
                activeTab === 'themes'
                  ? 'glass-btn border-white/35 text-white'
                  : 'bg-transparent border-transparent shadow-none text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <span>Аквариумы</span>
              <span className="text-[11px] opacity-70 tabular-nums hidden sm:inline">{themesList.length}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('donate');
                retroAudio.playBlip(640, 0.04);
              }}
              className={`ui-btn py-2 px-2.5 rounded-lg text-xs sm:text-sm border ${
                activeTab === 'donate'
                  ? 'glass-btn-amber font-bold'
                  : 'bg-transparent border-transparent shadow-none text-amber-300 hover:text-amber-200 hover:bg-amber-400/10'
              }`}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span>Донат ₽</span>
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
                const canBuy = stats.coins >= skin.priceCoins;
                const gradId = `shop_skin_${skin.id}`;

                return (
                  <div
                    key={skin.id}
                    className={`rounded-2xl border backdrop-blur-md flex flex-col justify-between overflow-hidden transition shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${
                      isEquipped
                        ? 'bg-cyan-500/10 border-cyan-300/65 shadow-[0_0_28px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(165,243,252,0.28)]'
                        : 'bg-white/[0.05] border-white/15 hover:border-white/30 hover:bg-white/[0.08]'
                    }`}
                  >
                    {/* Live Palette Betta Preview */}
                    <div
                      className="h-28 relative flex items-center justify-center px-4 border-b border-white/10 overflow-hidden"
                      style={{
                        backgroundImage: `radial-gradient(circle at 42% 50%, ${skin.primaryColor}38 0%, #070b15 78%), linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px)`,
                        backgroundSize: '100% 100%, 24px 24px, 24px 24px',
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
                            className="ui-btn glass-btn-cyan w-full py-2.5 px-4 text-xs"
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
                            className="ui-btn glass-btn w-full py-2.5 px-4 text-xs"
                          >
                            Выбрать окрас
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            onBuySkin(skin.id, skin.priceCoins);
                            retroAudio.playCoin();
                          }}
                          className={`ui-btn w-full py-2.5 px-4 text-xs ${
                            canBuy
                              ? 'glass-btn-amber font-bold'
                              : 'glass-btn text-slate-400'
                          }`}
                        >
                          {`Купить · ${formatPriceLabel(skin.priceCoins)}`}
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
                const canBuy = stats.coins >= thm.priceCoins;
                const icon = THEME_BADGE_ICON[thm.id] || '🌊';

                return (
                  <div
                    key={thm.id}
                    className={`rounded-2xl border backdrop-blur-md flex flex-col justify-between overflow-hidden transition shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${
                      isEquipped
                        ? 'bg-cyan-500/10 border-cyan-300/65 shadow-[0_0_28px_rgba(34,211,238,0.18),inset_0_1px_0_rgba(165,243,252,0.28)]'
                        : 'bg-white/[0.05] border-white/15 hover:border-white/30 hover:bg-white/[0.08]'
                    }`}
                  >
                    {/* Aquarium Panorama Preview */}
                    <div
                      className="h-28 relative flex flex-col justify-between p-3.5 overflow-hidden border-b border-white/10"
                      style={{
                        background: `linear-gradient(180deg, ${thm.waterColor} 0%, ${thm.fogColor} 72%, ${thm.sandColor} 100%)`,
                      }}
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-14 pointer-events-none opacity-35"
                        style={{
                          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.4) 0%, transparent 75%)',
                        }}
                      />
                      <div className="relative z-10 flex items-center justify-between text-[11px] font-medium">
                        <span className="text-amber-300 font-semibold drop-shadow">
                          {thm.isVipOnly ? 'VIP-диорама' : ''}
                        </span>
                        <span className={isEquipped ? 'text-cyan-200 font-semibold drop-shadow' : 'text-slate-200/85 drop-shadow'}>
                          {isEquipped ? 'Активна' : isUnlocked ? 'В коллекции' : ''}
                        </span>
                      </div>

                      <div className="relative z-10 flex items-end justify-between">
                        <span className="text-3xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]">{icon}</span>
                        <span className="text-[11px] font-medium text-white/85 drop-shadow">
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
                            className="ui-btn glass-btn-cyan w-full py-2.5 px-4 text-xs"
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
                            className="ui-btn glass-btn w-full py-2.5 px-4 text-xs"
                          >
                            Установить тему
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            onBuyTheme(thm.id, thm.priceCoins);
                            retroAudio.playCoin();
                          }}
                          className={`ui-btn w-full py-2.5 px-4 text-xs ${
                            canBuy
                              ? 'glass-btn-amber font-bold'
                              : 'glass-btn text-slate-400'
                          }`}
                        >
                          {`Купить · ${formatPriceLabel(thm.priceCoins)}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'donate' && (
            <div className="space-y-5">
              {/* Real-money Packs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {DONATION_TIERS.map((tier) => (
                  <div
                    key={tier.id}
                    className={`p-4 rounded-2xl border backdrop-blur-md flex flex-col justify-between transition shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${
                      tier.isPopular
                        ? 'bg-gradient-to-b from-amber-500/18 via-slate-900/45 to-slate-950/60 border-amber-300/65 shadow-[0_0_28px_rgba(251,191,36,0.18)]'
                        : 'bg-white/[0.05] border-white/15 hover:border-white/30 hover:bg-white/[0.08]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-amber-300">
                          {tier.titleBadge}
                        </span>
                        {tier.isPopular && (
                          <span className="text-[11px] font-bold text-amber-200">
                            Хит
                          </span>
                        )}
                      </div>

                      <div className="font-display text-2xl font-extrabold text-white mb-1.5 tabular-nums">
                        {tier.priceRub} ₽{' '}
                        <span className="text-xs text-slate-400 font-normal font-mono">
                          (${tier.priceUsd})
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                        {tier.description}
                      </p>

                      <ul className="space-y-1.5 border-t border-white/10 pt-3 mb-4">
                        {tier.benefits.map((b, i) => (
                          <li key={i} className="text-xs text-slate-200 flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => triggerDonation(tier)}
                      className="ui-btn glass-btn-amber w-full py-2.5 px-4 font-bold text-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Поддержать · {tier.priceRub} ₽</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Direct Payment Details & Custom Support */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="text-xs font-semibold text-slate-200">
                  Прямые реквизиты и произвольный донат
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-white/[0.05] backdrop-blur-md border border-white/15 rounded-xl flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">Карта / СБП (РФ)</div>
                      <div className="text-xs font-mono text-amber-300 mt-0.5 truncate">
                        +7 (999) 000-00-00
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('+79990000000', 'sbp')}
                      className="ui-btn glass-btn px-2.5 py-1.5 text-xs shrink-0"
                    >
                      {copiedKey === 'sbp' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'sbp' ? 'Скопировано' : 'Копия'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-white/[0.05] backdrop-blur-md border border-white/15 rounded-xl flex items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">USDT (TRC-20) / TON</div>
                      <div className="text-xs font-mono text-emerald-300 mt-0.5 truncate">
                        TYh6zK2b7bV4m9KqP1sD7uVw8zY3rX8nLq
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('TYh6zK2b7bV4m9KqP1sD7uVw8zY3rX8nLq', 'crypto')}
                      className="ui-btn glass-btn px-2.5 py-1.5 text-xs shrink-0"
                    >
                      {copiedKey === 'crypto' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'crypto' ? 'Скопировано' : 'Копия'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white/[0.05] backdrop-blur-md border border-white/15 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-300">
                    Произвольная сумма поддержки (начисляются монеты):
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={10}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-24 bg-slate-950/75 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-mono tabular-nums text-amber-300 text-center outline-none focus:border-cyan-400"
                      placeholder="300"
                    />
                    <span className="text-xs font-mono text-slate-400">₽</span>
                    <button
                      type="button"
                      onClick={() => {
                        const amount = Math.max(10, parseInt(customAmount, 10) || 100);
                        triggerDonation({
                          id: 'custom',
                          name: `Донат ${amount}₽`,
                          jpName: 'カスタム寄付',
                          priceRub: amount,
                          priceUsd: Number((amount / 80).toFixed(2)),
                          coinsAwarded: amount * 20,
                          titleBadge: 'Спонсор',
                          description: `Поддержка проекта на ${amount} ₽`,
                          benefits: [`+${amount * 20} монет`],
                        });
                      }}
                      className="ui-btn glass-btn-amber px-3.5 py-2 font-bold text-xs whitespace-nowrap"
                    >
                      Поддержать
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
