import Phaser from 'phaser';

/**
 * 结束态遮罩（胜利 / 失败）
 * - 半透明黑底 + 居中卡片 + 胶囊按钮
 * - 支持淡入动画与按钮 Hover 效果
 * - 新增：可选副标题（subtitle），按钮命中范围更大
 * - API：show({ title, subtitle?, buttons }), hide()
 */
export class EndOverlay {
  private bg!: Phaser.GameObjects.Rectangle;
  private card!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private buttonsContainer!: Phaser.GameObjects.Container;
  private visible = false;

  // 视觉参数
  private cardWidth = 380;
  private baseCardHeight = 220; // 作为最小高度；实际会根据按钮/副标题稍微自适应

  constructor(private scene: Phaser.Scene) {
    const { width, height } = scene.scale;

    // 半透明黑幕
    this.bg = scene.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.45)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false)
      .setAlpha(0);

    // 卡片容器（居中）
    this.card = scene.add
      .container(width / 2, height / 2)
      .setScrollFactor(0)
      .setDepth(1001)
      .setVisible(false)
      .setAlpha(0);

    // 卡片背景（圆角 + 伪投影）
    const cardBg = scene.add
      .rectangle(0, 0, this.cardWidth, this.baseCardHeight, 0x111111, 0.92)
      .setStrokeStyle(2, 0xffffff, 0.06)
      .setScrollFactor(0);
    const cardShadow = scene.add
      .rectangle(0, 0, this.cardWidth + 4, this.baseCardHeight + 4, 0xffffff, 0.06)
      .setScrollFactor(0);

    this.titleText = scene.add
      .text(0, -64, '', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    // 新增：副标题（原因提示）
    this.subtitleText = scene.add
      .text(0, -34, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#d0d0d0',
        align: 'center',
        wordWrap: { width: this.cardWidth - 40, useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    this.buttonsContainer = scene.add.container(0, 36).setScrollFactor(0);

    this.card.add([cardShadow, cardBg, this.titleText, this.subtitleText, this.buttonsContainer]);

    // 监听尺寸变化时，重新放置遮罩与卡片
    scene.scale.on('resize', () => {
      const { width, height } = scene.scale;
      this.bg.setPosition(width / 2, height / 2).setDisplaySize(width, height);
      this.card.setPosition(width / 2, height / 2);
    });
  }

  show(opts: {
    title: string;
    subtitle?: string;
    buttons: { label: string; onClick: () => void; bg?: number; fg?: string }[];
  }) {
    const { width, height } = this.scene.scale;

    // 清理旧按钮
    this.buttonsContainer.removeAll(true);

    // 标题/副标题
    this.titleText.setText(opts.title);
    if (opts.subtitle && opts.subtitle.trim().length > 0) {
      this.subtitleText.setText(opts.subtitle);
      this.subtitleText.setVisible(true);
    } else {
      this.subtitleText.setText('');
      this.subtitleText.setVisible(false);
    }

    // 构建按钮（纵向列表）
    const marginY = 14;
    let y = 0;
    let buttonsTotalH = 0;
    for (const b of opts.buttons) {
      const btn = this.createCapsuleButton(
        0,
        y,
        b.label,
        b.onClick,
        b.bg ?? 0xf4e04d,
        b.fg ?? '#111'
      );
      this.buttonsContainer.add(btn);
      const h = btn.getData('height') as number;
      y += h + marginY;
      buttonsTotalH += h + marginY;
    }
    if (buttonsTotalH > 0) buttonsTotalH -= marginY; // 去掉最后一次累加的间距

    // 根据按钮/副标题调整卡片高度
    const cardBg = this.card.list.find((x) => x instanceof Phaser.GameObjects.Rectangle && x.width === this.cardWidth) as Phaser.GameObjects.Rectangle | undefined;
    const cardShadow = this.card.list.find((x) => x instanceof Phaser.GameObjects.Rectangle && x.width === this.cardWidth + 4) as Phaser.GameObjects.Rectangle | undefined;

    const dynamicH =
      160 +                    // 标题/副标题与上下留白的基础高度
      (this.subtitleText.visible ? 18 : 0) +
      buttonsTotalH;

    const cardH = Math.max(this.baseCardHeight, dynamicH);
    if (cardBg) cardBg.setSize(this.cardWidth, cardH);
    if (cardShadow) cardShadow.setSize(this.cardWidth + 4, cardH + 4);

    // 重新定位（因窗口可能变化）
    this.bg.setPosition(width / 2, height / 2).setDisplaySize(width, height);
    this.card.setPosition(width / 2, height / 2);

    // 显示与动画
    this.visible = true;
    this.bg.setVisible(true);
    this.card.setVisible(true);

    this.scene.tweens.add({
      targets: this.bg,
      alpha: 1,
      duration: 160,
      ease: 'Linear',
    });
    this.scene.tweens.add({
      targets: this.card,
      alpha: 1,
      y: height / 2 - 6,
      duration: 180,
      ease: 'Quad.easeOut',
    });
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;

    this.scene.tweens.add({
      targets: [this.bg, this.card],
      alpha: 0,
      duration: 120,
      ease: 'Linear',
      onComplete: () => {
        this.bg.setVisible(false);
        this.card.setVisible(false);
      },
    });
  }

  /** 可复用的胶囊按钮（更大命中范围） */
  private createCapsuleButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    bg: number,
    fg: string
  ) {
    const minWidth = 220;        // 最小宽度，便于触控
    const paddingX = 28;         // 更大 padding
    const paddingY = 14;

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: fg,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const w = Math.max(minWidth, text.width + paddingX * 2);
    const h = Math.max(44, text.height + paddingY * 2);

    const rect = this.scene.add
      .rectangle(0, 0, w, h, bg, 1)
      .setStrokeStyle(2, 0x000000, 0.25)
      .setScrollFactor(0);

    // 交互命中区域再放大一些（+8 边距）
    rect.setInteractive(new Phaser.Geom.Rectangle(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8), Phaser.Geom.Rectangle.Contains)
        .on('pointerdown', () => onClick());

    const c = this.scene.add
      .container(x, y, [rect, text])
      .setSize(w, h)
      .setInteractive(new Phaser.Geom.Rectangle(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8), Phaser.Geom.Rectangle.Contains)
      .setScrollFactor(0)
      .on('pointerdown', () => onClick());

    // hover/press 动画
    c.on('pointerover', () => {
      this.scene.tweens.add({ targets: rect, scaleX: 1.03, scaleY: 1.06, duration: 120 });
    });
    c.on('pointerout', () => {
      this.scene.tweens.add({ targets: rect, scaleX: 1, scaleY: 1, duration: 120 });
    });
    c.setData('height', h);
    return c;
  }
}
