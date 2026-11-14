/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { X, Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { retroAudio } from '../services/retroAudio';

interface MiniGameModalProps {
  onClose: () => void;
  onReward: (coins: number, pearls: number) => void;
  isVip: boolean;
}

interface Item {
  x: number;
  y: number;
  size: number;
  type: 'bubble' | 'food' | 'pearl' | 'urchin';
  speed: number;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
  onClose,
  onReward,
  isVip,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('betta_minigame_hiscore') || '0', 10);
  });
  const [lives, setLives] = useState(3);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [earnedPearls, setEarnedPearls] = useState(0);

  const onRewardRef = useRef(onReward);
  const highScoreRef = useRef(highScore);
  const isVipRef = useRef(isVip);

  useEffect(() => {
    onRewardRef.current = onReward;
  }, [onReward]);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    isVipRef.current = isVip;
  }, [isVip]);

  // Game internal mutable state
  const stateRef = useRef({
    playerY: 150,
    playerX: 60,
    playerSpeedY: 0,
    playerSpeedX: 0,
    items: [] as Item[],
    animId: 0,
    lastSpawn: 0,
    score: 0,
    lives: 3,
    keys: { up: false, down: false, left: false, right: false, boost: false },
    gameActive: false,
  });

  const startGame = () => {
    retroAudio.playBlip(700, 0.08);
    setGameState('playing');
    setScore(0);
    setLives(3);
    setEarnedCoins(0);
    setEarnedPearls(0);

    const s = stateRef.current;
    s.playerY = 150;
    s.playerX = 60;
    s.items = [];
    s.score = 0;
    s.lives = 3;
    s.gameActive = true;
    s.lastSpawn = Date.now();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pixelated retro canvas rendering
    ctx.imageSmoothingEnabled = false;

    const resetKeys = () => {
      const k = stateRef.current.keys;
      k.up = false;
      k.down = false;
      k.left = false;
      k.right = false;
      k.boost = false;
    };

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      const k = stateRef.current.keys;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') k.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = true;
      if (e.key === ' ' || e.key === 'Enter') k.boost = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = stateRef.current.keys;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') k.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') k.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') k.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') k.right = false;
      if (e.key === ' ' || e.key === 'Enter') k.boost = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', resetKeys);

    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const s = stateRef.current;

      // Clear retro background
      ctx.fillStyle = '#0b0c1b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw CRT scanlines grid
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1);
      }

      if (s.gameActive) {
        // Handle input & physics
        const speed = s.keys.boost ? 220 : 140;
        if (s.keys.up) s.playerY = Math.max(20, s.playerY - speed * dt);
        if (s.keys.down) s.playerY = Math.min(canvas.height - 20, s.playerY + speed * dt);
        if (s.keys.left) s.playerX = Math.max(30, s.playerX - speed * dt);
        if (s.keys.right) s.playerX = Math.min(canvas.width - 40, s.playerX + speed * dt);

        // Spawn items
        const now = Date.now();
        if (now - s.lastSpawn > 450) {
          s.lastSpawn = now;
          const rand = Math.random();
          let type: Item['type'] = 'bubble';
          if (rand < 0.28) type = 'urchin'; // Hazard!
          else if (rand < 0.55) type = 'food';
          else if (rand < 0.70) type = 'pearl';

          s.items.push({
            x: canvas.width + 20,
            y: 20 + Math.random() * (canvas.height - 40),
            size: type === 'pearl' ? 10 : (type === 'urchin' ? 14 : 12),
            type,
            speed: 100 + Math.random() * 80 + s.score * 0.5,
          });
        }

        // Update items & collisions
        for (let i = s.items.length - 1; i >= 0; i--) {
          const item = s.items[i];
          item.x -= item.speed * dt;

          // Check collision with player
          const dx = item.x - s.playerX;
          const dy = item.y - s.playerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < item.size + 14) {
            // Collision!
            if (item.type === 'urchin') {
              // Hit hazard!
              retroAudio.playBlip(180, 0.2);
              s.lives--;
              setLives(s.lives);
              s.items.splice(i, 1);

              if (s.lives <= 0) {
                // Game Over!
                s.gameActive = false;
                setGameState('gameover');
                const vipBonus = isVipRef.current ? 2 : 1;
                const coinsWon = Math.round(s.score * 1.5 * vipBonus);
                const pearlsWon = Math.floor(s.score / 60) * vipBonus;
                setEarnedCoins(coinsWon);
                setEarnedPearls(pearlsWon);
                onRewardRef.current(coinsWon, pearlsWon);

                if (s.score > highScoreRef.current) {
                  highScoreRef.current = s.score;
                  setHighScore(s.score);
                  localStorage.setItem('betta_minigame_hiscore', s.score.toString());
                }
              }
            } else {
              // Collect item!
              s.items.splice(i, 1);
              if (item.type === 'bubble') {
                retroAudio.playBubblePop();
                s.score += 10;
              } else if (item.type === 'food') {
                retroAudio.playChomp();
                s.score += 25;
              } else if (item.type === 'pearl') {
                retroAudio.playCoin();
                s.score += 50;
              }
              setScore(s.score);
            }
            continue;
          }

          // Remove if off-screen
          if (item.x < -30) {
            s.items.splice(i, 1);
          }
        }
      }

      // Draw items
      s.items.forEach((item) => {
        if (item.type === 'bubble') {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.fill();
        } else if (item.type === 'food') {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(item.x - 6, item.y - 4, 12, 8);
          ctx.fillStyle = '#fca5a5';
          ctx.fillRect(item.x - 4, item.y - 2, 4, 4);
        } else if (item.type === 'pearl') {
          ctx.fillStyle = '#f0abfc';
          ctx.beginPath();
          ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (item.type === 'urchin') {
          // Spiky sea urchin
          ctx.fillStyle = '#831843';
          ctx.beginPath();
          ctx.arc(item.x, item.y, 8, 0, Math.PI * 2);
          ctx.fill();
          // Spikes
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          for (let a = 0; a < 8; a++) {
            const rad = (a / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(item.x, item.y);
            ctx.lineTo(item.x + Math.cos(rad) * 14, item.y + Math.sin(rad) * 14);
            ctx.stroke();
          }
        }
      });

      // Draw 8-Bit Pixel Betta Fish Player
      const px = s.playerX;
      const py = s.playerY;

      // Fish body
      ctx.fillStyle = isVipRef.current ? '#eab308' : '#3b82f6';
      ctx.fillRect(px - 14, py - 7, 24, 14);

      // Tail fins
      ctx.fillStyle = isVipRef.current ? '#f59e0b' : '#8b5cf6';
      ctx.beginPath();
      ctx.moveTo(px - 14, py);
      ctx.lineTo(px - 28, py - 14);
      ctx.lineTo(px - 22, py);
      ctx.lineTo(px - 28, py + 14);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + 4, py - 4, 4, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(px + 6, py - 3, 2, 2);

      s.animId = requestAnimationFrame(loop);
    };

    stateRef.current.animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetKeys);
    };
  }, []);

  // Touch control helper
  const setKey = (key: 'up' | 'down' | 'left' | 'right' | 'boost', val: boolean) => {
    stateRef.current.keys[key] = val;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 select-none">
      <div className="bg-[#121326] border-4 border-[#ef4444] rounded-2xl w-full max-w-xl flex flex-col shadow-[0_0_35px_rgba(239,68,68,0.4)] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7f1d1d] via-[#b91c1c] to-[#7f1d1d] px-4 py-2.5 flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="text-xl">🕹️</span>
            <div>
              <h2 className="font-['Press_Start_2P'] text-xs sm:text-sm text-[#fef08a] tracking-wider drop-shadow">
                BETTA BUBBLE RUNNER &apos;96
              </h2>
              <div className="font-['DotGothic16'] text-[11px] text-red-200">
                ファミコン ベタアクション
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#facc15] font-bold">СЧЁТ: {score}</span>
            <span className="text-red-400 font-bold">ЖИЗНИ: {lives}❤️</span>
            <button
              onClick={() => {
                onClose();
                retroAudio.playBlip(400, 0.04);
              }}
              className="bg-black/50 hover:bg-black text-white p-1 rounded transition ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Arcade Screen Container */}
        <div className="relative bg-black flex justify-center items-center overflow-hidden">
          <canvas
            ref={canvasRef}
            width={480}
            height={260}
            className="w-full h-auto max-h-[300px] border-b-2 border-[#312e81] block"
          />

          {/* Start Screen Overlay */}
          {gameState === 'start' && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center">
              <h3 className="font-['Press_Start_2P'] text-sm sm:text-base text-[#facc15] mb-2 leading-relaxed">
                ДЕНДИ: ЛОВЕЦ ЖЕМЧУЖИН
              </h3>
              <p className="text-xs text-[#cbd5e1] max-w-sm mb-4 leading-relaxed font-mono">
                Ловите пузыри, мотыль и жемчужины! Уворачивайтесь от шипастых морских ежей.
              </p>
              <button
                onClick={startGame}
                className="px-6 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-['Press_Start_2P'] text-xs rounded-lg shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" /> СТАРТ
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-4 text-center">
              <h3 className="font-['Press_Start_2P'] text-sm sm:text-base text-[#ef4444] mb-2">
                ИГРА ОКОНЧЕНА
              </h3>
              <div className="font-mono text-xs text-[#fef08a] mb-2">
                Итоговый счёт: <span className="text-base font-bold text-white">{score}</span>
              </div>
              <div className="flex items-center gap-3 bg-[#1e1b4b] border border-[#6366f1] px-4 py-1.5 rounded-lg mb-4 text-xs font-mono">
                <span className="text-[#facc15]">+{earnedCoins} 🪙 монет</span>
                {earnedPearls > 0 && <span className="text-[#f0abfc]">+{earnedPearls} 🦪 жемчужин</span>}
              </div>
              <button
                onClick={startGame}
                className="px-5 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-['Press_Start_2P'] text-xs rounded-lg shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <RotateCcw className="w-4 h-4" /> ЕЩЁ РАЗ
              </button>
            </div>
          )}
        </div>

        {/* On-screen Retro D-pad Controls for Mobile & Touch */}
        <div className="p-3 bg-[#0d0e1b] flex items-center justify-between border-t border-[#312e81]">
          {/* D-Pad */}
          <div className="grid grid-cols-3 gap-1 w-28 h-28">
            <div />
            <button
              onPointerDown={() => setKey('up', true)}
              onPointerUp={() => setKey('up', false)}
              onPointerLeave={() => setKey('up', false)}
              onPointerCancel={() => setKey('up', false)}
              className="bg-[#27273a] active:bg-[#4338ca] text-white rounded flex items-center justify-center touch-none"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />
            <button
              onPointerDown={() => setKey('left', true)}
              onPointerUp={() => setKey('left', false)}
              onPointerLeave={() => setKey('left', false)}
              onPointerCancel={() => setKey('left', false)}
              className="bg-[#27273a] active:bg-[#4338ca] text-white rounded flex items-center justify-center touch-none"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="bg-[#181824] rounded-sm" />
            <button
              onPointerDown={() => setKey('right', true)}
              onPointerUp={() => setKey('right', false)}
              onPointerLeave={() => setKey('right', false)}
              onPointerCancel={() => setKey('right', false)}
              className="bg-[#27273a] active:bg-[#4338ca] text-white rounded flex items-center justify-center touch-none"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div />
            <button
              onPointerDown={() => setKey('down', true)}
              onPointerUp={() => setKey('down', false)}
              onPointerLeave={() => setKey('down', false)}
              onPointerCancel={() => setKey('down', false)}
              className="bg-[#27273a] active:bg-[#4338ca] text-white rounded flex items-center justify-center touch-none"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <div />
          </div>

          {/* Action Turbo Dash Button */}
          <div className="flex flex-col items-center gap-1">
            <button
              onPointerDown={() => setKey('boost', true)}
              onPointerUp={() => setKey('boost', false)}
              onPointerLeave={() => setKey('boost', false)}
              onPointerCancel={() => setKey('boost', false)}
              className="w-16 h-16 rounded-full bg-[#ef4444] active:bg-[#dc2626] border-4 border-[#991b1b] shadow-lg flex items-center justify-center text-white font-['Press_Start_2P'] text-xs active:scale-95 transition touch-none"
            >
              ТУРБО
            </button>
            <span className="text-[9px] font-mono text-[#94a3b8]">Кнопка [A] / Пробел</span>
          </div>
        </div>

      </div>
    </div>
  );
};
