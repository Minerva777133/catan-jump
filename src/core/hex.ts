export type Axial = { q: number; r: number };

export type ResourceType = 'BRICK' | 'WHEAT' | 'WOOD' | 'SHEEP' | 'STONE';

export const RESOURCE_COLORS: Record<ResourceType, number> = {
  BRICK: 0x8b3e2f,   // 砖 - 砖红
  WHEAT: 0xd8b44a,   // 小麦 - 金黄
  WOOD:  0x2f5d31,   // 木头 - 深绿
  SHEEP: 0xb2d39c,   // 羊 - 浅绿
  STONE: 0x8a8f98,   // 石头 - 灰蓝
};

export function axialToPixel(center: { x: number; y: number }, a: Axial, hexSize: number) {
  const x = hexSize * Math.sqrt(3) * (a.q + a.r / 2) + center.x;
  const y = hexSize * 1.5 * a.r + center.y;
  return { x, y };
}

export function neighbors(a: Axial): Axial[] {
  const dirs = [
    { q: +1, r: 0 }, { q: +1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: +1 }, { q: 0, r: +1 },
  ];
  return dirs.map(d => ({ q: a.q + d.q, r: a.r + d.r }));
}

export function traceHexPath(g: Phaser.GameObjects.Graphics, c: { x: number; y: number }, R: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i + Math.PI / 6;
    pts.push({ x: c.x + R * Math.cos(ang), y: c.y + R * Math.sin(ang) });
  }
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 6; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
}
