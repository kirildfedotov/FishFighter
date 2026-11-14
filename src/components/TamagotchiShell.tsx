/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { retroAudio } from '../services/retroAudio';

interface TamagotchiShellProps {
  children: React.ReactNode;
  active: boolean;
  onButtonA: () => void;
  onButtonB: () => void;
  onButtonC: () => void;
}

export const TamagotchiShell: React.FC<TamagotchiShellProps> = ({
  children,
  active,
  onButtonA,
  onButtonB,
  onButtonC,
}) => {
  if (!active) {
    return <div className="relative w-full h-full overflow-hidden">{children}</div>;
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-[#07080f] p-2 sm:p-6 overflow-hidden">
      {/* Handheld Device Body (Iconic 1996 Egg / Famicom Portable Shell) */}
      <div className="relative w-full max-w-[540px] h-[95vh] max-h-[820px] bg-gradient-to-b from-[#312e81] via-[#1e1b4b] to-[#0f0e26] rounded-[48px] sm:rounded-[60px] border-8 sm:border-[12px] border-[#4338ca] shadow-[0_0_50px_rgba(79,70,229,0.4),inset_0_4px_12px_rgba(255,255,255,0.3)] flex flex-col p-4 sm:p-6 select-none">
        
        {/* Device Top Branding */}
        <div className="flex items-center justify-between px-3 pt-1 pb-3 border-b-2 border-[#4f46e5]/40">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_#ef4444]" title="Power ON" />
            <span className="font-['Press_Start_2P'] text-[9px] text-[#facc15] tracking-widest">
              BETTA-GOTCHI &apos;96
            </span>
          </div>
          <span className="font-['DotGothic16'] text-xs text-[#a5b4fc] tracking-wider">
            バンダイ・ファミコン
          </span>
        </div>

        {/* Screen Bezel & Inset Viewport */}
        <div className="relative flex-1 my-3 bg-[#0a0a14] rounded-2xl border-4 sm:border-6 border-[#181829] shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col">
          {/* Subtle screen shine reflection across corner */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/10 to-transparent pointer-events-none z-10" />

          {/* Aquarium Viewport */}
          <div className="relative flex-1 w-full h-full overflow-hidden">
            {children}
          </div>
        </div>

        {/* Nostalgic 90s Japanese Shell Stickers & Speaker Grille */}
        <div className="flex items-center justify-between px-4 py-1 text-xs">
          <div className="font-['DotGothic16'] text-[11px] text-[#818cf8] flex items-center gap-1">
            <span>✨ 必勝・闘魚</span>
          </div>
          {/* Speaker slits */}
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-[#1e1b4b] rounded-full" />
            <div className="w-1 h-4 bg-[#1e1b4b] rounded-full" />
            <div className="w-1 h-3 bg-[#1e1b4b] rounded-full" />
          </div>
          <div className="font-mono text-[9px] text-[#e0e7ff] bg-[#312e81] px-1.5 py-0.5 rounded">
            60-PIN SYSTEM
          </div>
        </div>

        {/* Iconic 3 Tactile Rubber Buttons: (A) Select/Feed, (B) Action/Play, (C) Cancel/Clean */}
        <div className="pt-2 pb-1 flex justify-center items-center gap-6 sm:gap-9">
          {/* Button A */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                onButtonA();
                retroAudio.playBlip(550, 0.05);
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#eab308] active:bg-[#ca8a04] border-4 border-[#a16207] shadow-[0_6px_0_#713f12,0_10px_10px_rgba(0,0,0,0.5)] active:translate-y-1.5 active:shadow-[0_0px_0_#713f12] text-black font-['Press_Start_2P'] text-xs font-black transition cursor-pointer flex items-center justify-center"
              title="Кнопка A (Корм)"
            >
              A
            </button>
            <span className="font-mono text-[9px] text-[#cbd5e1] font-bold">КОРМ</span>
          </div>

          {/* Button B */}
          <div className="flex flex-col items-center gap-1 -translate-y-2">
            <button
              onClick={() => {
                onButtonB();
                retroAudio.playBlip(680, 0.05);
              }}
              className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-[#ef4444] active:bg-[#dc2626] border-4 border-[#991b1b] shadow-[0_6px_0_#450a0a,0_10px_10px_rgba(0,0,0,0.5)] active:translate-y-1.5 active:shadow-[0_0px_0_#450a0a] text-white font-['Press_Start_2P'] text-sm font-black transition cursor-pointer flex items-center justify-center"
              title="Кнопка B (Зеркало/Кураж)"
            >
              B
            </button>
            <span className="font-mono text-[9px] text-[#cbd5e1] font-bold">КУРАЖ</span>
          </div>

          {/* Button C */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                onButtonC();
                retroAudio.playBlip(800, 0.05);
              }}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#06b6d4] active:bg-[#0891b2] border-4 border-[#0e7490] shadow-[0_6px_0_#164e63,0_10px_10px_rgba(0,0,0,0.5)] active:translate-y-1.5 active:shadow-[0_0px_0_#164e63] text-black font-['Press_Start_2P'] text-xs font-black transition cursor-pointer flex items-center justify-center"
              title="Кнопка C (Чистка)"
            >
              C
            </button>
            <span className="font-mono text-[9px] text-[#cbd5e1] font-bold">ЧИСТКА</span>
          </div>
        </div>

      </div>
    </div>
  );
};
