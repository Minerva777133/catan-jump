import Phaser from 'phaser';
import { Board } from '../map/Board';

export interface Enemy {
  q: number;
  r: number;
  g: Phaser.GameObjects.Graphics;
}

type EnemyUndoState = {
  list: { q: number; r: number }[];
  lastTurnSpawned: number;
};

export class EnemySystem {
  private enemies: Enemy[] = [];
  private lastTurnSpawned = -999;

  constructor(private scene: Phaser.Scene, private board: Board) { }

  getState(): EnemyUndoState {
    return {
      list: this.enemies.map(e => ({ q: e.q, r: e.r })),
      lastTurnSpawned: this.lastTurnSpawned,
    };
  }

  restore(state: EnemyUndoState) {
    this.clear();
    this.lastTurnSpawned = state?.lastTurnSpawned ?? -999;
    if (!state?.list) return;
    for (const { q, r } of state.list) {
      const t = this.board.getTileByAxial(q, r);
      if (!t) continue;
      const g = this.scene.add.graphics();
      this.drawWolf(g, t.center.x, t.center.y);
      this.enemies.push({ q, r, g });
    }
  }

  /** 历史兼容：旧名“顺时针”，实际执行逆时针，避免到处改调用点 */
  moveClockwiseAll() {
    this.moveCounterclockwiseAll();
  }

  /** 真正实现：逆时针移动所有怪物 */
  private moveCounterclockwiseAll() {
    const moved: Enemy[] = [];
    for (const e of this.enemies) {
      const t = this.board.getTileByAxial(e.q, e.r);
      if (!t) continue;

      const rad = this.board.ringRadius(t);
      if (rad === 0) {
        this.drawWolf(e.g, t.center.x, t.center.y);
        moved.push(e);
        continue;
      }

      const ring = this.board.ring(rad);
      if (ring.length === 0) continue;

      const idx = ring.findIndex(x => x.axial.q === e.q && x.axial.r === e.r);
      if (idx < 0) {
        this.drawWolf(e.g, t.center.x, t.center.y);
        moved.push(e);
        continue;
      }

      // ✅ 改为视觉上逆时针（适配 Board.ring 的逆序定义）
      const next = ring[(idx + 1) % ring.length];


      // 被其它敌人占据则停留
      if (this.enemies.some(other => other !== e && other.q === next.axial.q && other.r === next.axial.r)) {
        this.drawWolf(e.g, t.center.x, t.center.y);
        moved.push(e);
        continue;
      }

      // 更新坐标
      e.q = next.axial.q;
      e.r = next.axial.r;

      // 撞建筑：清建筑并自毁
      if (next.hasHouse || next.hasCatapult) {
        next.hasHouse = false;
        next.hasCatapult = false;
        e.g.destroy();
        continue;
      }

      this.drawWolf(e.g, next.center.x, next.center.y);
      moved.push(e);
    }
    this.enemies = moved;
  }

  /** 按回合间隔生成 */
  trySpawnByTurns(turns: number, spawnRate: number, playerPos: { x: number; y: number }) {
    if (spawnRate <= 0) return;
    if (turns > 0 && turns % spawnRate === 0 && this.lastTurnSpawned !== turns) {
      this.spawn(playerPos);
      this.lastTurnSpawned = turns;
    }
  }

  /** 随机空地生成一只狼 */
  private spawn(playerPos: { x: number; y: number }) {
    const empty = this.board.tiles.filter(
      t => !t.hasHouse && !t.hasCatapult &&
        !this.enemies.some(e => e.q === t.axial.q && e.r === t.axial.r) &&
        Math.hypot(t.center.x - playerPos.x, t.center.y - playerPos.y) > 20
    );
    if (empty.length === 0) return;

    const tile = Phaser.Utils.Array.GetRandom(empty);
    const g = this.scene.add.graphics();
    this.drawWolf(g, tile.center.x, tile.center.y);
    this.enemies.push({ q: tile.axial.q, r: tile.axial.r, g });
  }

  hitOn(q: number, r: number): Enemy | undefined {
    return this.enemies.find(e => e.q === q && e.r === r);
  }

  remove(e: Enemy) {
    e.g.destroy();
    this.enemies = this.enemies.filter(x => x !== e);
  }

  clear() {
    this.enemies.forEach(e => e.g.destroy());
    this.enemies = [];
  }

  removeAt(axials: { q: number; r: number }[]) {
    const keys = new Set(axials.map(a => `${a.q},${a.r}`));
    const keep: Enemy[] = [];
    for (const e of this.enemies) {
      const k = `${e.q},${e.r}`;
      if (keys.has(k)) e.g.destroy();
      else keep.push(e);
    }
    this.enemies = keep;
  }

  getAll() {
    return this.enemies.map(e => ({ q: e.q, r: e.r }));
  }

  /** 黑色“狼”图形 */
  private drawWolf(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.clear();
    const S = 12;
    g.fillStyle(0x000000, 1);

    g.fillCircle(x, y, S);

    // 耳朵
    g.beginPath();
    g.moveTo(x - S * 0.5, y - S * 0.4);
    g.lineTo(x - S * 0.9, y - S * 1.0);
    g.lineTo(x - S * 0.2, y - S * 0.8);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(x + S * 0.5, y - S * 0.4);
    g.lineTo(x + S * 0.9, y - S * 1.0);
    g.lineTo(x + S * 0.2, y - S * 0.8);
    g.closePath();
    g.fillPath();

    // 鼻口
    g.beginPath();
    g.moveTo(x - S * 0.2, y + S * 0.2);
    g.lineTo(x + S * 1.0, y + S * 0.1);
    g.lineTo(x + S * 0.6, y + S * 0.5);
    g.closePath();
    g.fillPath();
  }
}
