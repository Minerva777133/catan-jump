import { Board, TileData } from '../map/Board';
import { GameConfig } from '../config/gameConfig';
import { PlayerState } from '../rules/Rules';
import { neighbors } from '../core/hex';
import { EnemySystem } from './Enemies';

export class CatapultSystem {
  private spots = new Set<string>(); // 以 q,r 作为键的集合

  constructor(private cfg: GameConfig, private board: Board) {}

  private key(q: number, r: number) { return `${q},${r}`; }

  /** 将“房子”替换为“投石台”，并记录坐标；不消耗资源（资源由 BuildSystem 校验/扣除） */
  buildAtCurrent(player: PlayerState): boolean {
    const t = this.board.getTileAtPixel(player.pos);
    if (!t || !t.hasHouse) return false;
    t.hasHouse = false;
    t.hasCatapult = true;
    this.spots.add(this.key(t.axial.q, t.axial.r));
    return true;
  }

  /** 投石台攻击：对每个投石台，清理周围六个邻居格的怪物。返回被清理的坐标列表。 */
  attack(enemies: EnemySystem): { q: number; r: number }[] {
    const removed: { q: number; r: number }[] = [];
    for (const s of this.spots) {
      const [q, r] = s.split(',').map(Number);
      const t = this.board.getTileByAxial(q, r);
      if (!t) continue;
      const adj = neighbors(t.axial)
        .map(a => this.board.getTileByAxial(a.q, a.r))
        .filter(Boolean) as TileData[];
      const ax = adj.map(ti => ti.axial);
      enemies.removeAt(ax);
      removed.push(...ax);
    }
    return removed;
  }

  /** 如果投石台被怪物撞到（移动阶段），会在 Enemies 内部把 t.hasCatapult=false，这里同步集合 */
  syncFromBoard() {
    const fresh = new Set<string>();
    for (const t of this.board.tiles) {
      if (t.hasCatapult) fresh.add(this.key(t.axial.q, t.axial.r));
    }
    this.spots = fresh;
  }
}
