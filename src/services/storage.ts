/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FishStats, FishSkin, FishColorPalette, AquariumTheme, FoodItem, DonationTier } from '../types';

export const FISH_SKINS: Record<string, FishSkin> = {
  tropical_paradise: {
    id: 'tropical_paradise',
    name: 'Тропический Риф',
    jpName: 'トロピカル・パラダイス',
    description: 'Экзотический тропический окрас: бирюзовая лагуна, коралловый закат, фуксия и золотые блики.',
    primaryColor: '#06b6d4',
    secondaryColor: '#f97316',
    bellyColor: '#fde047',
    fresnelColor: '#ec4899',
    priceCoins: 0,
    pricePearls: 0,
  },
  royal_blue: {
    id: 'royal_blue',
    name: 'Королевский Синий',
    jpName: 'ロイヤルブルー',
    description: 'Классический сапфировый петушок с переливами индиго и фиолетового.',
    primaryColor: '#1d4ed8',
    secondaryColor: '#7c3aed',
    bellyColor: '#38bdf8',
    fresnelColor: '#ec4899',
    priceCoins: 0,
    pricePearls: 0,
  },
  ruby_dragon: {
    id: 'ruby_dragon',
    name: 'Рубиновый Дракон',
    jpName: 'ルビードラゴン',
    description: 'Огненно-красный королевский петушок с золотистым свечением плавников.',
    primaryColor: '#dc2626',
    secondaryColor: '#f59e0b',
    bellyColor: '#f87171',
    fresnelColor: '#fbbf24',
    priceCoins: 250,
    pricePearls: 0,
  },
  cyan_halfmoon: {
    id: 'cyan_halfmoon',
    name: 'Бирюзовый Полумесяц',
    jpName: 'ターコイズハーフムーン',
    description: 'Небесно-бирюзовый с изумрудными прожилками, плавники как шелковые крылья.',
    primaryColor: '#06b6d4',
    secondaryColor: '#10b981',
    bellyColor: '#67e8f9',
    fresnelColor: '#a7f3d0',
    priceCoins: 500,
    pricePearls: 0,
  },
  black_samurai: {
    id: 'black_samurai',
    name: 'Черный Самурай',
    jpName: 'ブラックサムライ',
    description: 'Редчайшая чешуя дракона: матовый глубокий антрацит с платиновым отливом.',
    primaryColor: '#18181b',
    secondaryColor: '#71717a',
    bellyColor: '#3f3f46',
    fresnelColor: '#e4e4e7',
    priceCoins: 900,
    pricePearls: 15,
  },
  sakura_blossom: {
    id: 'sakura_blossom',
    name: 'Сакура 1996',
    jpName: '桜ブロッサム',
    description: 'Нежный пастельно-розовый с жемчужно-белыми плавниками в стиле аниме 90-х.',
    primaryColor: '#f43f5e',
    secondaryColor: '#fbcfe8',
    bellyColor: '#fda4af',
    fresnelColor: '#ffffff',
    priceCoins: 1200,
    pricePearls: 25,
  },
  golden_imperial: {
    id: 'golden_imperial',
    name: 'Императорский Золотой (VIP)',
    jpName: '黄金の皇帝',
    description: 'Легендарная золотая чешуя 24K, сияющая аура и царственные плавники.',
    primaryColor: '#eab308',
    secondaryColor: '#f59e0b',
    bellyColor: '#fef08a',
    fresnelColor: '#ffffff',
    priceCoins: 0,
    pricePearls: 50,
    isVipOnly: true,
  },
};

export const AQUARIUM_THEMES: Record<string, AquariumTheme> = {
  tokyo_neon_96: {
    id: 'tokyo_neon_96',
    name: 'Токио Неон 1996',
    jpName: '東京ネオン96',
    waterColor: '#0c1033',
    fogColor: '#070a24',
    ambientIntensity: 0.85,
    sandColor: '#1e1b4b',
    description: 'Ночной киберпанк Синдзюку 90-х с ультрафиолетовым аквариумным неоном.',
    priceCoins: 0,
    pricePearls: 0,
  },
  zen_garden: {
    id: 'zen_garden',
    name: 'Дзен Пруд Киото',
    jpName: '京都禅ガーデン',
    waterColor: '#042f2e',
    fogColor: '#022c22',
    ambientIntensity: 0.95,
    sandColor: '#134e4a',
    description: 'Умиротворяющий сад камней, бамбук и мерцающие золотистые солнечные блики.',
    priceCoins: 350,
    pricePearls: 0,
  },
  dendy_castle: {
    id: 'dendy_castle',
    name: 'Денди Замок 8-Bit',
    jpName: 'ファミコンキャッスル',
    waterColor: '#1e1e38',
    fogColor: '#121224',
    ambientIntensity: 1.0,
    sandColor: '#451a03',
    description: 'Ностальгия по пиксельным мирам Famicom: кирпичики замка и ламповый CRT-стиль.',
    priceCoins: 600,
    pricePearls: 10,
  },
  sakura_shrine: {
    id: 'sakura_shrine',
    name: 'Храм Сакуры',
    jpName: '桜の神社',
    waterColor: '#2b092b',
    fogColor: '#1f0520',
    ambientIntensity: 0.9,
    sandColor: '#4a154b',
    description: 'Лепестки сакуры, ритуальные фонари и мягкое розово-лиловое сияние.',
    priceCoins: 850,
    pricePearls: 20,
  },
  golden_palace: {
    id: 'golden_palace',
    name: 'Золотой Дворец Сёгуна (VIP)',
    jpName: '将軍の黄金宮殿',
    waterColor: '#261a04',
    fogColor: '#171003',
    ambientIntensity: 1.2,
    sandColor: '#713f12',
    description: 'Роскошный позолоченный грот с античными сокровищами и хрустальной водой.',
    priceCoins: 0,
    pricePearls: 40,
    isVipOnly: true,
  },
};

export const FOOD_ITEMS: FoodItem[] = [
  {
    id: 'pellet',
    name: 'Хлопья Денди',
    jpName: 'ファミコンフレーク',
    description: 'Питательные микрохлопья со спирулиной для яркого окраса чешуи.',
    hungerRestore: 25,
    happinessBonus: 10,
    priceCoins: 0,
    icon: '🍘',
  },
  {
    id: 'bloodworm',
    name: 'Свежий Мотыль',
    jpName: 'アカムシデラックス',
    description: 'Лакомство высшего класса! Петушки просто обожают живой мотыль.',
    hungerRestore: 45,
    happinessBonus: 25,
    priceCoins: 15,
    icon: '🪱',
  },
  {
    id: 'golden_flake',
    name: 'Золотые Витамины',
    jpName: 'ゴールデンビタミン',
    description: 'Императорский деликатес: мгновенно насыщает и дарит море энергии.',
    hungerRestore: 70,
    happinessBonus: 50,
    priceCoins: 40,
    icon: '✨',
  },
];

export const DONATION_TIERS: DonationTier[] = [
  {
    id: 'tier_coffee',
    name: 'Угостить петушка кормом',
    jpName: 'おやつタイム',
    priceRub: 99,
    priceUsd: 1.5,
    pearlsAwarded: 50,
    coinsAwarded: 800,
    titleBadge: '☕ Чайная поддержка',
    description: 'Маленькое доброе дело, которое согревает рыбку и вдохновляет автора!',
    benefits: [
      '+50 Золотых жемчужин',
      '+800 Монет аквариума',
      'Особый значок в профиле питомца',
      'Благодарность разработчика в титрах',
    ],
  },
  {
    id: 'tier_patron',
    name: 'Золотой Патрон 1996',
    jpName: '黄金のパトロン',
    priceRub: 299,
    priceUsd: 3.99,
    pearlsAwarded: 200,
    coinsAwarded: 3500,
    titleBadge: '⭐ VIP ПАТРОН',
    description: 'Полноценный VIP-статус! Золотая чешуя, эксклюзивные темы и вечная признательность.',
    benefits: [
      '+200 Золотых жемчужин',
      '+3,500 Монет',
      'Разблокировка Золотого скина рыбки',
      'Золотая корона над рыбкой',
      'Неоновая VIP-рамка в меню',
      'Увеличенный x2 заработок в мини-играх',
    ],
    isPopular: true,
  },
  {
    id: 'tier_emperor',
    name: 'Император Аквариума',
    jpName: '水槽の皇帝',
    priceRub: 699,
    priceUsd: 8.99,
    pearlsAwarded: 600,
    coinsAwarded: 10000,
    titleBadge: '👑 ИМПЕРАТОР',
    description: 'Максимальный уровень уважения! Открывает абсолютно всё и делает рыбку бессмертной легендой.',
    benefits: [
      '+600 Золотых жемчужин',
      '+10,000 Монет',
      'Все скины и темы сразу разблокированы',
      'Бесконечный запас золотых витаминов',
      'Эксклюзивный золотой замок на дне',
      'Персональная строка благодарности',
    ],
  },
];

const STORAGE_KEY = 'betta_tamagotchi_save_v1';

export const INITIAL_FISH_STATS: FishStats = {
  name: 'Катана',
  level: 1,
  experience: 0,
  maxExperience: 100,
  ageDays: 1,
  hunger: 80,
  cleanliness: 90,
  happiness: 85,
  energy: 90,
  health: 100,
  isSleeping: false,
  skin: 'tropical_paradise',
  theme: 'tokyo_neon_96',
  coins: 150,
  pearls: 10,
  isVip: false,
  unlockedSkins: ['tropical_paradise', 'royal_blue'],
  unlockedThemes: ['tokyo_neon_96'],
  unlockedAccessories: [],
  totalFeedings: 0,
  totalCleans: 0,
  totalPlays: 0,
  lastFedTimestamp: Date.now(),
  lastCleanedTimestamp: Date.now(),
  lastCareTimestamp: Date.now(),
  createdTimestamp: Date.now(),
};

export function loadFishStats(): FishStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_FISH_STATS, createdTimestamp: Date.now(), lastCareTimestamp: Date.now() };
    
    const parsed: FishStats = JSON.parse(raw);
    
    // Apply realistic time decay based on elapsed hours
    const now = Date.now();
    const elapsedMinutes = Math.max(0, (now - (parsed.lastCareTimestamp || now)) / (1000 * 60));
    
    // Calculate age in days
    const totalAgeDays = Math.max(1, Math.floor((now - (parsed.createdTimestamp || now)) / (1000 * 60 * 60 * 24)) + 1);
    
    // Moderate, kind decay: hunger drops ~5% per hour, cleanliness drops ~3% per hour
    // Tamagotchi never starves completely while user is away; minimum clamp is 15%
    const hungerDrop = Math.min(65, Math.floor(elapsedMinutes * 0.08));
    const cleanDrop = Math.min(50, Math.floor(elapsedMinutes * 0.05));
    const happyDrop = Math.min(40, Math.floor(elapsedMinutes * 0.06));

    const updatedHunger = Math.max(15, parsed.hunger - hungerDrop);
    const updatedClean = Math.max(20, parsed.cleanliness - cleanDrop);
    const updatedHappy = Math.max(25, parsed.happiness - happyDrop);
    const updatedHealth = Math.round((updatedHunger + updatedClean + updatedHappy) / 3);

    const prevUnlocked: FishColorPalette[] = Array.isArray(parsed.unlockedSkins) ? parsed.unlockedSkins : ['royal_blue'];
    const hasTropical = prevUnlocked.includes('tropical_paradise');
    const updatedUnlocked: FishColorPalette[] = hasTropical ? prevUnlocked : ['tropical_paradise', ...prevUnlocked];
    const updatedSkin: FishColorPalette = hasTropical ? (parsed.skin || 'tropical_paradise') : 'tropical_paradise';

    return {
      ...INITIAL_FISH_STATS,
      ...parsed,
      skin: updatedSkin,
      unlockedSkins: updatedUnlocked,
      ageDays: totalAgeDays,
      hunger: updatedHunger,
      cleanliness: updatedClean,
      happiness: updatedHappy,
      health: updatedHealth,
      lastCareTimestamp: now,
    };
  } catch {
    return { ...INITIAL_FISH_STATS };
  }
}

export function saveFishStats(stats: FishStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...stats,
      lastCareTimestamp: Date.now(),
    }));
  } catch {}
}

export function resetFishSave(): FishStats {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return { ...INITIAL_FISH_STATS, createdTimestamp: Date.now(), lastCareTimestamp: Date.now() };
}
