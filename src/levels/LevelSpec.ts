import { GameConfig } from '../config/gameConfig';

export type LevelSpec = {
  id: number;
  name: string;
  overrides: Partial<GameConfig>;
  enemies?: Array<{ kind: string; params?: Record<string, any> }>;
};
