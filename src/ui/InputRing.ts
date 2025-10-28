import Phaser from 'phaser';
import { GameConfig } from '../config/gameConfig';

export class InputRing {
  private g: Phaser.GameObjects.Graphics;         // ring graphics
  private energyG: Phaser.GameObjects.Graphics;    // charge arc
  private center = { x: 0, y: 0 };

  // help UI
  private helpContainer!: Phaser.GameObjects.Container;
  private helpBg!: Phaser.GameObjects.Graphics;
  private helpText!: Phaser.GameObjects.Text;

  // charge state
  private charge = 0;                 // 0..1
  private charging = false;
  private chargeStartMs = 0;
  private maxHoldMs = 800;            // default 0.8s, can be changed via setMaxHoldMs()

  // optional percent text (small)
  private pctText!: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene, private cfg: GameConfig) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(50);
    this.energyG = scene.add.graphics().setScrollFactor(0).setDepth(60);

    this.placeAtBottomRight();
    this.drawRing();
    this.buildHelp();
    this.buildPercentText();
    this.drawEnergy(); // initial

    // keep drawing crisp on resize
    scene.scale.on('resize', () => {
      this.placeAtBottomRight();
      this.drawRing();
      this.layoutHelp();
      this.layoutPercentText();
      this.drawEnergy();
    });

    // internal timer-based charging tick
    this.scene.events.on('update', this.updateTick, this);
  }

  /** 将圆环放在右下角（整像素，避免发虚） */
  private placeAtBottomRight() {
    const { width, height } = this.scene.scale;
    const m = 24;
    const r = this.cfg.RING_RADIUS + this.cfg.RING_THICK / 2;
    this.center.x = Math.round(width - m - r);
    this.center.y = Math.round(height - m - r);
  }

  /** 绘制圆环 */
  private drawRing() {
    const r = this.cfg.RING_RADIUS;
    this.g.clear();
    // 外环（背景）
    this.g.lineStyle(this.cfg.RING_THICK, 0x666666, 0.6);
    this.g.strokeCircle(this.center.x, this.center.y, r);

    // 内圈基线（能量条轨道）
    const trackThickness = Math.max(2, this.cfg.RING_THICK - 8);
    this.g.lineStyle(trackThickness, 0xffffff, 0.12);
    this.g.strokeCircle(this.center.x, this.center.y, r);
  }

  /** 构建帮助指引（高分辨率文本 + 自绘底板） */
  private buildHelp() {
    const dpi = Math.max(1, Math.ceil((window.devicePixelRatio || 1)));
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
      align: 'left',
      resolution: dpi,
      wordWrap: { width: 220, useAdvancedWrap: true },
      fixedWidth: 220
    };

    this.helpContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(100);
    this.helpBg = this.scene.add.graphics().setScrollFactor(0);
    this.helpText = this.scene.add.text(
      0,
      0,
      '🌀 Jump Guide\nDirection: cursor angle\nDistance: hold (max 0.8s)',
      style
    );

    this.helpContainer.add([this.helpBg, this.helpText]);
    this.layoutHelp();
  }

  /** 布局帮助指引（不越界，整像素，重绘底板） */
  private layoutHelp() {
    const pad = 8;
    const titleOffsetY = 0;
    const tb = this.helpText.getBounds();
    const w = Math.ceil(tb.width);
    const h = Math.ceil(tb.height);

    const { width } = this.scene.scale;
    const boxX = Math.round(this.center.x - Math.max(w, 160) / 2);
    const boxY = Math.round(this.center.y - this.cfg.RING_RADIUS - 76 + titleOffsetY);

    const margin = 12;
    const clampedX = Math.min(Math.max(boxX, margin), width - margin - (w + pad * 2));

    this.helpContainer.setPosition(clampedX, boxY);

    this.helpBg.clear();
    this.helpBg.fillStyle(0x000000, 0.35);
    this.helpBg.lineStyle(1, 0xffffff, 0.08);
    this.helpBg.fillRoundedRect(0, 0, w + pad * 2, h + pad * 2, 6);
    this.helpBg.strokeRoundedRect(0, 0, w + pad * 2, h + pad * 2, 6);

    this.helpText.setPosition(pad, pad);
  }

  /** 小百分比文字 */
  private buildPercentText() {
    const dpi = Math.max(1, Math.ceil((window.devicePixelRatio || 1)));
    this.pctText = this.scene.add
      .text(0, 0, '0%', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        resolution: dpi
      })
      .setScrollFactor(0)
      .setDepth(90)
      .setAlpha(0.9);
    this.layoutPercentText();
  }

  private layoutPercentText() {
    const yOffset = -4;
    this.pctText.setPosition(
      Math.round(this.center.x - this.pctText.width / 2),
      Math.round(this.center.y + yOffset - this.pctText.height / 2)
    );
  }

  /** 绘制能量弧度（0..1） */
  private drawEnergy() {
    const r = this.cfg.RING_RADIUS;
    const startAngle = -Math.PI / 2; // 从上方开始
    const endAngle = startAngle + this.charge * Math.PI * 2;

    const arcThickness = Math.max(2, this.cfg.RING_THICK - 8);

    this.energyG.clear();

    if (this.charge > 0) {
      // 主进度弧
      this.energyG.lineStyle(arcThickness, 0x00e0ff, 0.95);
      this.energyG.beginPath();
      this.energyG.arc(this.center.x, this.center.y, r, startAngle, endAngle, false);
      this.energyG.strokePath();
      this.energyG.closePath();

      // 尾端小帽
      const capR = arcThickness / 2;
      const capX = this.center.x + r * Math.cos(endAngle);
      const capY = this.center.y + r * Math.sin(endAngle);
      this.energyG.fillStyle(0x00e0ff, 0.95);
      this.energyG.fillCircle(capX, capY, capR);
    }

    // 百分比文本
    this.pctText.setText(`${Math.round(this.charge * 100)}%`);
    this.layoutPercentText();

    if (this.charge >= 1 && !this.charging) this.pulseOnce();
  }

  /** 轻微脉冲动画（满槽提示） */
  private pulseOnce() {
    this.scene.tweens.add({
      targets: [this.energyG, this.pctText],
      alpha: { from: 1, to: 0.6 },
      scale: { from: 1, to: 1.04 },
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeInOut'
    } as any);
  }

  /** 点击是否在圆环带内 */
  isInsideScreen(pt: { x: number; y: number }) {
    const d = Math.hypot(pt.x - this.center.x, pt.y - this.center.y);
    const inner = this.cfg.RING_RADIUS - this.cfg.RING_THICK / 2;
    const outer = this.cfg.RING_RADIUS + this.cfg.RING_THICK / 2;
    return d >= inner && d <= outer;
  }

  /** 鼠标角度 */
  angleFromScreen(pt: { x: number; y: number }) {
    return Math.atan2(pt.y - this.center.y, pt.x - this.center.x);
  }

  /** 闪烁效果（点击反馈） */
  flash() {
    this.scene.tweens.add({
      targets: this.g,
      alpha: { from: 0.6, to: 1 },
      duration: 100,
      yoyo: true
    });
  }

  // ---------------------------
  // 🔌 Public API for charging
  // ---------------------------

  /** 直接设置蓄力进度（0..1）。如果你在别处自己计时，推荐用这个。 */
  setChargeProgress(p: number) {
    const clamped = Phaser.Math.Clamp(p, 0, 1);
    if (clamped === this.charge) return;
    this.charge = clamped;
    this.drawEnergy();
  }

  /** 使用内置计时开始蓄力（pointerdown 时机调用） */
  startCharge() {
    this.charging = true;
    this.chargeStartMs = this.scene.time.now;
    this.setChargeProgress(0);
  }

  /** 使用内置计时结束蓄力（pointerup 时机调用），返回最终 0..1 进度 */
  endCharge(): number {
    if (!this.charging) return this.charge;
    this.charging = false;
    return this.charge;
  }

  /** 手动清零（例如完成跳跃后调用） */
  resetCharge() {
    this.setChargeProgress(0);
  }

  /** 调整内置计时的最大按住时长（毫秒） */
  setMaxHoldMs(ms: number) {
    this.maxHoldMs = Math.max(1, ms | 0);
  }

  /** 内置计时每帧推进 */
  private updateTick() {
    if (!this.charging) return;
    const elapsed = this.scene.time.now - this.chargeStartMs;
    const p = Phaser.Math.Clamp(elapsed / this.maxHoldMs, 0, 1);
    this.setChargeProgress(p);
  }

  /** 显隐力度 UI（不影响主圆环） */
  setChargeVisible(v: boolean) {
    this.energyG.setVisible(v);
    this.pctText.setVisible(v);
  }

  /** 清理 */
  destroy() {
    this.scene.events.off('update', this.updateTick, this);
    this.g.destroy();
    this.energyG.destroy();
    this.helpContainer.destroy();
    this.pctText.destroy();
  }
}
