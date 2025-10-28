import Phaser from 'phaser';
import { defaultConfig as DEFAULT_CFG, GameConfig } from '../config/gameConfig';
import { Board } from '../map/Board';
import { InputRing } from '../ui/InputRing';
import { HUD } from '../ui/HUD';
import { Rules, PlayerState } from '../rules/Rules';
import { ResourceType } from '../core/hex';
import { Snapshot, clonePlayer } from '../systems/History';
import { EndOverlay } from '../ui/EndOverlay';
import { LevelSpec } from '../levels/LevelSpec';
import { getLevelSpec } from '../levels/levels';
import { EnemySystem } from '../systems/Enemies';
import { BuildSystem } from '../systems/BuildSystem';
import { VictorySystem } from '../systems/Victory';
import { CatapultSystem } from '../systems/Catapult';
import { ScenePainter } from '../ui/ScenePainter';
import { GuideModal } from '../ui/GuideModal';
import { getLevelGuide } from '../ui/levelGuides';

type UndoState = unknown;
interface UndoSerializable<TState = UndoState> {
  getState(): TState;
  restore(state: TState): void;
}

/** 回到上一回合：保存“回合开局态”快照 */
type SceneSnapshot = Snapshot & {
  turnNo: number;
  victoryScore: number;
  catapultState: boolean[];
  enemiesState?: UndoState;
};

type LoseReason = 'MONSTER' | 'OUT_OF_MAP' | 'TURN_LIMIT';

export default class MainSceneBase extends Phaser.Scene {
  protected levelId = 1;
  protected spec!: LevelSpec;
  protected cfg!: GameConfig;

  protected board!: Board;
  protected rules!: Rules;
  protected builder!: BuildSystem;
  protected victory!: VictorySystem;
  protected enemies?: EnemySystem;
  protected catapults?: CatapultSystem;

  private ring!: InputRing;
  private hud!: HUD;
  private overlay!: EndOverlay;
  private guide!: GuideModal;
  private painter!: ScenePainter;

  private gameOver = false;
  private history: SceneSnapshot[] = [];
  private lastSnapTurn = -1;

  // 输入/跳跃
  private armed = false;
  private pressAngle = 0;
  private readonly ringHoldMax = 800; // 与 InputRing 保持一致（ms）

  protected player: PlayerState = {
    pos: { x: 0, y: 0 },
    inventory: { BRICK: 0, WHEAT: 0, WOOD: 0, SHEEP: 0, STONE: 0, WEAPON: 0 } as any,
    houses: 0,
    turns: 0,
  };

  constructor(key = 'MainSceneBase') { super(key); }

  init(data: { levelId?: number } = {}) {
    if (typeof data.levelId === 'number') this.levelId = data.levelId;
  }

  create() {
    this.loadLevel(this.levelId);

    this.cameras.main.setZoom(1);
    this.cameras.main.centerOn(0, 0);

    this.board = new Board(this.cfg);
    this.board.randomize();
    this.rules = new Rules(this.cfg);
    this.builder = new BuildSystem(this.cfg, this.board);

    if (this.enableEnemies()) this.enemies = new EnemySystem(this, this.board);
    if (this.enableCatapults()) this.catapults = new CatapultSystem(this.cfg, this.board);

    const features = {
      showStoneBadge: this.showStoneInHud(),
      showWeaponBadge: this.showWeaponInHud(),
      allowHouseBuild: true,
      allowWeaponBuild: this.showWeaponBuild(),
      allowCatapultBuild: this.showCatapultBuild(),
      showEnemies: this.enableEnemies(),
      showCatapults: this.enableCatapults(),
      scoreToWin: this.cfg.SCORE_TO_WIN,
      levelId: this.levelId,
      turnLimit: this.cfg.TURN_LIMIT ?? 0,
    } as const;

    this.guide = new GuideModal(this);

    this.hud = new HUD(
      this,
      this.cfg,
      {
        features,
        onBuildHouse: () => this.onBuildHouse(),
        onBuildWeapon: this.showWeaponBuild() ? () => this.onBuildWeapon() : undefined,
        onBuildCatapult: this.showCatapultBuild() ? () => this.onBuildCatapult() : undefined,
        onUndo: () => this.onUndo(),
        onRestart: () => this.onRestart(),
        onNext: () => this.onNextLevel(),
        onLast: () => this.onLastLevel(),
        onShowGuide: () => {
          const g = getLevelGuide(this.levelId);
          this.guide.show({ title: g.title, lines: g.lines });
        },
      }
    );

    this.overlay = new EndOverlay(this);
    this.ring = new InputRing(this, this.cfg);
    this.ring.setMaxHoldMs(this.ringHoldMax); // ✅ 与主场景的力度时长一致
    this.painter = new ScenePainter(this, this.cfg);

    // ===== 输入：按住圆环蓄力，松开跳跃 =====
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.gameOver) return;
      const pt = { x: p.x, y: p.y };
      if (this.ring.isInsideScreen(pt)) {
        this.armed = true;
        this.pressAngle = this.ring.angleFromScreen(pt);
        this.ring.startCharge();  // ✅ 开始蓄力
        this.ring.flash();
      } else {
        this.armed = false;
      }
    });

    this.input.on('pointerup', () => {
      if (!this.armed || this.gameOver) return;
      this.armed = false;
      const frac = this.ring.endCharge();                  // 0..1
      const pressMs = Math.round(frac * this.ringHoldMax); // 将比例映射到毫秒
      this.performJump(pressMs);
      this.ring.resetCharge();                             // ✅ 跳跃后重置
    });

    // turn 0 的开局快照
    this.pushTurnSnapshotIfNeeded();

    this.redrawAll();
  }

  // === 钩子（关卡差异） ===
  protected shouldHouseAddScore(): boolean { return true; }
  protected catapultScoreOnBuild(): number { return 2; }

  protected enableEnemies() { return this.levelId >= 3; }
  protected enableCatapults() { return this.levelId >= 4; }
  protected showWeaponInHud() { return this.levelId >= 3; }
  protected showStoneInHud() { return this.levelId >= 3; }
  protected showWeaponBuild() { return this.levelId >= 3; }
  protected showCatapultBuild() { return this.levelId >= 4; }

  /** 回合开始：默认只生成怪物并检测同格 */
  protected onTurnStart(turnNo: number) {
    if (!this.enemies) return;
    const spawnRate = (this as any).spec?.enemies?.[0]?.params?.spawnRate ?? 5;
    this.enemies.trySpawnByTurns(turnNo, spawnRate, this.player.pos);
    this.resolvePlayerVsMonster();
  }

  private loadLevel(id: number) {
    this.spec = getLevelSpec(id);
    this.cfg = this.mergeConfig(DEFAULT_CFG, this.spec.overrides);
    this.victory = new VictorySystem(this.cfg);

    this.player = {
      pos: { x: 0, y: 0 },
      inventory: { BRICK: 0, WHEAT: 0, WOOD: 0, SHEEP: 0, STONE: 0, WEAPON: 0 } as any,
      houses: 0,
      turns: 0,
    };
    this.history = [];
    this.lastSnapTurn = -1;
    this.gameOver = false;
  }

  private mergeConfig(base: GameConfig, ov: LevelSpec['overrides']): GameConfig {
    const weights: Partial<Record<ResourceType, number>> = ov.RESOURCE_WEIGHTS ?? {};
    return { ...base, ...ov, RESOURCE_WEIGHTS: { ...base.RESOURCE_WEIGHTS, ...weights } };
  }

  private pushTurnSnapshotIfNeeded() {
    if (this.player.turns === this.lastSnapTurn) return;
    const snapshot: SceneSnapshot = {
      turnNo: this.player.turns,
      player: clonePlayer(this.player),
      houseState: this.board.getHouseState(),
      catapultState: this.board.getCatapultState(),
      victoryScore: this.victory.getScore?.() ?? (this as any).victory?.score ?? 0,
      enemiesState:
        this.enemies && 'getState' in (this.enemies as any)
          ? (this.enemies as unknown as UndoSerializable).getState()
          : undefined,
    };
    this.history.push(snapshot);
    this.lastSnapTurn = this.player.turns;
    if (this.history.length > 100) this.history.shift();
  }

  /** 支持外部传入 pressMs（来自能量条），否则按旧逻辑从时间差估算 */
  private performJump(pressMsOverride?: number) {
    this.pushTurnSnapshotIfNeeded();

    const pressMs = typeof pressMsOverride === 'number'
      ? Math.max(0, pressMsOverride)
      : 0; // 现在默认走能量条，不再用时间差

    const HEX_TO_PIXEL = this.cfg.HEX_SIZE * Math.sqrt(3);
    const newPos = this.rules.simulateJump(
      this.player.pos,
      { pressMs, angleRad: this.pressAngle },
      HEX_TO_PIXEL
    );

    const tiles = (this.board as any).getTilesAtPixel
      ? (this.board as any).getTilesAtPixel(newPos)
      : [this.board.getTileAtPixel(newPos)].filter(Boolean);

    if (!tiles || tiles.length === 0) {
      this.onLose('OUT_OF_MAP');
      this.redrawAll();
      return;
    }

    const res = this.rules.settleLanding(this.player, this.board, newPos);
    if ((res as any).kind === 'OUT_OF_MAP') {
      this.onLose('OUT_OF_MAP');
      this.redrawAll();
      return;
    }

    // ✅ 落地后立即判定是否与怪物同格
    this.onPlayerLandedPostCheck();

    // 进入下一回合编号
    this.player.turns += 1;

    // 回合开始结算（怪物生成/移动等）
    this.onTurnStart(this.player.turns);

    // 胜利判断
    if (this.victory.reached()) {
      this.onWin();
      return;
    }

    // 回合上限：在“即将进入下一回合（>limit）”时失败
    const limit = this.cfg.TURN_LIMIT ?? 0;
    if (limit > 0 && this.player.turns > limit && !this.victory.reached()) {
      this.onLose('TURN_LIMIT');
      this.redrawAll();
      return;
    }

    this.redrawAll();
  }

  protected onBuildHouse() {
    if (this.gameOver) return;
    if (!this.builder.canBuildHouse(this.player)) return;
    this.pushTurnSnapshotIfNeeded();

    if (this.builder.buildHouse(this.player)) {
      if (this.shouldHouseAddScore()) {
        this.victory.addScore(1);
        if (this.victory.reached()) { this.onWin(); return; }
      }
      this.redrawAll();
    }
  }

  protected onBuildWeapon() {
    if (this.gameOver || !this.showWeaponBuild()) return;
    if (!this.builder.canBuildWeapon(this.player)) return;
    this.pushTurnSnapshotIfNeeded();

    if (this.builder.buildWeapon(this.player)) this.redrawAll();
  }

  protected onBuildCatapult() {
    if (this.gameOver || !this.showCatapultBuild() || !this.catapults) return;
    if (!this.builder.canBuildCatapult(this.player)) return;
    this.pushTurnSnapshotIfNeeded();

    if (this.builder.buildCatapult(this.player, this.catapults)) {
      const gain = this.catapultScoreOnBuild();
      if (gain > 0) this.victory.addScore(gain);

      if (this.enemies) {
        this.catapults.attack(this.enemies);
        this.catapults.syncFromBoard?.();
      }
      if (this.victory.reached()) { this.onWin(); return; }
      this.redrawAll();
    }
  }

  private onNextLevel() {
    const nextId = this.levelId + 1;
    const key = this.levelKey(nextId);
    if (key) this.scene.start(key, { levelId: nextId });
  }

  private onLastLevel() {
    const prevId = Math.max(1, this.levelId - 1);
    const key = this.levelKey(prevId);
    if (key) this.scene.start(key, { levelId: prevId });
  }

  private levelKey(id: number): string | null {
    if (id === 1) return 'MainScene';
    if (id === 2) return 'MainScene2';
    if (id === 3) return 'MainScene3';
    if (id === 4) return 'MainScene4';
    return null;
  }

  private onUndo() {
    if (this.history.length === 0) return;

    const snap = this.history.pop()!;
    this.player = clonePlayer(snap.player);
    const v = this.victory as any;
    if (typeof this.victory.setScore === 'function') this.victory.setScore(snap.victoryScore);
    else if ('score' in v) v.score = snap.victoryScore;

    this.board.setHouseState(snap.houseState);
    this.board.setCatapultState(snap.catapultState);

    if (this.enemies && snap.enemiesState) {
      (this.enemies as unknown as UndoSerializable).restore(snap.enemiesState);
    }

    this.catapults?.syncFromBoard?.();

    this.gameOver = false;
    this.player.turns = snap.turnNo;
    this.lastSnapTurn = snap.turnNo - 1;
    this.overlay?.hide();
    this.redrawAll();
  }

  private onRestart() {
    const key = this.levelKey(this.levelId) || 'MainScene';
    this.scene.start(key, { levelId: this.levelId });
  }

  private onWin() {
    this.gameOver = true;
    this.overlay.show({
      title: 'You Win!',
      subtitle: '',
      buttons: [
        { label: 'Restart Level', onClick: () => this.onRestart(), bg: 0x444444, fg: '#fff' },
        { label: 'Next Level', onClick: () => this.onNextLevel(), bg: 0x3a86ff, fg: '#fff' },
      ],
    });
  }

  private onLose(reason?: LoseReason) {
    this.gameOver = true;
    const subtitle =
      reason === 'MONSTER'
        ? 'Killed by a monster'
        : reason === 'OUT_OF_MAP'
          ? 'Jumped out of the map'
          : reason === 'TURN_LIMIT'
            ? 'Out of turns'
            : '';

    this.overlay.show({
      title: 'Game Over',
      subtitle,
      buttons: [
        { label: 'Undo', onClick: () => this.onUndo(), bg: 0xffd166, fg: '#111' },
        { label: 'Restart Level', onClick: () => this.onRestart(), bg: 0x444444, fg: '#fff' },
      ],
    });
  }

  private redrawAll() {
    this.painter.renderAll(this.board, this.enemies, this.player);
    this.hud.updateHUD(
      this.player.turns,
      this.victory.getScore(),
      this.player.inventory as any
    );
  }

  // ==========【统一的怪物碰撞结算】==========
  protected resolvePlayerVsMonster() {
    const player: any = (this as any).player;
    const enemies: any = (this as any).enemies;
    const board: any = (this as any).board;

    if (!player || !enemies || !board) return;

    const tile = board.getTileAtPixel(player.pos);
    if (!tile) return;

    const hit = enemies.hitOn(tile.axial.q, tile.axial.r);
    if (!hit) return;

    const inv = player.inventory || {};
    const hasWeapon = (inv.WEAPON ?? 0) > 0;

    if (hasWeapon) {
      inv.WEAPON = Math.max(0, (inv.WEAPON ?? 0) - 1);
      enemies.remove(hit);
      const addScore =
        (this as any).addScore?.bind(this) ||
        (this as any).victory?.addScore?.bind((this as any).victory);
      if (addScore) addScore(1);
      (this as any).hud?.sync?.();
    } else {
      const gameOver =
        (this as any).onGameOverByMonster?.bind(this) ||
        (this as any).onLose?.bind(this);
      if (gameOver) gameOver('MONSTER');
    }
  }

  // ==========【落地后判定钩子】==========
  protected onPlayerLandedPostCheck() {
    this.resolvePlayerVsMonster();
  }
}
