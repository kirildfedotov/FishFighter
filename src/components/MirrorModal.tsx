/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Flame } from 'lucide-react';
import { retroAudio } from '../services/retroAudio';

interface MirrorModalProps {
  onClose: () => void;
  onFlareToggle: (active: boolean) => void;
  onTrainingComplete: () => void;
}

export const MirrorModal: React.FC<MirrorModalProps> = ({
  onClose,
  onFlareToggle,
  onTrainingComplete,
}) => {
  const [isHoldingMirror, setIsHoldingMirror] = useState(false);
  const [flareProgress, setFlareProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let interval: number;
    if (isHoldingMirror && !isCompleted) {
      onFlareToggle(true);
      retroAudio.playFlare();

      interval = window.setInterval(() => {
        setFlareProgress((prev) => {
          const next = prev + 4;
          if (next >= 100) {
            setIsCompleted(true);
            setIsHoldingMirror(false);
            onFlareToggle(false);
            retroAudio.playFanfare();
            onTrainingComplete();
            return 100;
          }
          return next;
        });
      }, 100);
    } else {
      onFlareToggle(false);
    }

    return () => {
      clearInterval(interval);
      onFlareToggle(false);
    };
  }, [isHoldingMirror, isCompleted, onFlareToggle, onTrainingComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs select-none">
      <div className="bg-[#150f24] border-4 border-[#d946ef] rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-[0_0_35px_rgba(217,70,239,0.4)] text-center relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={() => {
            onClose();
            retroAudio.playBlip(400, 0.04);
          }}
          className="absolute top-3 right-3 text-[#cbd5e1] hover:text-white p-1 rounded bg-black/40 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex justify-center items-center gap-2 mb-2">
          <span className="text-2xl">🪞</span>
          <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-[#f5d0fe] tracking-wider">
            ЗЕРКАЛЬНЫЙ КУРАЖ &apos;96
          </h2>
        </div>
        <div className="font-['DotGothic16'] text-xs text-purple-300 mb-4">
          ベタのフレアリング訓練
        </div>

        <p className="text-xs text-[#e9d5ff] leading-relaxed mb-4">
          Подержите зеркало перед стеклом аквариума! Рыбка-петушок расправит жабры и величественные плавники на все 180°, демонстрируя царскую силу!
        </p>

        {/* Mirror Interactive Frame */}
        <div className="relative mx-auto w-48 h-56 sm:w-56 sm:h-64 rounded-xl border-4 border-[#e879f9] bg-gradient-to-br from-[#3b0764] via-[#701a75] to-[#2e1065] shadow-inner flex flex-col items-center justify-center p-4 mb-4">
          {/* Shimmer glass effect */}
          <div className="absolute inset-2 border-2 border-white/20 rounded-lg pointer-events-none bg-gradient-to-tr from-transparent via-white/10 to-transparent" />

          <div className="text-5xl sm:text-6xl mb-2 filter drop-shadow">
            {isHoldingMirror ? '🦚' : '🪞'}
          </div>

          <span className="text-xs font-mono font-bold text-white mb-2">
            {isHoldingMirror ? 'РЫБКА РАСПРАВИЛА ПЛАВНИКИ!' : 'Удерживайте кнопку'}
          </span>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-black/60 rounded-full border border-[#f0abfc] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#d946ef] to-[#facc15] transition-all duration-150"
              style={{ width: `${flareProgress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-[#f5d0fe] mt-1 tabular-nums">
            Кураж: {flareProgress}%
          </span>
        </div>

        {/* Action Button */}
        {!isCompleted ? (
          <button
            onPointerDown={() => setIsHoldingMirror(true)}
            onPointerUp={() => setIsHoldingMirror(false)}
            onPointerLeave={() => setIsHoldingMirror(false)}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-[#c026d3] to-[#e879f9] hover:from-[#d946ef] hover:to-[#f0abfc] active:scale-95 text-black font-['Press_Start_2P'] text-xs tracking-wider font-bold shadow-lg transition cursor-pointer"
          >
            {isHoldingMirror ? 'ДЕРЖИМ ЗЕРКАЛО...' : 'ЗАЖАТЬ ЗЕРКАЛО'}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#facc15] flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4" /> ТРЕНИРОВКА ЗАВЕРШЕНА! +25 ОПЫТА +СЧАСТЬЕ
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-lg bg-[#22c55e] text-black font-['Press_Start_2P'] text-xs transition"
            >
              ОТЛИЧНО!
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
