import MainSceneBase from './MainSceneBase';

export default class MainScene3 extends MainSceneBase {
  constructor() { super('MainScene3'); }

  create() {
    this.init({ levelId: 3 });
    super.create();
  }

  /**
   * 回合开始：1 移动 → 2 生成 → 3（本关无投石台） → 4 玩家与怪物同格判定
   * 统一“有武器则击杀+1分、无则GameOver”的规则
   */
  protected onTurnStart(turnNo: number) {
    if (!this.enemies) return;

    // 1) 敌人移动（Enemies.ts 内部已经统一为视觉逆时针）
    this.enemies.moveClockwiseAll();

    // 2) 生成怪物（默认每3回合1只，可由 levels.ts 配置）
    const spawnRate = (this as any).spec?.enemies?.[0]?.params?.spawnRate ?? 3;
    this.enemies.trySpawnByTurns(turnNo, spawnRate, (this as any).player.pos);

    // 3) 本关不启用投石台（若未来启用，参照第四关做 attack/sync）

    // 4) 回合开始的同格判定（怪物移动/生成后可能撞到玩家）
    this.resolvePlayerVsMonster();
  }

  // —— 开关 / HUD —— //
  protected enableEnemies() { return true; }      // ✅ 必须开启
  protected enableCatapults() { return false; }   // 本关关闭投石台
  protected showStoneInHud() { return true; }
  protected showWeaponInHud() { return true; }
  protected showWeaponBuild() { return true; }
  protected showCatapultBuild() { return false; }

  // —— 计分规则 —— //
  /** 第3关：建房不加分；投石台加分设为0（即便未来开放建造也不计分） */
  protected shouldHouseAddScore(): boolean { return false; }
  protected catapultScoreOnBuild(): number { return 0; }
}
