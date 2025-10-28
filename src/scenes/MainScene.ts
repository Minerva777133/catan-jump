import MainSceneBase from './MainSceneBase';

export default class MainScene extends MainSceneBase {
  constructor() {
    super('MainScene');
  }
  create() {
    this.init({ levelId: 1 });
    super.create();
  }
}
