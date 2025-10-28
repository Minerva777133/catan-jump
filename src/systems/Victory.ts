// 兼容旧逻辑：支持“分数 ≥ SCORE_TO_WIN”判断；
// 可选支持：未来在 LevelSpec 里提供 goals 后，按目标表达式判断胜负。

import type { GameConfig } from '../config/gameConfig';
import type { ResourceType } from '../core/hex';

/** —— 可选：数据驱动目标（未来接 LevelSpec.goals 时使用） —— */
export type GoalAtom =
  | { type: 'scoreAtLeast'; value: number }
  | { type: 'turnsAtMost'; value: number }
  | { type: 'housesAtLeast'; value: number }
  | { type: 'catapultsAtLeast'; value: number }
  | { type: 'resourcesAtLeast'; need: Partial<Record<ResourceType | 'WEAPON', number>> }
  | { type: 'noDeathBy'; reasons: ('MONSTER' | 'OUT_OF_MAP')[] };

export type GoalExpr =
  | GoalAtom
  | { allOf: GoalExpr[] }
  | { anyOf: GoalExpr[] }
  | { not: GoalExpr };

export type LevelGoalSpec = {
  win: GoalExpr;
  lose?: GoalExpr;
};

export type GameState = {
  turn: number;
  score?: number;
  inventory: Record<ResourceType | 'WEAPON', number>;
  houses: number;
  catapults: number;
  // 允许没有失败原因，因此包含 undefined
  lastLoseReason?: 'MONSTER' | 'OUT_OF_MAP' | undefined;
};

// 本文件内部使用的完整状态：score 必然存在，其他保持与 GameState 一致
type FullState = Omit<GameState, 'score'> & { score: number };

export class VictorySystem {
  /** —— 兼容旧逻辑：内部持有分数 —— */
  private score = 0;

  /** —— 传统模式（阈值） —— */
  private legacyTarget?: number;

  /** —— 新模式（数据驱动） —— */
  private goals?: LevelGoalSpec;
  private progressLines: string[] = [];

  constructor(cfgOrGoals: GameConfig | LevelGoalSpec) {
    if (isGoals(cfgOrGoals)) {
      this.goals = cfgOrGoals;
    } else {
      this.legacyTarget = cfgOrGoals.SCORE_TO_WIN;
    }
  }

  /** 兼容旧调用 */
  addScore(n: number) { this.score += n; }
  setScore(n: number) { this.score = n; }
  getScore() { return this.score; }

  /** 旧接口：仅用于传统分数胜利 */
  reached(): boolean {
    if (this.goals) {
      // 启用数据驱动时不使用 reached()；由 check() 决定
      return false;
    }
    if (typeof this.legacyTarget === 'number') {
      return this.score >= this.legacyTarget;
    }
    return false;
  }

  /** 切换到数据驱动模式（可选，方便逐步迁移） */
  setGoals(goals: LevelGoalSpec) {
    this.goals = goals;
  }

  /** HUD 可选读取（当前 MainSceneBase 未使用，保留以备未来扩展） */
  getProgressLines() { return this.progressLines.slice(); }

  /** 新模式：在关键时机调用，返回 win/lose/ongoing */
  check(state: GameState): 'win' | 'lose' | 'ongoing' {
    const s: FullState = {
      turn: state.turn,
      score: state.score ?? this.score,
      inventory: state.inventory,
      houses: state.houses,
      catapults: state.catapults,
      lastLoseReason: state.lastLoseReason, // 允许为 undefined
    };

    // 若尚未启用数据驱动，则退回传统判断
    if (!this.goals) {
      if (typeof this.legacyTarget === 'number' && s.score >= this.legacyTarget) return 'win';
      return 'ongoing';
    }

    const win = this.evalExpr(this.goals.win, s);
    const lose = this.goals.lose ? this.evalExpr(this.goals.lose, s) : false;
    this.progressLines = this.buildProgressLines(this.goals.win, s);
    if (lose) return 'lose';
    if (win)  return 'win';
    return 'ongoing';
  }

  // —— 以下为数据驱动求值 & 进度文本 —— //
  private evalExpr(expr: GoalExpr, s: FullState): boolean {
    if ('allOf' in expr) return expr.allOf.every(e => this.evalExpr(e, s));
    if ('anyOf' in expr) return expr.anyOf.some(e => this.evalExpr(e, s));
    if ('not' in expr)   return !this.evalExpr(expr.not, s);
    return this.evalAtom(expr as GoalAtom, s);
  }

  private evalAtom(a: GoalAtom, s: FullState): boolean {
    switch (a.type) {
      case 'scoreAtLeast':     return s.score >= a.value;
      case 'turnsAtMost':      return s.turn <= a.value;
      case 'housesAtLeast':    return s.houses >= a.value;
      case 'catapultsAtLeast': return s.catapults >= a.value;
      case 'resourcesAtLeast':
        return Object.entries(a.need).every(([k, v]) => (s.inventory as any)[k] >= (v ?? 0));
      case 'noDeathBy':
        // lastLoseReason 可能为 undefined，这里自然成立
        return !a.reasons.includes(s.lastLoseReason as any);
      default: return false;
    }
  }

  private buildProgressLines(expr: GoalExpr, s: FullState): string[] {
    const atoms: GoalAtom[] = [];
    const collect = (e: GoalExpr) => {
      if ('allOf' in e) e.allOf.forEach(collect);
      else if ('anyOf' in e) e.anyOf.forEach(collect);
      else if ('not' in e) {/* 进度文本略过 not */}
      else atoms.push(e as GoalAtom);
    };
    collect(expr);

    const lines: string[] = [];
    const push = (ok: boolean, txt: string) => lines.push(ok ? `✓ ${txt}` : `• ${txt}`);

    for (const a of atoms) {
      switch (a.type) {
        case 'scoreAtLeast':
          push(s.score >= a.value, `Score ${s.score}/${a.value}`); break;
        case 'turnsAtMost':
          push(s.turn <= a.value,  `Turns ≤ ${a.value} (now ${s.turn})`); break;
        case 'housesAtLeast':
          push(s.houses >= a.value, `Houses ${s.houses}/${a.value}`); break;
        case 'catapultsAtLeast':
          push(s.catapults >= a.value, `Catapults ${s.catapults}/${a.value}`); break;
        case 'resourcesAtLeast': {
          const parts = Object.entries(a.need).map(([k, v]) =>
            `${k}:${(s.inventory as any)[k] ?? 0}/${v}`
          );
          const ok = Object.entries(a.need).every(([k, v]) =>
            (s.inventory as any)[k] >= (v ?? 0)
          );
          push(ok, `Resources ${parts.join(' ')}`);
          break;
        }
      }
    }
    return lines;
  }
}

function isGoals(x: any): x is LevelGoalSpec {
  return x && typeof x === 'object' && 'win' in x;
}
