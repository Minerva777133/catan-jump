import Phaser from 'phaser';
import { GameConfig } from '../config/gameConfig';
import { ResourceType } from '../core/hex';
import { getResourceEmoji } from './ScenePainter';

export type Inventory = Record<ResourceType | 'WEAPON', number>;

type Features = {
  showStoneBadge: boolean;
  showWeaponBadge: boolean;
  allowHouseBuild: boolean;
  allowWeaponBuild: boolean;
  allowCatapultBuild: boolean;
  showEnemies: boolean;
  showCatapults: boolean;
  scoreToWin: number;
  levelId: number;
  /** 新增：回合上限（0 表示不限） */
  turnLimit: number;
};

/** 🧱 单个资源徽章组件 */
class ResourceBadge {
  private container: Phaser.GameObjects.Container;
  private numText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, icon: string, color: number) {
    const w = 64, h = 26, r = 6;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setSize(w, h);

    const g = scene.add.graphics().setScrollFactor(0);
    g.fillStyle(color, 0.85);
    g.fillRoundedRect(0, 0, w, h, r);
    g.lineStyle(1, 0x000000, 0.2);
    g.strokeRoundedRect(0, 0, w, h, r);

    const iconText = scene.add.text(10, h / 2, icon, {
      fontFamily: 'monospace', fontSize: '16px', color: '#000'
    }).setOrigin(0, 0.5).setScrollFactor(0);

    this.numText = scene.add.text(w - 18, h / 2, '0', {
      fontFamily: 'monospace', fontSize: '16px', color: '#111'
    }).setOrigin(0.5).setScrollFactor(0);

    this.container.add([g, iconText, this.numText]);
  }

  setValue(n: number) { this.numText.setText(String(n)); }
  setPosition(x: number, y: number) { this.container.setPosition(x, y); }
  get width() { return this.container.width; }
  get display() { return this.container; }
}

/** 顶部行内按钮（用于 Guide）——文字严格居中 */
class InlineButton {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private w = 56;
  private h = 20;

  constructor(
    scene: Phaser.Scene,
    labelText: string,
    onClick: () => void,
    depth: number
  ) {
    this.bg = scene.add.rectangle(0, 0, this.w, this.h, 0x3a86ff, 1)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.15)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => this.bg.setFillStyle(0x5aa0ff))
      .on('pointerout', () => this.bg.setFillStyle(0x3a86ff));
    this.bg.setDepth(depth);

    this.label = scene.add.text(this.w / 2, 0, labelText, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
    })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.label.setDepth(depth);

    this.container = scene.add.container(0, 0, [this.bg, this.label])
      .setScrollFactor(0)
      .setDepth(depth)
      .setSize(this.w, this.h);
  }

  setPosition(x: number, centerY: number) {
    this.container.setPosition(x, centerY);
  }

  setVisible(v: boolean) { this.container.setVisible(v); }
  get width() { return this.w; }
}

/** 🧭 左上角信息面板：第1行 Level+Turns（x 或 x/y），第2行 Score/Kill（x/y） */
class InfoPanel {
  private label1!: Phaser.GameObjects.Text;
  private turnsText!: Phaser.GameObjects.Text;
  private line2!: Phaser.GameObjects.Text;

  private level = 1;
  private turns = 0;
  private score = 0;
  private scoreToWin = 0;
  private turnLimit = 0;

  private marginLeft = 0;
  private depth = 0;

  private fontStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#e0f4ff',
  };

  // 预留宽度（根据是否有限制选择“000/000”或“000”测量）
  private turnsReserveW = 0;
  private numBlockGap = 6;

  constructor(
    scene: Phaser.Scene,
    margin: number,
    depth: number,
    level: number,
    scoreToWin: number,
    turnLimit: number
  ) {
    this.level = level;
    this.scoreToWin = scoreToWin;
    this.turnLimit = turnLimit;
    this.marginLeft = margin;
    this.depth = depth;

    const baseY = margin + 8;

    this.label1 = scene.add.text(margin, baseY, '', this.fontStyle).setScrollFactor(0).setDepth(depth);
    this.turnsText = scene.add.text(0, baseY, '', this.fontStyle).setScrollFactor(0).setDepth(depth);
    this.line2 = scene.add.text(margin, baseY + 18, '', this.fontStyle).setScrollFactor(0).setDepth(depth);

    // 计算数字块保留宽度
    const sample = turnLimit > 0 ? '000/000' : '000';
    const meas = scene.add.text(0, 0, sample, this.fontStyle).setVisible(false);
    this.turnsReserveW = meas.width;
    meas.destroy();

    this.render();
  }

  private line2Label(): string {
    // ★ 第3关显示 Kill，其它关显示 Score
    return this.level === 3 ? 'Kill' : 'Score';
  }

  private render() {
    // 行1：Level + Turns
    const prefix = `Level: ${this.level}   Turns:`;
    this.label1.setText(prefix);

    const left = this.turns.toString().padStart(3, '0');
    const right = (this.turnLimit > 0) ? `/${String(this.turnLimit).padStart(3, '0')}` : '';
    this.turnsText.setText(` ${left}${right}`);

    const numX = this.label1.x + this.label1.width + this.numBlockGap;
    this.turnsText.setPosition(numX, this.label1.y);

    // 行2：Score/Kill 仅显示 x/y
    this.line2.setText(`${this.line2Label()}: ${this.score}/${this.scoreToWin}`);
  }

  update(turns: number, score: number) {
    this.turns = turns;
    this.score = score;
    this.render();
  }

  setLevel(level: number) { this.level = level; this.render(); }
  setScoreToWin(n: number) { this.scoreToWin = n; this.render(); }
  setTurnLimit(n: number) { this.turnLimit = n; this.render(); }

  get line1RightX(): number {
    return this.turnsText.x + this.turnsReserveW;
  }
  get line1CenterY(): number {
    return this.label1.y + this.label1.height / 2;
  }
  get leftMargin(): number { return this.marginLeft; }
  get panelDepth(): number { return this.depth; }
}

/** ⚙️ 左侧按钮组件 */
class SidebarButton {
  container: Phaser.GameObjects.Container;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    depth: number
  ) {
    const w = 90, h = 36;

    const bg = scene.add.rectangle(0, 0, w, h, 0xf4e04d, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x000000, 0.2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => bg.setFillStyle(0xffe36d))
      .on('pointerout', () => bg.setFillStyle(0xf4e04d));
    bg.setDepth(depth);

    const text = scene.add.text(w / 2, h / 2, label, {
      fontFamily: 'monospace', fontSize: '16px', color: '#111'
    }).setOrigin(0.5).setScrollFactor(0);
    text.setDepth(depth);

    this.container = scene.add
      .container(x, y, [bg, text])
      .setScrollFactor(0)
      .setDepth(depth);
  }
}

/** 🧾 左侧“得分说明”模块（第3关仅显示击杀加分） */
class ScorePanel {
  container: Phaser.GameObjects.Container;
  private readonly w = 240;
  private readonly pad = 10;
  private readonly titleH = 20;
  private readonly lineH = 18;

  constructor(scene: Phaser.Scene, x: number, y: number, depth: number, lines: string[]) {
    this.container = scene.add.container(x, y).setScrollFactor(0).setDepth(depth);
    this.rebuild(scene, lines, depth);
  }

  rebuild(scene: Phaser.Scene, lines: string[], depth: number) {
    this.container.removeAll(true);

    const drawLines = ['Scoring', ...lines];
    const h = this.pad * 2 + this.titleH + (drawLines.length - 1) * this.lineH;

    const bg = scene.add.rectangle(0, 0, this.w, h, 0x202020, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.08)
      .setScrollFactor(0)
      .setDepth(depth);
    this.container.add(bg);

    const title = scene.add.text(this.pad, this.pad, drawLines[0], {
      fontFamily: 'monospace', fontSize: '14px', color: '#eaeaea'
    }).setScrollFactor(0).setDepth(depth);
    this.container.add(title);

    for (let i = 1; i < drawLines.length; i++) {
      const t = scene.add.text(this.pad, this.pad + this.titleH + (i - 1) * this.lineH, drawLines[i], {
        fontFamily: 'monospace', fontSize: '13px', color: '#e0e0e0'
      }).setScrollFactor(0).setDepth(depth);
      this.container.add(t);
    }
  }

  setPosition(x: number, y: number) { this.container.setPosition(x, y); }
}

/** 🎯 HUD 主控类（按关卡特性动态显示） */
export class HUD {
  private header!: Phaser.GameObjects.Rectangle;
  private infoPanel!: InfoPanel;
  private badges: ResourceBadge[] = [];

  private sidebar!: Phaser.GameObjects.Container;
  private buildBtn!: SidebarButton;
  private undoBtn!: SidebarButton;
  private lastBtn!: SidebarButton;
  private nextBtn!: SidebarButton;
  private restartBtn!: SidebarButton;

  private buildMenu!: Phaser.GameObjects.Container;
  private buildMenuVisible = false;

  private scorePanel!: ScorePanel;

  /** 右侧配方卡片 */
  private receiptCard!: Phaser.GameObjects.Container;
  private receiptWidth = 240;

  /** 顶部 Guide 小按钮 */
  private guideBtn!: InlineButton;

  private readonly margin = 12;
  private readonly headerHeight = 60;
  private readonly sidebarGap = 10;
  private readonly depth = 100;

  constructor(
    private scene: Phaser.Scene,
    private cfg: GameConfig,
    private opts: {
      features: Features;
      onBuildHouse: () => void;
      onBuildWeapon?: () => void;
      onBuildCatapult?: () => void;
      onUndo: () => void;
      onRestart: () => void;
      onNext: () => void;
      onLast: () => void;
      onShowGuide?: () => void; // 触发关卡说明
    }
  ) {
    const { width } = scene.scale;

    // 顶部栏背景
    this.header = scene.add.rectangle(0, 0, width, this.headerHeight, 0x1a1a1a, 0.6)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.08)
      .setScrollFactor(0)
      .setDepth(this.depth);

    // 左上角：关卡 + 回合(含上限) + Score/Kill(含上限)
    this.infoPanel = new InfoPanel(
      scene,
      this.margin,
      this.depth,
      this.opts.features.levelId,
      this.opts.features.scoreToWin,
      this.opts.features.turnLimit
    );

    // 顶部行内 Guide 按钮（紧跟在第一行数字块之后，留固定空隙）
    this.guideBtn = new InlineButton(
      scene,
      'Guide',
      () => this.opts.onShowGuide && this.opts.onShowGuide(),
      this.depth
    );
    this.placeGuideButton();

    // 右上资源徽章
    const badgePlan: Array<{ key: ResourceType | 'WEAPON'; color: number; show: boolean; }> = [
      { key: 'BRICK',  color: 0xcd5c5c, show: true },
      { key: 'WHEAT',  color: 0xf1c40f, show: true },
      { key: 'WOOD',   color: 0x27ae60, show: true },
      { key: 'SHEEP',  color: 0x8fd694, show: true },
      { key: 'STONE',  color: 0x95a5a6, show: this.opts.features.showStoneBadge },
      { key: 'WEAPON', color: 0x9b59b6, show: this.opts.features.showWeaponBadge },
    ];
    for (const b of badgePlan) {
      if (!b.show) continue;
      const badge = new ResourceBadge(scene, getResourceEmoji(b.key), b.color);
      this.badges.push(badge);
      badge.display.setDepth(this.depth);
    }

    // 左侧按钮栏
    this.sidebar = scene.add
      .container(0, this.headerHeight + this.margin)
      .setScrollFactor(0)
      .setDepth(this.depth);

    let y = 0;
    this.buildBtn = new SidebarButton(scene, this.margin, y, 'Build', () => this.toggleBuildMenu(), this.depth);
    this.sidebar.add(this.buildBtn.container); y += 44 + this.sidebarGap;

    this.undoBtn = new SidebarButton(scene, this.margin, y, 'Undo', this.opts.onUndo, this.depth);
    this.sidebar.add(this.undoBtn.container); y += 44 + this.sidebarGap;

    this.lastBtn = new SidebarButton(scene, this.margin, y, 'Last Level', this.opts.onLast, this.depth);
    this.sidebar.add(this.lastBtn.container); y += 44 + this.sidebarGap;

    this.nextBtn = new SidebarButton(scene, this.margin, y, 'Next Level', this.opts.onNext, this.depth);
    this.sidebar.add(this.nextBtn.container); y += 44 + this.sidebarGap;

    this.restartBtn = new SidebarButton(scene, this.margin, y, 'Restart', this.opts.onRestart, this.depth);
    this.sidebar.add(this.restartBtn.container); y += 44;

    // Build 菜单（只显示本关可建造项）
    this.buildMenu = this.createBuildMenuFiltered();
    this.sidebar.add(this.buildMenu);
    this.buildMenu.setVisible(false);
    this.buildMenu.setDepth(this.depth);

    // 分数说明模块（第3关仅显示“击杀 +1”）
    const scoringLines = this.computeScoringLines();
    this.scorePanel = new ScorePanel(scene, this.margin, y + this.sidebarGap, this.depth, scoringLines);
    this.sidebar.add(this.scorePanel.container);

    // 右侧 Recipes
    this.receiptCard = this.createReceiptCardFiltered();
    this.receiptCard.setDepth(this.depth);

    this.layout();
    scene.scale.on('resize', () => {
      this.layout();
      this.placeGuideButton();
    });
  }

  /** 构造“只包含当前关卡允许建造项”的 Build 菜单 */
  private createBuildMenuFiltered() {
    const card = this.scene.add.container(this.margin + 110, 0).setScrollFactor(0).setDepth(this.depth);

    const items: Array<{ label: string; y: number; cb?: () => void; show: boolean; }> = [
      { label: '🏠  House', y: 8, cb: this.opts.onBuildHouse, show: this.opts.features.allowHouseBuild },
      { label: '⚔️  Weapon', y: 38, cb: this.opts.onBuildWeapon, show: this.opts.features.allowWeaponBuild && !!this.opts.onBuildWeapon },
      { label: '🏹  Catapult', y: 68, cb: this.opts.onBuildCatapult, show: this.opts.features.allowCatapultBuild && !!this.opts.onBuildCatapult },
    ];

    const visible = items.filter(i => i.show);
    const h = visible.length > 0 ? 20 + visible.length * 30 : 40;

    const w = 200;
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x202020, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.08)
      .setScrollFactor(0);
    card.add(bg);

    let row = 0;
    for (const it of visible) {
      const y = 8 + row * 30;
      const item = this.scene.add.text(10, y, it.label, {
        fontFamily: 'monospace', fontSize: '16px', color: '#eaeaea',
        backgroundColor: '#333333',
        padding: { left: 6, right: 6, top: 3, bottom: 3 }
      })
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => it.cb && it.cb())
        .on('pointerover', () => item.setBackgroundColor('#444444'))
        .on('pointerout', () => item.setBackgroundColor('#333333'));
      card.add(item);
      row++;
    }

    if (visible.length === 0) {
      const t = this.scene.add.text(10, 10, 'No builds available', {
        fontFamily: 'monospace', fontSize: '14px', color: '#b0b0b0'
      }).setScrollFactor(0);
      card.add(t);
    }

    return card;
  }

  /** 右侧 Recipes：仅包含本关允许的配方（第3关仍显示配方，但不计分由规则控制） */
  private createReceiptCardFiltered() {
    const card = this.scene.add.container(0, 0).setScrollFactor(0);

    const pad = 10;
    const titleH = 22;
    const lineH = 20;

    const fmtCost = (cost: Partial<Record<ResourceType | 'WEAPON', number>>) => {
      const order: (ResourceType | 'WEAPON')[] = ['BRICK', 'WHEAT', 'WOOD', 'SHEEP', 'STONE', 'WEAPON'];
      const parts: string[] = [];
      for (const k of order) {
        const v = cost[k];
        if (v && v > 0) {
          if (k === 'STONE' && !this.opts.features.showStoneBadge) continue;
          parts.push(`${getResourceEmoji(k)}${v}`);
        }
      }
      return parts.join(' + ');
    };

    const lines: string[] = [];
    if (this.opts.features.allowHouseBuild) {
      lines.push(`🏠 House = ${fmtCost(this.cfg.BUILD_COST_HOUSE)}`);
    }
    if (this.opts.features.allowWeaponBuild) {
      lines.push(`⚔️ Weapon = ${fmtCost(this.cfg.BUILD_COST_WEAPON)}`);
    }
    if (this.opts.features.allowCatapultBuild) {
      const catapultCost = fmtCost(this.cfg.BUILD_COST_CATAPULT);
      const catapultLine = catapultCost ? `🏹 Catapult = 🏠 + ${catapultCost}` : `🏹 Catapult = 🏠`;
      lines.push(catapultLine);
    }

    const height = pad * 2 + titleH + lines.length * lineH;
    const bg = this.scene.add.rectangle(0, 0, this.receiptWidth, Math.max(height, 52), 0x202020, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.08)
      .setScrollFactor(0);
    card.add(bg);

    const title = this.scene.add.text(pad, pad, 'Recipes', {
      fontFamily: 'monospace', fontSize: '16px', color: '#eaeaea'
    }).setScrollFactor(0);
    card.add(title);

    lines.forEach((txt, i) => {
      const t = this.scene.add.text(pad, pad + titleH + i * lineH, txt, {
        fontFamily: 'monospace', fontSize: '14px', color: '#e0e0e0'
      }).setScrollFactor(0);
      card.add(t);
    });

    if (lines.length === 0) {
      const t = this.scene.add.text(pad, pad + titleH, '—', {
        fontFamily: 'monospace', fontSize: '14px', color: '#777'
      }).setScrollFactor(0);
      card.add(t);
    }

    return card;
  }

  /** 计算本关“得分说明”行（第3关仅保留击杀 +1） */
  private computeScoringLines(): string[] {
    if (this.opts.features.levelId === 3) {
      return ['• ⚔️ Kill Monster: +1'];
    }
    const lines: string[] = [];
    if (this.opts.features.allowHouseBuild) lines.push('• 🏠 Build House: +1');
    if (this.opts.features.allowCatapultBuild) lines.push('• 🏹 Build Catapult: +2');
    if (this.opts.features.showEnemies) lines.push('• ⚔️ Kill Monster: +1');
    if (this.opts.features.showCatapults) lines.push('• Catapult auto-attack: +0');
    return lines;
  }

  private toggleBuildMenu() {
    this.buildMenuVisible = !this.buildMenuVisible;
    this.buildMenu.setVisible(this.buildMenuVisible);
  }

  private layout() {
    const { width } = this.scene.scale;
    this.header.setSize(width, this.headerHeight);

    // 徽章从右向左排
    let rx = width - this.margin;
    for (let i = this.badges.length - 1; i >= 0; i--) {
      const b = this.badges[i];
      b.setPosition(rx - b.width, this.margin + 8);
      rx -= b.width + 8;
    }

    // 右侧配方卡片定位：右侧、在顶部栏下面
    const cardX = width - this.margin - this.receiptWidth;
    const cardY = this.headerHeight + this.margin;
    this.receiptCard.setPosition(cardX, cardY);
  }

  /** 放置 Guide 按钮位置（贴在 Level/Turns 数字块之后） */
  private placeGuideButton() {
    const GAP = 16;
    const x = this.infoPanel.line1RightX + GAP;
    const cy = this.infoPanel.line1CenterY;
    this.guideBtn.setPosition(x, cy);
  }

  updateHUD(turns: number, score: number, inv: Inventory) {
    this.infoPanel.update(turns, score);
    // 第一行文本因 Turns 变化会变宽，重摆按钮
    this.placeGuideButton();

    const values: number[] = [inv.BRICK, inv.WHEAT, inv.WOOD, inv.SHEEP];
    if (this.opts.features.showStoneBadge) values.push(inv.STONE);
    if (this.opts.features.showWeaponBadge) values.push(inv.WEAPON);
    this.badges.forEach((b, i) => b.setValue(values[i] ?? 0));
  }
}

export { HUD as default };
