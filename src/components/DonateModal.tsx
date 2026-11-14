/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Check, Copy, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DONATION_TIERS } from '../services/storage';
import { DonationTier, FishStats } from '../types';
import { retroAudio } from '../services/retroAudio';

interface DonateModalProps {
  stats: FishStats;
  onClose: () => void;
  onApplyDonation: (tier: DonationTier) => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({
  onClose,
  onApplyDonation,
}) => {
  const [selectedTier, setSelectedTier] = useState<DonationTier>(DONATION_TIERS[1]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('300');
  const [activeTab, setActiveTab] = useState<'tiers' | 'methods'>('tiers');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    retroAudio.playBlip(900, 0.05);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDemoActivate = (tier: DonationTier) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 select-none">
      <div className="glass-panel w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Clean Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/35 text-fuchsia-300 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-white leading-tight">
                VIP Клуб и поддержка
              </h2>
              <p className="text-xs text-slate-400">
                Золотая корона, бонус x2 наград на арене и эксклюзивные темы
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              retroAudio.playBlip(400, 0.04);
            }}
            aria-label="Закрыть VIP клуб"
            className="ui-btn bg-slate-800/80 hover:bg-slate-700 border-white/15 text-slate-200 p-2 rounded-xl"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="px-4 pt-3 sm:px-6">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('tiers');
                retroAudio.playBlip(550, 0.03);
              }}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'tiers'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Тарифы VIP
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('methods');
                retroAudio.playBlip(550, 0.03);
              }}
              className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeTab === 'methods'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Реквизиты
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'tiers' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {DONATION_TIERS.map((tier) => {
                const isSelected = selectedTier.id === tier.id;
                return (
                  <div
                    key={tier.id}
                    onClick={() => {
                      setSelectedTier(tier);
                      retroAudio.playBlip(600, 0.03);
                    }}
                    className={`p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-900/95 border-amber-400/65 shadow-[0_0_25px_rgba(251,191,36,0.14)]'
                        : 'bg-slate-900/65 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-fuchsia-300">
                          {tier.titleBadge}
                        </span>
                        {tier.isPopular && (
                          <span className="text-[11px] font-semibold text-amber-300">
                            Популярный
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDemoActivate(tier);
                      }}
                      className="ui-btn w-full py-2.5 px-4 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 border-amber-200/50 text-slate-950 font-bold text-xs"
                    >
                      Активировать
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Прямые реквизиты для поддержки развития проекта:
              </p>

              <div className="p-3.5 bg-slate-900/75 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Банковская карта / СБП (Россия)
                  </div>
                  <div className="text-xs font-mono text-amber-300 mt-1">
                    +7 (999) 000-00-00 (Т-Банк / Сбер)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('+79990000000', 'sbp')}
                  className="ui-btn px-3 py-2 bg-slate-800 hover:bg-slate-700 border-white/15 text-white text-xs"
                >
                  {copiedKey === 'sbp' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'sbp' ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-900/75 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-white">
                    Boosty / CloudTips
                  </div>
                  <div className="text-xs font-mono text-sky-300 mt-1">
                    https://boosty.to/betta_tamagotchi
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('https://boosty.to/betta_tamagotchi', 'boosty')}
                  className="ui-btn px-3 py-2 bg-slate-800 hover:bg-slate-700 border-white/15 text-white text-xs"
                >
                  {copiedKey === 'boosty' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'boosty' ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-900/75 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">
                    USDT (TRC-20) / TON
                  </div>
                  <div className="text-xs font-mono text-emerald-300 mt-1 truncate max-w-[220px] sm:max-w-xs">
                    TYh6zK2b7bV4m9KqP1sD7uVw8zY3rX8nLq
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard('TYh6zK2b7bV4m9KqP1sD7uVw8zY3rX8nLq', 'crypto')}
                  className="ui-btn px-3 py-2 bg-slate-800 hover:bg-slate-700 border-white/15 text-white text-xs shrink-0"
                >
                  {copiedKey === 'crypto' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'crypto' ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  Произвольная поддержка проекта:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-24 bg-slate-950 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-mono text-amber-300 text-center outline-none focus:border-cyan-400"
                    placeholder="Рубли"
                  />
                  <span className="text-xs font-mono text-slate-400">₽</span>
                  <button
                    type="button"
                    onClick={() => {
                      const amount = parseInt(customAmount) || 100;
                      handleDemoActivate({
                        id: 'custom',
                        name: `Донат ${amount}₽`,
                        jpName: 'カスタム寄付',
                        priceRub: amount,
                        priceUsd: Math.round(amount / 80),
                        pearlsAwarded: Math.round(amount * 0.7),
                        coinsAwarded: amount * 12,
                        titleBadge: 'Спонсор',
                        description: `Донат на сумму ${amount}₽`,
                        benefits: [`+${Math.round(amount * 0.7)} жемчужин`, `+${amount * 12} монет`],
                      });
                    }}
                    className="ui-btn px-3.5 py-2 bg-amber-400 hover:bg-amber-300 border-amber-200/40 text-slate-950 font-bold text-xs"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
