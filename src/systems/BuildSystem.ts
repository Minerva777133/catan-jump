import { Board } from '../map/Board';
import { GameConfig } from '../config/gameConfig';
import { PlayerState } from '../rules/Rules';
import { CatapultSystem } from './Catapult';

export class BuildSystem {
  constructor(private cfg: GameConfig, private board: Board) {}

  canBuildHouse(player: PlayerState) {
    const t = this.board.getTileAtPixel(player.pos);
    if (!t || t.hasHouse || t.hasCatapult) return false;
    return this.hasCost(player, this.cfg.BUILD_COST_HOUSE);
  }

  canBuildWeapon(player: PlayerState) {
    return this.hasCost(player, this.cfg.BUILD_COST_WEAPON);
  }

  /** 必须在“已有房子”的格子上建投石台 */
  canBuildCatapult(player: PlayerState) {
    const t = this.board.getTileAtPixel(player.pos);
    if (!t || !t.hasHouse) return false;
    return this.hasCost(player, this.cfg.BUILD_COST_CATAPULT);
  }

  buildHouse(player: PlayerState): boolean {
    const t = this.board.getTileAtPixel(player.pos);
    if (!t || t.hasHouse || t.hasCatapult) return false;
    if (!this.consume(player, this.cfg.BUILD_COST_HOUSE)) return false;
    t.hasHouse = true;
    player.houses += 1;
    return true;
  }

  buildWeapon(player: PlayerState): boolean {
    if (!this.consume(player, this.cfg.BUILD_COST_WEAPON)) return false;
    if (player.inventory['WEAPON'] == null) player.inventory['WEAPON'] = 0;
    const yieldCount = Math.max(1, Math.floor((this.cfg as any).WEAPON_YIELD || 1));
    player.inventory['WEAPON'] += yieldCount;
    return true;
  }

  /**
   * 建造投石台：在当前格（必须已有房子）扣费并由 catapults 替换为投石台
   * 返回是否成功。
   */
  buildCatapult(player: PlayerState, catapults: CatapultSystem): boolean {
    if (!this.canBuildCatapult(player)) return false;
    if (!this.consume(player, this.cfg.BUILD_COST_CATAPULT)) return false;
    return catapults.buildAtCurrent(player);
  }

  // ---------- 内部工具 ----------

  private hasCost(player: PlayerState, cost: Partial<Record<string, number>>) {
    for (const k in cost) {
      const need = cost[k] ?? 0;
      if ((player.inventory[k] ?? 0) < need) return false;
    }
    return true;
  }

  private consume(player: PlayerState, cost: Partial<Record<string, number>>) {
    if (!this.hasCost(player, cost)) return false;
    for (const k in cost) player.inventory[k] -= cost[k] ?? 0;
    return true;
  }
}
