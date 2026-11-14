/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { AquariumScene } from '../game/AquariumScene';
import { AquariumThemeId, FishColorPalette } from '../types';

interface AquariumCanvasProps {
  skin: FishColorPalette;
  theme: AquariumThemeId;
  isVip: boolean;
  onSceneReady?: (scene: AquariumScene) => void;
  onFishFed?: (nutrition: number) => void;
  onFishTapped?: () => void;
}

export const AquariumCanvas: React.FC<AquariumCanvasProps> = ({
  skin,
  theme,
  isVip,
  onSceneReady,
  onFishFed,
  onFishTapped,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AquariumScene | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize 3D Aquarium Scene once
    const scene = new AquariumScene(mountRef.current, skin, theme);
    scene.fish.setVip(isVip);
    scene.onFishFed = onFishFed;
    scene.onFishTapped = onFishTapped;
    sceneRef.current = scene;

    if (onSceneReady) {
      onSceneReady(scene);
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Sync skin updates
  useEffect(() => {
    if (sceneRef.current && sceneRef.current.fish) {
      sceneRef.current.fish.updateSkin(skin);
    }
  }, [skin]);

  // Sync theme updates
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTheme(theme);
    }
  }, [theme]);

  // Sync VIP crown updates
  useEffect(() => {
    if (sceneRef.current && sceneRef.current.fish) {
      sceneRef.current.fish.setVip(isVip);
    }
  }, [isVip]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full cursor-pointer select-none overflow-hidden touch-none"
      title="Нажмите на стекло аквариума, чтобы привлечь рыбку"
    />
  );
};
