import Phaser from 'phaser';
import type { GameConfig } from '../config/gameConfig';
import type { Board } from '../map/Board';
import type { EnemySystem } from '../systems/Enemies';
import type { PlayerState } from '../rules/Rules';
import type { ResourceType } from '../core/hex';
import { RESOURCE_COLORS, traceHexPath } from '../core/hex';

/** 统一资源图标（WOOD 固定为 🌲 以保证兼容性） */
export const RESOURCE_EMOJI: Record<ResourceType | 'WEAPON', string> = {
  BRICK: '🧱',
  WHEAT: '🌾',
  WOOD: '🌲',   // ← 旧版更兼容
  SHEEP: '🐑',
  STONE: '⛰️',
  WEAPON: '⚔️',
};
export const getResourceEmoji = (k: ResourceType | 'WEAPON') => RESOURCE_EMOJI[k];

/**
 * 负责：地块底色、资源图标、建筑、怪物、玩家 的绘制与清理
 * 不负责：HUD
 */
export class ScenePainter {
  // 地图层
  private gTiles!: Phaser.GameObjects.Graphics;      // 地块底色 + 边框
  private gIcons!: Phaser.GameObjects.Container;     // 资源 emoji 文本层

  // 实体层
  private gGlyph!: Phaser.GameObjects.Graphics;      // 建筑（房子/投石台）
  private gMonsters!: Phaser.GameObjects.Graphics;   // 怪物
  private gPlayer!: Phaser.GameObjects.Graphics;     // 玩家

  constructor(private scene: Phaser.Scene, private cfg: GameConfig) {
    // 地图层
    this.gTiles = scene.add.graphics();
    this.gIcons = scene.add.container(0, 0);

    // 实体层
    this.gGlyph = scene.add.graphics();
    this.gMonsters = scene.add.graphics();
    this.gPlayer = scene.add.graphics();
  }

  /** 一次性渲染整张场景（地块+资源+实体） */
  renderAll(board: Board, enemies: EnemySystem | undefined, player: PlayerState) {
    this.drawBoard(board);
    this.drawBuildings(board);
    this.drawMonsters(enemies, board);
    this.drawPlayer(player);
  }

  /** 仅重绘地图（地块+资源图标） */
  drawBoard(board: Board) {
    // 地块
    this.gTiles.clear();
    for (const t of board.tiles) {
      this.gTiles.fillStyle(RESOURCE_COLORS[t.resource], 1);
      this.gTiles.lineStyle(1, 0x222222, 1);
      traceHexPath(this.gTiles, t.center, this.cfg.HEX_SIZE);
      this.gTiles.fillPath();
      this.gTiles.strokePath();
    }

    // 资源 emoji
    this.gIcons.removeAll(true);
    const iconFontPx = Math.max(14, Math.floor(this.cfg.HEX_SIZE * 0.85));
    for (const t of board.tiles) {
      const emoji = RESOURCE_EMOJI[t.resource];
      const txt = this.scene.add.text(t.center.x, t.center.y, emoji, {
        fontFamily: 'monospace',
        fontSize: `${iconFontPx}px`,
        color: '#ffffff',
      })
        .setOrigin(0.5)
        .setDepth(0);
      txt.setShadow(0, 1, '#000', 2, true, true);
      this.gIcons.add(txt);
    }
  }

  /** 清空所有图层（不会销毁对象） */
  clearAll() {
    // 地图层
    this.gTiles.clear();
    this.gIcons.removeAll(true);
    // 实体层
    this.gGlyph.clear();
    this.gMonsters.clear();
    this.gPlayer.clear();
  }

  /** 绘制：所有建筑（房子、投石台） */
  drawBuildings(board: Board) {
    this.gGlyph.clear();
    for (const t of board.tiles) {
      if (t.hasCatapult) this.drawCatapult(t.center);
      else if (t.hasHouse) this.drawHouse(t.center);
    }
  }

  /** 绘制：所有怪物（在建筑之上） */
  drawMonsters(enemies?: EnemySystem, board?: Board) {
    this.gMonsters.clear();
    if (!enemies || !board) return;

    const anyEnemies = enemies as any;
    let list: any[] | undefined;

    if (typeof anyEnemies.getAll === 'function') list = anyEnemies.getAll();
    else if (Array.isArray(anyEnemies.list)) list = anyEnemies.list;
    else if (Array.isArray(anyEnemies.enemies)) list = anyEnemies.enemies;
    else if (Array.isArray(anyEnemies.items)) list = anyEnemies.items;
    else if (Array.isArray(anyEnemies.entities)) list = anyEnemies.entities;

    if (!Array.isArray(list)) return;

    for (const it of list) {
      // 已有 center
      if (it?.center && typeof it.center.x === 'number' && typeof it.center.y === 'number') {
        this.drawWolfIcon(it.center);
        continue;
      }
      // axial 形式：{ q,r } 或 { axial:{q,r} }
      let q: number | undefined, r: number | undefined;
      if (typeof it?.q === 'number' && typeof it?.r === 'number') { q = it.q; r = it.r; }
      else if (it?.axial && typeof it.axial.q === 'number' && typeof it.axial.r === 'number') { q = it.axial.q; r = it.axial.r; }
      if (typeof q === 'number' && typeof r === 'number') {
        const t = board.tiles.find(tt => tt.axial.q === q && tt.axial.r === r);
        if (t) this.drawWolfIcon(t.center);
      }
    }
  }

  /** 绘制：玩家（最上层） */
  drawPlayer(player: PlayerState) {
    this.gPlayer.clear();
    this.drawPlayerIcon(player.pos);
  }

  // ====== 具体绘制实现（保持与原版一致的外观） ======

  /** 主角：简洁的冒险者（白色基调，带帽沿+披风感） */
  private drawPlayerIcon(p: { x: number; y: number }) {
    const g = this.gPlayer;
    const S = Math.max(10, Math.floor(this.cfg.HEX_SIZE * 0.28)); // 尺寸随 HEX 变化

    // 帽沿
    g.fillStyle(0xffffff, 1);
    g.fillRect(p.x - S * 0.9, p.y - S * 1.6, S * 1.8, S * 0.18);

    // 帽顶
    g.fillCircle(p.x, p.y - S * 1.8, S * 0.65);

    // 头
    g.fillCircle(p.x, p.y - S * 1.2, S * 0.55);

    // 身体（三角披风感）
    g.beginPath();
    g.moveTo(p.x, p.y - S * 0.6);
    g.lineTo(p.x - S * 0.9, p.y + S * 0.9);
    g.lineTo(p.x + S * 0.9, p.y + S * 0.9);
    g.closePath();
    g.fillPath();

    // 手臂（持杖姿态）
    g.lineStyle(2, 0xffffff, 1);
    g.strokeLineShape(new Phaser.Geom.Line(
      p.x + S * 0.35, p.y - S * 0.6,
      p.x + S * 0.35, p.y + S * 0.9
    ));
    g.strokeLineShape(new Phaser.Geom.Line(
      p.x + S * 0.35, p.y - S * 0.6,
      p.x + S * 0.75, p.y - S * 1.4
    ));
    g.fillCircle(p.x + S * 0.75, p.y - S * 1.4, S * 0.12);
  }

  /** 怪物：纯黑大灰狼剪影 */
  private drawWolfIcon(c: { x: number; y: number }) {
    const g = this.gMonsters;
    const S = Math.max(10, Math.floor(this.cfg.HEX_SIZE * 0.26)); // 怪物整体尺寸

    g.fillStyle(0x000000, 1);

    // 头部圆
    g.fillCircle(c.x, c.y, S);

    // 两个尖耳（三角形）
    g.beginPath();
    g.moveTo(c.x - S * 0.5, c.y - S * 0.4);
    g.lineTo(c.x - S * 0.95, c.y - S * 1.05);
    g.lineTo(c.x - S * 0.2, c.y - S * 0.85);
    g.closePath();
    g.fillPath();

    g.beginPath();
    g.moveTo(c.x + S * 0.5, c.y - S * 0.4);
    g.lineTo(c.x + S * 0.95, c.y - S * 1.05);
    g.lineTo(c.x + S * 0.2, c.y - S * 0.85);
    g.closePath();
    g.fillPath();

    // 长口鼻剪影（多边形）
    g.beginPath();
    g.moveTo(c.x - S * 0.2, c.y + S * 0.2);
    g.lineTo(c.x + S * 1.0, c.y + S * 0.1);
    g.lineTo(c.x + S * 0.65, c.y + S * 0.5);
    g.closePath();
    g.fillPath();
  }

  private drawHouse(c: { x: number; y: number }) {
    const g = this.gGlyph; const w = 18, h = 14;
    g.fillStyle(0x2e2e2e, 1);
    g.fillRect(c.x - w / 2, c.y - h / 2 + 4, w, h);
    g.fillStyle(0xf4e04d, 1);
    g.beginPath(); g.moveTo(c.x, c.y - h / 2 - 6);
    g.lineTo(c.x - w / 2 - 2, c.y - h / 2 + 4);
    g.lineTo(c.x + w / 2 + 2, c.y - h / 2 + 4);
    g.closePath(); g.fillPath();
  }

  /** 投石台：蓝色基调，避免与石头混淆（保持原风格） */
  private drawCatapult(c: { x: number; y: number }) {
    const g = this.gGlyph;
    // 底座：深蓝灰
    g.fillStyle(0x1e3a5f, 1);
    g.fillRect(c.x - 10, c.y + 2, 20, 6);

    // 斜臂：亮蓝线条
    g.lineStyle(3, 0x4da3ff, 1);
    g.strokeLineShape(new Phaser.Geom.Line(c.x - 6, c.y + 2, c.x + 8, c.y - 10));

    // 投石袋：浅蓝圆
    g.fillStyle(0x8fd3ff, 1);
    g.fillCircle(c.x + 10, c.y - 12, 3);
  }
}
