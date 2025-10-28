// src/systems/History.ts
import { PlayerState } from '../rules/Rules';

/** 允许系统参与撤销：实现 getState / restore 即可被记录 */
export interface UndoSerializable<TState = unknown> {
  getState(): TState;
  restore(state: TState): void;
}

/** 最小快照（保持你现在已有字段，向后兼容） */
export type Snapshot = {
  player: PlayerState;
  houseState: boolean[];
  /** 可选：投石台/敌人等的状态，按需扩展 */
  catapultState?: boolean[];
  enemiesState?: unknown; // 由实现 UndoSerializable 的系统定义其结构
  /** 也可加：score、turnNo 等 */
  turnNo?: number;
  victoryScore?: number;
};

/** 深拷贝玩家（保持你原有逻辑） */
export function clonePlayer(p: PlayerState): PlayerState {
  return {
    pos: { x: p.pos.x, y: p.pos.y },
    inventory: { ...p.inventory },
    houses: p.houses,
    turns: p.turns,
  };
}

/**
 * 简单的快照栈（集中管理 push/pop + 容量限制）
 * - 你也可以只用 push/pop 两个方法，MainScene 自己决定何时记录
 */
export class HistoryStack<T extends Snapshot = Snapshot> {
  private stack: T[] = [];
  constructor(private max = 100) {}

  push(snap: T) {
    this.stack.push(snap);
    if (this.stack.length > this.max) this.stack.shift();
  }

  pop(): T | undefined {
    return this.stack.pop();
  }

  clear() { this.stack.length = 0; }

  get length() { return this.stack.length; }
}
