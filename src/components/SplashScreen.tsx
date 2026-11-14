/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { FishStats } from '../types';
import { FISH_SKINS } from '../services/storage';
import { retroAudio } from '../services/retroAudio';

interface SplashScreenProps {
  stats: FishStats;
  onStart: (enableBgm: boolean) => void;
}

const BUBBLE_SPECS = [
  { left: '8%', size: 8, delay: '0s', duration: '6.5s' },
  { left: '16%', size: 12, delay: '1.4s', duration: '8s' },
  { left: '25%', size: 6, delay: '2.8s', duration: '5.8s' },
  { left: '38%', size: 10, delay: '0.6s', duration: '7.2s' },
  { left: '54%', size: 7, delay: '3.1s', duration: '6.2s' },
  { left: '68%', size: 14, delay: '1.1s', duration: '8.6s' },
  { left: '79%', size: 8, delay: '2.1s', duration: '6.8s' },
  { left: '90%', size: 11, delay: '0.3s', duration: '7.6s' },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ stats, onStart }) => {
  const [isLeaving, setIsLeaving] = useState(false);
  const [withMusic, setWithMusic] = useState(true);

  const isLeavingRef = useRef(false);
  const withMusicRef = useRef(withMusic);
  const onStartRef = useRef(onStart);
  const leaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    withMusicRef.current = withMusic;
  }, [withMusic]);

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  const skinPreset = FISH_SKINS[stats.skin] || FISH_SKINS.tropical_paradise;

  const triggerStart = () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    setIsLeaving(true);
    retroAudio.playFanfare();
    leaveTimerRef.current = window.setTimeout(() => {
      onStartRef.current(withMusicRef.current);
    }, 420);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerStart();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (leaveTimerRef.current !== null) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden bg-[#070713] text-white select-none transition-all duration-400 ${
        isLeaving ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Retro 90s Sunburst & Synthwave Horizon Background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 38%, rgba(190, 24, 93, 0.28) 0%, rgba(49, 46, 129, 0.35) 38%, rgba(7, 7, 19, 1) 76%)',
        }}
      />

      {/* Perspective Arcade Horizon Grid (Bottom Half) */}
      <div className="absolute inset-x-0 bottom-0 h-[44%] overflow-hidden pointer-events-none opacity-45">
        <div
          className="w-[200%] h-[220%] -ml-[50%] origin-top animate-arcade-grid"
          style={{
            transform: 'perspective(360px) rotateX(64deg)',
            backgroundImage:
              'linear-gradient(to right, rgba(56, 189, 248, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(236, 72, 153, 0.45) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070713] via-transparent to-[#070713]/90" />
      </div>

      {/* Rising Pixel Bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {BUBBLE_SPECS.map((b, i) => (
          <div
            key={i}
            className="absolute -bottom-6 border-2 border-[#7dd3fc]/60 bg-[#38bdf8]/15 animate-splash-bubble"
            style={{
              left: b.left,
              width: `${b.size}px`,
              height: `${b.size}px`,
              animationDelay: b.delay,
              animationDuration: b.duration,
            }}
          />
        ))}
      </div>

      {/* CRT Scanline Texture */}
      <div className="absolute inset-0 crt-overlay crt-vignette pointer-events-none z-10" />

      {/* Top Cartridge Bar */}
      <header className="relative z-20 w-full max-w-4xl px-4 pt-3 sm:pt-5 flex items-center justify-between text-[10px] sm:text-xs font-mono">
        <div className="flex items-center gap-2 bg-[#111229] border-2 border-[#4338ca] px-2.5 py-1 shadow-md">
          <span className="text-[#facc15] font-bold">FAMICOM 60-PIN</span>
          <span className="text-[#94a3b8] hidden sm:inline">• 1996 EDITION</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setWithMusic((prev) => !prev);
            retroAudio.playBlip(640, 0.04);
          }}
          className="flex items-center gap-1.5 bg-[#111229] hover:bg-[#1e1b4b] border-2 border-[#4338ca] px-2.5 py-1 text-[#cbd5e1] hover:text-white transition cursor-pointer"
        >
          {withMusic ? <Volume2 className="w-3.5 h-3.5 text-[#38bdf8]" /> : <VolumeX className="w-3.5 h-3.5 text-[#ef4444]" />}
          <span>{withMusic ? 'BGM: ВКЛ' : 'BGM: ВЫКЛ'}</span>
        </button>
      </header>

      {/* Center Hero Artwork & Title Lockup */}
      <main className="relative z-20 flex flex-col items-center justify-center px-4 text-center max-w-2xl w-full my-auto">
        {/* Japanese Subtitle Crest */}
        <div className="font-['DotGothic16'] text-xs sm:text-base text-[#fda4af] tracking-[0.22em] mb-2 sm:mb-3 uppercase">
          闘魚伝説 • ФИШ ФАЙТЕР &apos;96
        </div>

        {/* Custom Retro Betta Fighter Emblem SVG */}
        <div className="relative mb-3 sm:mb-5 animate-hero-float">
          {/* Glowing Rising Sun Disc behind Fish */}
          <div
            className="w-32 h-32 sm:w-44 sm:h-44 mx-auto relative flex items-center justify-center border-4 border-[#facc15] bg-[#160d2b] shadow-[0_0_45px_rgba(244,63,94,0.45),inset_0_0_24px_rgba(250,204,21,0.22)]"
            style={{
              clipPath: 'polygon(12% 0%, 88% 0%, 100% 12%, 100% 88%, 88% 100%, 12% 100%, 0% 88%, 0% 12%)',
            }}
          >
            {/* Sunburst stripes */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                background:
                  'repeating-conic-gradient(from 0deg, #f43f5e 0deg 12deg, transparent 12deg 24deg)',
              }}
            />

            {/* Stylized Fighting Betta Halfmoon Vector */}
            <svg
              viewBox="0 0 180 140"
              className="w-28 h-24 sm:w-40 sm:h-32 relative z-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="ffTailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={skinPreset.secondaryColor} />
                  <stop offset="55%" stopColor={skinPreset.primaryColor} />
                  <stop offset="100%" stopColor="#facc15" />
                </linearGradient>
                <linearGradient id="ffBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={skinPreset.primaryColor} />
                  <stop offset="70%" stopColor={skinPreset.secondaryColor} />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
              </defs>

              {/* Halfmoon Flowing Caudal Tail */}
              <path
                d="M72 70 C50 32, 16 14, 14 40 C26 48, 12 58, 8 70 C12 82, 26 92, 14 100 C16 126, 50 108, 72 70 Z"
                fill="url(#ffTailGrad)"
                stroke="#fef08a"
                strokeWidth="2"
              />
              {/* Fin Rays */}
              <path
                d="M70 70 L20 38 M70 70 L14 58 M70 70 L12 70 M70 70 L14 82 M70 70 L20 102"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1.2"
              />

              {/* Dorsal Sail Fin */}
              <path
                d="M78 55 C72 24, 96 14, 114 34 C118 44, 108 54, 98 56 Z"
                fill="url(#ffTailGrad)"
                stroke="#fde047"
                strokeWidth="1.6"
              />

              {/* Anal Ventral Curtain */}
              <path
                d="M74 84 C64 114, 96 128, 116 106 C118 96, 108 86, 98 84 Z"
                fill="url(#ffTailGrad)"
                stroke="#fde047"
                strokeWidth="1.6"
              />

              {/* Muscular Betta Torso */}
              <path
                d="M68 70 C74 52, 108 46, 134 58 C146 64, 152 68, 152 72 C152 76, 142 84, 126 88 C102 93, 74 86, 68 70 Z"
                fill="url(#ffBodyGrad)"
                stroke="#ffffff"
                strokeWidth="1.5"
              />

              {/* Crimson Flared Gill Beard */}
              <path
                d="M128 84 C126 95, 138 98, 144 85 Z"
                fill="#ef4444"
                stroke="#fca5a5"
                strokeWidth="1"
              />

              {/* Glossy Eye + Catchlight */}
              <circle cx="137" cy="67" r="4.5" fill="#38bdf8" stroke="#020617" strokeWidth="1.5" />
              <circle cx="137.8" cy="67" r="2.2" fill="#020617" />
              <circle cx="139" cy="65.6" r="1.1" fill="#ffffff" />

              {/* Katana Water Slash Accent */}
              <path
                d="M24 118 Q95 96 164 46"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>
          </div>
        </div>

        {/* Arcade Title Lockup */}
        <div className="relative mb-2 sm:mb-3">
          <h1
            className="font-['Press_Start_2P'] text-2xl sm:text-5xl tracking-wider leading-tight text-[#fef08a] -skew-x-6"
            style={{
              textShadow:
                '0 3px 0 #ea580c, 0 6px 0 #991b1b, 0 10px 24px rgba(239, 68, 68, 0.65)',
            }}
          >
            FISH<span className="text-[#38bdf8]">FIGHTER</span>
          </h1>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="h-[2px] w-8 sm:w-14 bg-gradient-to-r from-transparent to-[#f43f5e]" />
            <span className="font-['Press_Start_2P'] text-[9px] sm:text-[11px] text-[#e0e7ff] tracking-widest">
              BETTA TAMAGOTCHI 3D
            </span>
            <span className="h-[2px] w-8 sm:w-14 bg-gradient-to-l from-transparent to-[#38bdf8]" />
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-md mb-5 sm:mb-7 leading-relaxed font-mono">
          Вырастите легендарного бойцового петушка: кормите, тренируйте у зеркала, открывайте редкие окрасы и сражайтесь на PvP-арене.
        </p>

        {/* Primary Arcade CTA Button */}
        <button
          type="button"
          onClick={triggerStart}
          className="group relative px-7 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-b from-[#facc15] via-[#eab308] to-[#ca8a04] hover:from-[#fef08a] hover:to-[#eab308] text-black font-['Press_Start_2P'] text-xs sm:text-sm tracking-wider border-4 border-[#fef9c3] shadow-[0_6px_0_#854d0e,0_14px_30px_rgba(234,179,8,0.45)] active:translate-y-1.5 active:shadow-[0_0_0_#854d0e] transition cursor-pointer"
        >
          <span className="relative z-10 flex items-center gap-2">
            ▶ НАЧАТЬ ИГРУ
          </span>
        </button>

        {/* Compact Saved Fighter Telemetry Strip (Rectangular Retro Box, Zero Pills) */}
        <div className="mt-4 sm:mt-5 inline-flex items-center gap-3 sm:gap-5 bg-[#0e1024]/90 border-2 border-[#312e81] px-3.5 py-2 text-[10px] sm:text-xs font-mono text-[#a5b4fc]">
          <div>
            БОЕЦ: <span className="text-white font-bold">{stats.name}</span>
          </div>
          <div className="text-[#4338ca]">|</div>
          <div>
            УР. <span className="text-[#facc15] font-bold">{stats.level}</span>
          </div>
          <div className="text-[#4338ca]">|</div>
          <div>
            <span className="text-[#fde047] font-bold">{stats.coins} 🪙</span>
          </div>
        </div>
      </main>

      {/* Bottom Arcade Copyright & Press-Start Prompt */}
      <footer className="relative z-20 w-full px-4 pb-3 sm:pb-5 text-center space-y-1">
        <div className="font-['Press_Start_2P'] text-[9px] sm:text-[10px] text-[#38bdf8] tracking-widest">
          PRESS ENTER OR TAP TO START
        </div>
        <div className="text-[10px] font-mono text-[#64748b]">
          © 1996 TOKYO AQUA-ARCADE • DENDY / FAMICOM EDITION
        </div>
      </footer>
    </div>
  );
};
