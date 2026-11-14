/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
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

  const onFlareToggleRef = useRef(onFlareToggle);
  const onTrainingCompleteRef = useRef(onTrainingComplete);
  const completedFiredRef = useRef(false);

  useEffect(() => {
    onFlareToggleRef.current = onFlareToggle;
  }, [onFlareToggle]);

  useEffect(() => {
    onTrainingCompleteRef.current = onTrainingComplete;
  }, [onTrainingComplete]);

  // Trigger flare animation while holding mirror
  useEffect(() => {
    let interval: number | undefined;

    if (isHoldingMirror && !isCompleted) {
      onFlareToggleRef.current(true);
      retroAudio.playFlare();

      interval = window.setInterval(() => {
        setFlareProgress((prev) => Math.min(100, prev + 4));
      }, 100);
    } else {
      onFlareToggleRef.current(false);
    }

    return () => {
      if (interval !== undefined) clearInterval(interval);
    };
  }, [isHoldingMirror, isCompleted]);

  // Ensure flare is released when modal unmounts
  useEffect(() => {
    return () => {
      onFlareToggleRef.current(false);
    };
  }, []);

  // Handle training completion outside setState updater
  useEffect(() => {
    if (flareProgress >= 100 && !completedFiredRef.current) {
      completedFiredRef.current = true;
      setIsCompleted(true);
      setIsHoldingMirror(false);
      onFlareToggleRef.current(false);
      retroAudio.playFanfare();
      onTrainingCompleteRef.current();
    }
  }, [flareProgress]);

  return (
    <div className="fixed inset-x-0 bottom-3 sm:bottom-5 z-50 flex justify-center px-3 pointer-events-none select-none">
      <div className="pointer-events-auto bg-[#150f24]/95 border-4 border-[#d946ef] rounded-2xl w-full max-w-md p-3.5 sm:p-4 shadow-[0_0_35px_rgba(217,70,239,0.45)] text-center relative overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={() => {
            onClose();
            retroAudio.playBlip(400, 0.04);
          }}
          aria-label="Закрыть тренировку"
          className="absolute top-2.5 right-2.5 text-[#cbd5e1] hover:text-white p-1 rounded bg-black/40 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex justify-center items-center gap-2 mb-1 pr-6">
          <span className="text-lg">🪞</span>
          <h2 className="font-['Press_Start_2P'] text-[11px] sm:text-xs text-[#f5d0fe] tracking-wider">
            ЗЕРКАЛЬНЫЙ КУРАЖ &apos;96
          </h2>
        </div>
        <div className="font-['DotGothic16'] text-[11px] text-purple-300 mb-2">
          ベタのフレアリング訓練 — смотрите на рыбку в аквариуме!
        </div>

        {/* Compact Mirror Strip + Progress */}
        <div className="rounded-xl border-2 border-[#e879f9] bg-gradient-to-r from-[#3b0764] via-[#701a75] to-[#2e1065] p-2.5 mb-3 flex items-center gap-3 relative overflow-hidden">
          <div className="w-11 h-11 shrink-0 rounded-lg border-2 border-white/30 bg-gradient-to-tr from-[#4c1d95] via-[#a21caf]/40 to-white/25 flex items-center justify-center text-2xl shadow-inner">
            {isHoldingMirror ? '🔥' : '🪞'}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white mb-1">
              <span className="truncate">
                {isCompleted
                  ? 'ЖАБРЫ И ПЛАВНИКИ РАСКРЫТЫ!'
                  : isHoldingMirror
                  ? 'ПЕТУШОК В ЯРОСТИ! 180° ХВОСТ'
                  : 'Зажмите кнопку, чтобы показать зеркало'}
              </span>
              <span className="text-[#f5d0fe] ml-2 tabular-nums shrink-0">{flareProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-black/60 rounded-full border border-[#f0abfc] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#d946ef] to-[#facc15] transition-all duration-100"
                style={{ width: `${flareProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!isCompleted ? (
          <button
            onPointerDown={() => setIsHoldingMirror(true)}
            onPointerUp={() => setIsHoldingMirror(false)}
            onPointerLeave={() => setIsHoldingMirror(false)}
            onPointerCancel={() => setIsHoldingMirror(false)}
            className="w-full py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#c026d3] to-[#e879f9] hover:from-[#d946ef] hover:to-[#f0abfc] active:scale-95 text-black font-['Press_Start_2P'] text-[11px] tracking-wider font-bold shadow-lg transition cursor-pointer touch-none"
          >
            {isHoldingMirror ? 'ДЕРЖИМ ЗЕРКАЛО...' : 'ЗАЖАТЬ ЗЕРКАЛО'}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#facc15] flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 shrink-0" /> +35 ОПЫТА +25 🪙 +СЧАСТЬЕ
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-black font-['Press_Start_2P'] text-xs transition cursor-pointer"
            >
              ОТЛИЧНО!
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
