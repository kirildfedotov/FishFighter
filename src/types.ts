/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FishColorPalette = 
  | 'tropical_paradise' // Vibrant Lagoon Turquoise + Coral Orange + Sunset Gold
  | 'royal_blue'        // Classic iridescent Royal Blue + Violet
  | 'ruby_dragon'       // Fiery Crimson Red + Gold
  | 'cyan_halfmoon'     // Turquoise Cyan + Emerald
  | 'black_samurai'     // Stealth Black + Metallic Silver
  | 'golden_imperial'   // VIP Golden Sheen + Diamond Sparkle
  | 'sakura_blossom';   // Pastel Pink + Pearl White

export interface FishSkin {
  id: FishColorPalette;
  name: string;
  jpName: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  bellyColor: string;
  fresnelColor: string;
  priceCoins: number;
  pricePearls: number;
  isVipOnly?: boolean;
}

export type AquariumThemeId = 
  | 'tokyo_neon_96'   // 90s Tokyo cyber neon lights, deep purple-blue water
  | 'zen_garden'      // Japanese pond with bamboo, golden torii gate, calm green water
  | 'dendy_castle'    // 8-bit Famicom retro brick castle, pixelated pebble bed
  | 'sakura_shrine'   // Gentle pink petals, stone lantern, crystal water
  | 'golden_palace';  // VIP golden sunken treasures, luminous ambient

export interface AquariumTheme {
  id: AquariumThemeId;
  name: string;
  jpName: string;
  waterColor: string;
  fogColor: string;
  ambientIntensity: number;
  sandColor: string;
  description: string;
  priceCoins: number;
  pricePearls: number;
  isVipOnly?: boolean;
}

export type FoodType = 'pellet' | 'bloodworm' | 'golden_flake';

export interface FoodItem {
  id: FoodType;
  name: string;
  jpName: string;
  description: string;
  hungerRestore: number;
  happinessBonus: number;
  priceCoins: number;
  icon: string;
}

export interface FishStats {
  name: string;
  level: number;
  experience: number;
  maxExperience: number;
  ageDays: number;
  hunger: number;     // 0 - 100 (100 = full)
  cleanliness: number;// 0 - 100 (100 = pristine)
  happiness: number;  // 0 - 100 (100 = ecstatic)
  energy: number;     // 0 - 100 (100 = full of vigor)
  health: number;     // 0 - 100 (overall vitality)
  isSleeping: boolean;
  skin: FishColorPalette;
  theme: AquariumThemeId;
  coins: number;
  pearls: number;
  isVip: boolean;
  unlockedSkins: FishColorPalette[];
  unlockedThemes: AquariumThemeId[];
  unlockedAccessories: string[];
  equippedAccessory?: string;
  totalFeedings: number;
  totalCleans: number;
  totalPlays: number;
  lastFedTimestamp: number;
  lastCleanedTimestamp: number;
  lastCareTimestamp: number;
  createdTimestamp: number;
}

export interface DonationTier {
  id: string;
  name: string;
  jpName: string;
  priceRub: number;
  priceUsd: number;
  pearlsAwarded: number;
  coinsAwarded: number;
  titleBadge: string;
  description: string;
  benefits: string[];
  isPopular?: boolean;
}
