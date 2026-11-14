/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Check, Copy, ExternalLink, Heart, Trophy, Crown, Coffee } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xs select-none">
      <div className="bg-[#100d1e] border-4 border-[#c084fc] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-[0_0_40px_rgba(192,132,252,0.35)] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#581c87] via-[#9333ea] to-[#581c87] px-4 py-3 flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#eab308] text-black flex items-center justify-center shadow font-black text-sm">
              VIP
            </div>
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-[#fef08a] tracking-wider drop-shadow">
                ДОНАТ & VIP КЛУБ &apos;96
              </h2>
              <div className="font-['DotGothic16'] text-xs text-purple-200">
                スポンサーVIPシステム
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              retroAudio.playBlip(400, 0.04);
            }}
            className="bg-black/50 hover:bg-black text-white p-1 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b-2 border-[#4c1d95] bg-[#090714]">
          <button
            onClick={() => {
              setActiveTab('tiers');
              retroAudio.playBlip(550, 0.03);
            }}
            className={`flex-1 py-2 font-['Press_Start_2P'] text-[10px] sm:text-xs transition ${
              activeTab === 'tiers'
                ? 'bg-[#2e1065] text-[#f0abfc] border-b-2 border-[#c084fc]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            ⭐ ТАРИФЫ & ПРИВИЛЕГИИ
          </button>
          <button
            onClick={() => {
              setActiveTab('methods');
              retroAudio.playBlip(550, 0.03);
            }}
            className={`flex-1 py-2 font-['Press_Start_2P'] text-[10px] sm:text-xs transition ${
              activeTab === 'methods'
                ? 'bg-[#2e1065] text-[#f0abfc] border-b-2 border-[#c084fc]'
                : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            💳 РЕКВИЗИТЫ ОПЛАТЫ
          </button>
        </div>

        {/* Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'tiers' ? (
            <>
              {/* Promo banner */}
              <div className="bg-[#1f113a] border-2 border-[#a855f7] rounded-xl p-3 flex items-center gap-3">
                <Crown className="w-10 h-10 text-[#facc15] shrink-0 animate-pulse" />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDemoActivate(tier);
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#eab308] to-[#f59e0b] hover:from-[#facc15] hover:to-[#eab308] text-black font-['Press_Start_2P'] text-[9px] tracking-wider font-bold shadow transition cursor-pointer active:scale-95"
                        >
                          ПОДДЕРЖАТЬ
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
