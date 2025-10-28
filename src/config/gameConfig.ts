import { ResourceType } from '../core/hex';

export type GameConfig = {
  MAP_RADIUS: number;
  HEX_SIZE: number;
  RANDOM_ROTATE: boolean;

  JUMP_MIN_HEX: number;
  JUMP_MAX_HEX: number;
  PRESS_MS_FULL: number;

  RING_RADIUS: number;
  RING_THICK: number;

  BUILD_COST_HOUSE: Partial<Record<ResourceType | 'WEAPON', number>>;
  BUILD_COST_WEAPON: Partial<Record<ResourceType | 'WEAPON', number>>;
  BUILD_COST_CATAPULT: Partial<Record<ResourceType | 'WEAPON', number>>;

  WEAPON_YIELD: number;

  SCORE_TO_WIN: number;

  /** 0 表示不限制回合；>0 表示上限 */
  TURN_LIMIT: number;

  RESOURCE_WEIGHTS: Record<ResourceType, number>;
};

export const defaultConfig: GameConfig = {
  // ✅ 默认三环
  MAP_RADIUS: 3,
  HEX_SIZE: 44,
  RANDOM_ROTATE: true,

  JUMP_MIN_HEX: 0.25,
  JUMP_MAX_HEX: 3.0,
  PRESS_MS_FULL: 800,

  RING_RADIUS: 64,
  RING_THICK: 12,

  BUILD_COST_HOUSE: { BRICK: 1, WHEAT: 1, WOOD: 1, SHEEP: 1 },
  BUILD_COST_WEAPON: { STONE: 2, WOOD: 1 },
  BUILD_COST_CATAPULT: { STONE: 3, BRICK: 2 },

  WEAPON_YIELD: 1,

  SCORE_TO_WIN: 5,

  /** 默认不限制回合 */
  TURN_LIMIT: 0,

  // ✅ 默认五种资源都开启（权重可按需改）
  RESOURCE_WEIGHTS: {
    BRICK: 4,
    WHEAT: 4,
    WOOD: 4,
    SHEEP: 4,
    STONE: 4,
  },
};
