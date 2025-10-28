import Phaser from 'phaser';
import { Axial, ResourceType, axialToPixel } from '../core/hex';
import { GameConfig } from '../config/gameConfig';

export type TileData = {
  axial: Axial;
  center: { x: number; y: number };
  resource: ResourceType;
  hasHouse: boolean;
  hasCatapult: boolean;
};

export class Board {
  public tiles: TileData[] = [];
  private center = { x: 0, y: 0 };

  // 便捷索引
  private byKey = new Map<string, TileData>();
  private rings = new Map<number, TileData[]>(); // 半径 => 顺时针序列

  constructor(private cfg: GameConfig) {}

  randomize() {
    this.tiles = [];
    this.byKey.clear();
    this.rings.clear();

    const R = this.cfg.MAP_RADIUS;
    const coords: Axial[] = [];
    for (let q = -R; q <= R; q++) {
      for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
        coords.push({ q, r });
      }
    }

    const pool = this.buildResourcePool(coords.length);
    Phaser.Utils.Array.Shuffle(pool);

    for (let i = 0; i < coords.length; i++) {
      const a = coords[i];
      const res = pool[i % pool.length];
      const c = axialToPixel(this.center, a, this.cfg.HEX_SIZE);
      const t: TileData = { axial: a, center: c, resource: res, hasHouse: false, hasCatapult: false };
      this.tiles.push(t);
      this.byKey.set(this.key(a.q, a.r), t);
    }

    // 预生成各环的顺时针序列
    for (let rad = 1; rad <= R; rad++) {
      this.rings.set(rad, this.buildRing(rad));
    }
  }

  private buildResourcePool(n: number): ResourceType[] {
    const w = this.cfg.RESOURCE_WEIGHTS;
    const pairs: [ResourceType, number][] = [
      ['BRICK', w.BRICK], ['WHEAT', w.WHEAT], ['WOOD', w.WOOD], ['SHEEP', w.SHEEP], ['STONE', w.STONE],
    ];
    const total = pairs.reduce((s, [, v]) => s + Math.max(0, v), 0) || 1;
    const pool: ResourceType[] = [];
    for (const [res, weight] of pairs) {
      const cnt = Math.round((Math.max(0, weight) / total) * n);
      for (let i = 0; i < cnt; i++) pool.push(res);
    }
    while (pool.length < n) pool.push('WOOD');
    return pool;
  }

  private key(q: number, r: number) { return `${q},${r}`; }
  getTileByAxial(q: number, r: number) { return this.byKey.get(this.key(q, r)); }

  /** 严格命中：只返回“点在六边形内”的地块；不再使用“最近格兜底” */
  getTileAtPixel(p: { x: number; y: number }): TileData | undefined {
    const list = this.getTilesAtPixel(p);
    if (!list.length) return undefined;
    // 若未来有重叠层，默认取“最上层”（这里用最后一个）
    return list[list.length - 1];
  }

  /**
   * 返回包含点 p 的所有地块（为重叠/多层预留）
   * 判定：点在以 center 为圆心、半径 HEX_SIZE 的正六边形内（point-in-polygon）
   */
  getTilesAtPixel(p: { x: number; y: number }): TileData[] {
    const res: TileData[] = [];
    const size = this.cfg.HEX_SIZE;

    for (const t of this.tiles) {
      if (pointInHex(t.center, size, p)) res.push(t);
    }
    return res;
  }

  axialDistance(a: Axial, b: Axial = { q: 0, r: 0 }) {
    const dq = a.q - b.q, dr = a.r - b.r;
    const ds = -(a.q + a.r) - (-(b.q + b.r));
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
  }

  /** 顺时针环序（起点 q=rad,r=0） */
  private buildRing(rad: number): TileData[] {
    const dirs: Axial[] = [
      { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: +1 },
      { q: 0, r: +1 }, { q: +1, r: 0 }, { q: +1, r: -1 },
    ];
    let q = rad, r = 0; // 起点
    const out: TileData[] = [];
    for (let side = 0; side < 6; side++) {
      for (let step = 0; step < rad; step++) {
        const t = this.getTileByAxial(q, r);
        if (t) out.push(t);
        q += dirs[side].q;
        r += dirs[side].r;
      }
    }
    return out;
  }

  /** 获取所在环半径；中心点为 0 */
  ringRadius(t: TileData) { return this.axialDistance(t.axial); }
  /** 取某半径的顺时针数组 */
  ring(rad: number) { return this.rings.get(rad) ?? []; }

  /** —— 房屋的布尔快照 —— */
  getHouseState(): boolean[] { return this.tiles.map(t => t.hasHouse); }
  setHouseState(flags: boolean[]) {
    for (let i = 0; i < this.tiles.length; i++) this.tiles[i].hasHouse = !!flags[i];
  }

  /** —— 投石台的布尔快照（新增）—— */
  getCatapultState(): boolean[] { return this.tiles.map(t => t.hasCatapult); }
  setCatapultState(flags: boolean[]) {
    for (let i = 0; i < this.tiles.length; i++) this.tiles[i].hasCatapult = !!flags[i];
  }
}

/** ---------- 工具：点是否在“点顶（pointy-top）六边形”内 ---------- */
function hexVertices(center: { x: number; y: number }, size: number) {
  // pointy-top：从正上方顶点开始，依次每 60°
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + i * (Math.PI / 3); // -90°, -30°, 30°, 90°, 150°, 210°
    verts.push({ x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) });
  }
  return verts;
}

function pointInPolygon(poly: { x: number; y: number }[], p: { x: number; y: number }) {
  // 标准 ray-casting
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) &&
      (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInHex(center: { x: number; y: number }, size: number, p: { x: number; y: number }) {
  // 先做快速圆半径裁剪，再做精确多边形测试
  const dx = p.x - center.x, dy = p.y - center.y;
  const r2 = size * size;
  if (dx * dx + dy * dy > 1.05 * r2) return false; // 1.05：允许少许可视差
  return pointInPolygon(hexVertices(center, size), p);
}
