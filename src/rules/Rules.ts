import { GameConfig } from '../config/gameConfig';
import { Board } from '../map/Board';

export type PlayerState = {
  pos: { x: number; y: number };
  inventory: Record<string, number>;
  houses: number;
  turns: number;
};

export class Rules {
  constructor(private cfg: GameConfig) {}

  /** 根据按压时间与角度计算跳跃后的坐标 */
  simulateJump(
    from: { x: number; y: number },
    input: { pressMs: number; angleRad: number },
    hexPixel: number
  ) {
    const ratio = Math.min(1, input.pressMs / this.cfg.PRESS_MS_FULL);
    const lengthHex =
      this.cfg.JUMP_MIN_HEX +
      (this.cfg.JUMP_MAX_HEX - this.cfg.JUMP_MIN_HEX) * ratio;
    const dist = lengthHex * hexPixel;
    return {
      x: from.x + Math.cos(input.angleRad) * dist,
      y: from.y + Math.sin(input.angleRad) * dist,
    };
  }

  /**
   * 落地结算（独立安全版）
   * - 若 newPos 不在任何六边形内 → OUT_OF_MAP（不修改任何状态）
   * - 若在多个重叠地块内 → 取最上层（最后一个）
   * - 若有效 → 更新位置并结算资源
   * - 回合数不在此处自增（由 Scene 统一管理）
   */
  settleLanding(player: PlayerState, board: Board, newPos: { x: number; y: number }) {
    const tiles = (board as any).getTilesAtPixel
      ? (board as any).getTilesAtPixel(newPos)
      : [board.getTileAtPixel(newPos)].filter(Boolean);

    if (!tiles || tiles.length === 0) {
      return { kind: 'OUT_OF_MAP' as const };
    }

    const tile = tiles[tiles.length - 1];
    player.pos = { ...newPos };

    const key = tile.resource as string;
    if (player.inventory[key] == null) player.inventory[key] = 0;
    player.inventory[key] += 1;
    if (tile.hasHouse) player.inventory[key] += 1;

    return { kind: 'OK' as const, tile };
  }
}
