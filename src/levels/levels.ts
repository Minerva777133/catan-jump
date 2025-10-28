import { defaultConfig as CFG } from '../config/gameConfig';
import { LevelSpec } from './LevelSpec';

export const LEVELS: LevelSpec[] = [
  {
    id: 1,
    name: 'Level 1',
    overrides: {
      MAP_RADIUS: 2,
      SCORE_TO_WIN: 1,
      TURN_LIMIT: 4,
      RESOURCE_WEIGHTS: { ...CFG.RESOURCE_WEIGHTS, STONE: 0 },
    },
  },
  {
    id: 2,
    name: 'Level 2',
    overrides: {
      MAP_RADIUS: 3,
      SCORE_TO_WIN: 5,
      TURN_LIMIT: 16,
      RESOURCE_WEIGHTS: { ...CFG.RESOURCE_WEIGHTS, STONE: 0 },
    },
  },

  // ✅ Level 3：两环 + 只保留石头/木头（1:1）+ 敌人逆时针移动
  {
    id: 3,
    name: 'Level 3 — Monsters & Weapons (Stone/Wood only, R=2, counterclockwise)',
    overrides: {
      MAP_RADIUS: 2,
      SCORE_TO_WIN: 3,
      TURN_LIMIT: 12,
      RESOURCE_WEIGHTS: {
        BRICK: 0,
        WHEAT: 0,
        SHEEP: 0,
        WOOD: 1,
        STONE: 1,
      },
    },
    enemies: [
      {
        kind: 'monster',
        params: {
          spawnRate: 3,
          mobile: true,
          movePattern: 'counterclockwise',
        },
      },
    ],
  },

  {
    id: 4,
    name: 'Level 4 — Clockwise Monsters & (Catapults optional)',
    overrides: {
      MAP_RADIUS: 3,
      SCORE_TO_WIN: 10,
      RESOURCE_WEIGHTS: { ...CFG.RESOURCE_WEIGHTS },
    },
    enemies: [{ kind: 'monster', params: { spawnRate: 3, mobile: true, movePattern: 'counterclockwise' } }],
  },
];

export function getLevelSpec(id: number): LevelSpec {
  return LEVELS.find((L) => L.id === id) ?? LEVELS[0];
}
