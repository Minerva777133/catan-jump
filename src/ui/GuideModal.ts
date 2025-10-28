import Phaser from 'phaser';

export type GuideContent = {
  title: string;
  /** 正文支持多行；你也可以放一整段，我会自动做换行 */
  lines: string[];
};

export class GuideModal {
  private container!: Phaser.GameObjects.Container;
  private visible = false;

  constructor(private scene: Phaser.Scene) {
    const { width, height } = scene.scale;

    // 半透明遮罩（点击遮罩也可关闭）
    const mask = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: false })
      .on('pointerdown', () => this.hide());

    // 卡片
    const cardW = Math.min(520, width - 60);
    const cardH = Math.min(380, height - 100);
    const card = scene.add
      .rectangle(width / 2, height / 2, cardW, cardH, 0x1e1e1e, 0.98)
      .setStrokeStyle(1, 0xffffff, 0.08)
      .setScrollFactor(0);

    // 标题
    const title = scene.add
      .text(card.x - cardW / 2 + 16, card.y - cardH / 2 + 14, 'Level Guide', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#eaeaea',
      })
      .setScrollFactor(0);

    // 正文
    const body = scene.add
      .text(card.x - cardW / 2 + 16, card.y - cardH / 2 + 44, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e0e0e0',
        lineSpacing: 4,
        // 初始 wrap
        wordWrap: { width: cardW - 32, useAdvancedWrap: true },
      })
      .setScrollFactor(0);

    // 关闭按钮
    const btnW = 90, btnH = 32;
    const closeBtnBg = scene.add
      .rectangle(card.x + cardW / 2 - btnW - 12, card.y + cardH / 2 - btnH - 12, btnW, btnH, 0x444444, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xffffff, 0.1)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.hide())
      .on('pointerover', () => closeBtnBg.setFillStyle(0x555555))
      .on('pointerout', () => closeBtnBg.setFillStyle(0x444444));

    const closeBtnText = scene.add
      .text(closeBtnBg.x + btnW / 2, closeBtnBg.y + btnH / 2, 'Close', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.container = scene.add
      .container(0, 0, [mask, card, title, body, closeBtnBg, closeBtnText])
      .setScrollFactor(0)
      .setDepth(10_000); // 顶层

    this.container.setVisible(false);

    // 自适应
    scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width;
      const h = gameSize.height;

      mask.setSize(w, h);

      card.setPosition(w / 2, h / 2);
      card.setSize(Math.min(520, w - 60), Math.min(380, h - 100));

      title.setPosition(card.x - card.width / 2 + 16, card.y - card.height / 2 + 14);

      body.setPosition(card.x - card.width / 2 + 16, card.y - card.height / 2 + 44);
      // ✅ 正确更新换行宽度
      body.setWordWrapWidth(card.width - 32, true);

      closeBtnBg.setPosition(
        card.x + card.width / 2 - btnW - 12,
        card.y + card.height / 2 - btnH - 12
      );
      closeBtnText.setPosition(closeBtnBg.x + btnW / 2, closeBtnBg.y + btnH / 2);
    });

    // 暴露给 show 使用
    (this as any)._titleObj = title;
    (this as any)._bodyObj = body;
  }

  show(content: GuideContent) {
    const title = (this as any)._titleObj as Phaser.GameObjects.Text;
    const body = (this as any)._bodyObj as Phaser.GameObjects.Text;

    title.setText(content.title || 'Level Guide');
    body.setText((content.lines && content.lines.length > 0) ? content.lines.join('\n') : '—');

    // 以防在其它地方 resize 之后 wrap 过期，这里再保底设置一次
    const parentCard = this.container.getAt(1) as Phaser.GameObjects.Rectangle;
    if (parentCard) body.setWordWrapWidth(parentCard.width - 32, true);

    this.container.setVisible(true);
    this.visible = true;
  }

  hide() {
    this.container.setVisible(false);
    this.visible = false;
  }

  isVisible() { return this.visible; }
}
