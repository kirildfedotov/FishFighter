/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Check, Copy, Crown } from 'lucide-react';
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
  stats,
  onClose,
  onApplyDonation,
}) => {
  const [selectedTier, setSelectedTier] = useState<DonationTier>(DONATION_TIERS[1]); // Default to Patron
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
    
    // Celebratory Confetti explosion!
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/85 select-none">
      <div className="arcade-panel border-4 border-[#c084fc] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#1c1033] px-4 py-3 flex items-center justify-between border-b-2 border-[#c084fc]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-[#eab308] border-2 border-[#fef08a] text-black flex items-center justify-center shadow font-black text-xs">
              VIP
            </div>
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-[#fef08a] tracking-wide">
                VIP КЛУБ & ПОДДЕРЖКА
              </h2>
              <div className="text-[11px] font-mono text-purple-200">
                Корона для рыбки, золотые темы и бонус x2
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              retroAudio.playBlip(400, 0.04);
            }}
            aria-label="Закрыть VIP клуб"
            className="arcade-btn bg-[#272744] hover:bg-[#383862] border-[#a855f7] text-white p-1.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Tab switcher */}
        <div className="grid grid-cols-2 gap-2 p-2.5 border-b-2 border-[#4c1d95] bg-[#0b0918]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('tiers');
              retroAudio.playBlip(550, 0.03);
            }}
            className={`arcade-btn py-2 px-3 text-xs ${
              activeTab === 'tiers'
                ? 'bg-[#c084fc] border-[#f3e8ff] text-black'
                : 'bg-[#171230] border-[#4c1d95] text-[#cbd5e1] hover:border-[#a855f7]'
            }`}
          >
            ⭐ Тарифы VIP
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('methods');
              retroAudio.playBlip(550, 0.03);
            }}
            className={`arcade-btn py-2 px-3 text-xs ${
              activeTab === 'methods'
                ? 'bg-[#c084fc] border-[#f3e8ff] text-black'
                : 'bg-[#171230] border-[#4c1d95] text-[#cbd5e1] hover:border-[#a855f7]'
            }`}
          >
            💳 Реквизиты оплаты
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'tiers' ? (
            <>
              {/* Promo banner */}
              <div className="bg-[#1f113a] border-2 border-[#a855f7] rounded-xl p-3 flex items-center gap-3">
                <Crown className="w-10 h-10 text-[#facc15] shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-[#fef08a] block">
                    Поддержите развитие проекта и получите эксклюзивный статус!
                  </span>
                  <span className="text-[#d8b4fe]">
                    Донат открывает золотую корону на 3D рыбке, уникальные фоны, x2 монет и статус Патрона навсегда.
                  </span>
                </div>
              </div>

              {/* Tiers List */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {DONATION_TIERS.map((tier) => {
                  const isSelected = selectedTier.id === tier.id;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => {
                        setSelectedTier(tier);
                        retroAudio.playBlip(600, 0.03);
                      }}
                      className={`p-3 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition relative ${
                        isSelected
                          ? 'bg-[#2e1065] border-[#facc15] shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-[1.01]'
                          : 'bg-[#150f28] border-[#4c1d95] hover:border-[#9333ea]'
                      }`}
                    >
                      {tier.isPopular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#f59e0b] text-black font-black text-[9px] px-2 py-0.5 rounded-full shadow border border-black uppercase tracking-wider">
                          Хит продаж
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-['Press_Start_2P'] text-[#f0abfc] mb-1">
                          {tier.titleBadge}
                        </div>
                        <div className="text-base sm:text-lg font-black text-white mb-2">
                          {tier.priceRub} ₽ <span className="text-xs text-[#94a3b8] font-normal font-mono">(${tier.priceUsd})</span>
                        </div>

                        <p className="text-[11px] text-[#cbd5e1] mb-2 leading-relaxed">
                          {tier.description}
                        </p>

                        <div className="space-y-1 my-2 border-t border-[#4c1d95] pt-2">
                          {tier.benefits.map((b, i) => (
                            <div key={i} className="text-[10px] text-[#e9d5ff] flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-[#facc15] shrink-0" />
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#4c1d95]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDemoActivate(tier);
                          }}
                          className="arcade-btn w-full py-2 px-3 bg-[#eab308] hover:bg-[#facc15] border-[#fef08a] text-black text-xs"
                        >
                          Активировать
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instant Test Activation Notice */}
              <div className="p-3 bg-[#171329] rounded-lg border border-[#6b21a8] flex items-center justify-between gap-3">
                <div className="text-[11px] text-[#c084fc]">
                  ✨ Кнопка «ПОДДЕРЖАТЬ» сразу активирует выбранный VIP-пакет (бонусные жемчужины, монеты и золотой статус), чтобы вы могли протестировать все возможности прямо сейчас!
                </div>
              </div>
            </>
          ) : (
            /* Methods Tab */
            <div className="space-y-3">
              <p className="text-xs text-[#d8b4fe]">
                Если вы хотите реально поддержать автора проекта, вы можете использовать следующие реквизиты:
              </p>

              {/* SBP / Card */}
              <div className="p-3 bg-[#19142f] border border-[#7e22ce] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    💳 Банковская карта / СБП (Россия)
                  </div>
                  <div className="text-xs font-mono text-[#facc15] mt-1">
                    +7 (999) 000-00-00 (Т-Банк / Сбер)
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('+79990000000', 'sbp')}
                  className="px-3 py-1.5 bg-[#4c1d95] hover:bg-[#6b21a8] text-white rounded text-xs font-mono flex items-center gap-1 transition"
                >
                  {copiedKey === 'sbp' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'sbp' ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>

              {/* Boosty / CloudTips */}
              <div className="p-3 bg-[#19142f] border border-[#7e22ce] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    ☕ Boosty / CloudTips (Любые карты мира)
                  </div>
                  <div className="text-xs font-mono text-[#93c5fd] mt-1">
                    https://boosty.to/betta_tamagotchi
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('https://boosty.to/betta_tamagotchi', 'boosty')}
                  className="px-3 py-1.5 bg-[#4c1d95] hover:bg-[#6b21a8] text-white rounded text-xs font-mono flex items-center gap-1 transition"
                >
                  {copiedKey === 'boosty' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'boosty' ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>

              {/* Crypto USDT / TON */}
              <div className="p-3 bg-[#19142f] border border-[#7e22ce] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    💎 USDT (TRC-20) / TON
                  </div>
                  <div className="text-xs font-mono text-[#a7f3d0] mt-1 truncate max-w-[220px] sm:max-w-xs">
                    TYh6zK2b7bV4m9KqP1sD7uVw8zY3rX8nLq
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard('TYh6zK2b7bV4m9KqP1sD7uVw8zY3rX8nLq', 'crypto')}
                  className="px-3 py-1.5 bg-[#4c1d95] hover:bg-[#6b21a8] text-white rounded text-xs font-mono flex items-center gap-1 transition"
                >
                  {copiedKey === 'crypto' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'crypto' ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>

              {/* Custom amount */}
              <div className="p-3 bg-[#150f28] border border-[#6b21a8] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-[#cbd5e1]">
                  Произвольная сумма на кофе автору:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-24 bg-[#0a0715] border border-[#9333ea] rounded px-2 py-1 text-xs font-mono text-[#fde047] text-center"
                    placeholder="Рубли"
                  />
                  <span className="text-xs font-mono">₽</span>
                  <button
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
                        titleBadge: '💖 Спонсор',
                        description: `Донат на сумму ${amount}₽`,
                        benefits: [`+${Math.round(amount * 0.7)} жемчужин`, `+${amount * 12} монет`],
                      });
                    }}
                    className="px-3 py-1.5 bg-[#eab308] hover:bg-[#facc15] text-black font-bold rounded text-xs transition"
                  >
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#080512] border-t-2 border-[#4c1d95] flex items-center justify-between text-[11px] font-mono text-[#a855f7]">
          <span>© 1996 FAMICOM BETTA SYSTEM</span>
          <span className="text-[#facc15] font-bold">СПАСИБО ЗА ПОДДЕРЖКУ! Arigatou!</span>
        </div>

      </div>
    </div>
  );
};
