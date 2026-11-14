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
  cleanliness: number;
  onSceneReady?: (scene: AquariumScene) => void;
  onFishFed?: (nutrition: number) => void;
  onFishTapped?: () => void;
}

export const AquariumCanvas: React.FC<AquariumCanvasProps> = ({
  skin,
  theme,
  isVip,
  cleanliness,
  onSceneReady,
  onFishFed,
  onFishTapped,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AquariumScene | null>(null);
  const onFishFedRef = useRef(onFishFed);
  const onFishTappedRef = useRef(onFishTapped);

  useEffect(() => {
    onFishFedRef.current = onFishFed;
  }, [onFishFed]);

  useEffect(() => {
    onFishTappedRef.current = onFishTapped;
  }, [onFishTapped]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new AquariumScene(mountRef.current, skin, theme);
    scene.fish.setVip(isVip);
    scene.setCleanliness(cleanliness);
    scene.onFishFed = (nutrition) => onFishFedRef.current?.(nutrition);
    scene.onFishTapped = () => onFishTappedRef.current?.();
    sceneRef.current = scene;

    if (onSceneReady) {
      onSceneReady(scene);
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current && sceneRef.current.fish) {
      sceneRef.current.fish.updateSkin(skin);
    }
  }, [skin]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (sceneRef.current && sceneRef.current.fish) {
      sceneRef.current.fish.setVip(isVip);
    }
  }, [isVip]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.setCleanliness(cleanliness);
    }
  }, [cleanliness]);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full cursor-pointer select-none overflow-hidden touch-none"
      title="Нажмите на стекло аквариума, чтобы привлечь рыбку"
    />
  );
};
