import MainSceneBase from './MainSceneBase';

export default class MainScene4 extends MainSceneBase {
  constructor() { super('MainScene4'); }
  create() { this.init({ levelId: 4 }); super.create(); }

  /** 回合开始：1 移动 → 2 生成 → 3 投石台 → 4 玩家与怪物同格判定 */
  protected onTurnStart(turnNo: number) {
    if (!this.enemies) return;

    // 1) 敌人移动（Enemies.ts 内部已统一为视觉逆时针）
    this.enemies.moveClockwiseAll();

    // 2) 生成怪物
    const spawnRate = (this as any).spec?.enemies?.[0]?.params?.spawnRate ?? 5;
    this.enemies.trySpawnByTurns(turnNo, spawnRate, (this as any).player.pos);

    // 3) 投石台攻击（清理邻居怪物，不加分）
    if (this.catapults) {
      this.catapults.attack(this.enemies);
      this.catapults.syncFromBoard();
    }

    // 4) 回合开始时的同格判定（统一逻辑）
    this.resolvePlayerVsMonster();
  }

  protected enableEnemies() { return true; }
  protected enableCatapults() { return true; }
  protected showStoneInHud() { return true; }
  protected showWeaponInHud() { return true; }
  protected showWeaponBuild() { return true; }
  protected showCatapultBuild() { return true; }
}
