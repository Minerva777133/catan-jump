import MainSceneBase from './MainSceneBase';

export default class MainScene2 extends MainSceneBase {
  constructor() {
    super('MainScene2');
  }
  create() {
    // 用 {levelId: 2} 初始化
    this.init({ levelId: 2 });
    super.create();
  }
}
