/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Eye } from 'lucide-react';
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

  useEffect(() => {
    return () => {
      onFlareToggleRef.current(false);
    };
  }, []);

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
      <div className="pointer-events-auto glass-panel border-violet-400/35 w-full max-w-md p-4 sm:p-5 text-center relative overflow-hidden">
        <button
          type="button"
          onClick={() => {
            onClose();
            retroAudio.playBlip(400, 0.04);
          }}
          aria-label="Закрыть тренировку"
          className="ui-btn glass-btn absolute top-3 right-3 p-1.5 rounded-xl"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex justify-center items-center gap-2 mb-1 pr-8">
          <Eye className="w-4 h-4 text-violet-300" />
          <h2 className="font-display font-bold text-base text-white">
            Тренировка с зеркалом
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Удерживайте кнопку, чтобы рыбка раскрыла плавники и жабры
        </p>

        <div className="rounded-xl border border-white/10 bg-slate-950/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-3.5 mb-3.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-200 mb-2">
            <span className="truncate">
              {isCompleted
                ? 'Плавники полностью раскрыты!'
                : isHoldingMirror
                ? 'Петушок в боевой стойке'
                : 'Готов к тренировке'}
            </span>
            <span className="font-mono text-violet-300 ml-2 tabular-nums font-bold">{flareProgress}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-900 border border-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 progress-sheen transition-all duration-100 rounded-full"
              style={{ width: `${flareProgress}%` }}
            />
          </div>
        </div>

        {!isCompleted ? (
          <button
            type="button"
            onPointerDown={() => setIsHoldingMirror(true)}
            onPointerUp={() => setIsHoldingMirror(false)}
            onPointerLeave={() => setIsHoldingMirror(false)}
            onPointerCancel={() => setIsHoldingMirror(false)}
            className="ui-btn glass-btn-violet w-full py-3 px-5 font-bold text-xs sm:text-sm touch-none"
          >
            {isHoldingMirror ? 'Держим зеркало...' : 'Зажать зеркало'}
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="text-xs font-mono font-bold text-amber-300">
              +35 EXP · +25 🪙 · +Радость
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ui-btn glass-btn-emerald w-full py-2.5 px-4 font-bold text-xs"
            >
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
