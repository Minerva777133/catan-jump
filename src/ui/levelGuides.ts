export type LevelGuideSpec = {
  title: string;
  lines: string[];
};

const DEFAULT_GUIDE: LevelGuideSpec = {
  title: 'Level Guide',
  lines: [
    'This is a placeholder guide.',
    'You can replace this text in levels/levelGuides.ts.',
  ],
};

export function getLevelGuide(levelId: number): LevelGuideSpec {
  switch (levelId) {
    case 1:
      return {
        title: 'Level 1 — Basics / 第一关：基础操作',
        lines: [
          'EN: Your goal is to build one house within the turn limit.',
          'CN: 在限定回合内建造一座房子以获得胜利。',
          '',
          'EN: Move onto tiles to collect the matching resources.',
          'CN: 移动到对应资源地块上以收集资源。',
          '',
          'EN: Once you have all required materials, build a house on your current tile.',
          'CN: 集齐所有材料后，在当前地块建造房子。',
          '',
          'EN: Take your time to get familiar with jumping and resource collection.',
          'CN: 慢慢熟悉跳跃操作与资源获取的机制。',
        ],
      };
    case 2:
      return {
        title: 'Level 2 — Expansion / 第二关：拓展与收益',
        lines: [
          'EN: Tiles with houses now provide extra resources when you revisit them.',
          'CN: 拥有房子的地块在再次进入时，会额外获得一个对应资源。',
          '',
          'EN: Use this advantage to gather materials faster and plan your moves wisely.',
          'CN: 利用这一优势更快地收集材料，并合理规划移动路线。',
          '',
          'EN: Try to win within the given turn limit!',
          'CN: 尝试在限定回合内完成通关！',
        ],
      };

    case 3:
      return {
        title: 'Level 3 — Weapons & Enemies / 第三关：武器与敌人',
        lines: [
          'EN: A new resource appears — Stone!',
          'CN: 新增资源：石头！',
          '',
          'EN: Use stones to craft weapons and defeat monsters.',
          'CN: 使用石头制作武器，用来打倒怪物。',
          '',
          'EN: Monsters appear every 3 turns and move counterclockwise around the map.',
          'CN: 怪物每 3 回合生成一次，并会沿逆时针方向在地图上移动。',
          '',
          'EN: Each weapon can defeat one monster and grants +1 point.',
          'CN: 每次打倒怪物会消耗一件武器，并获得 1 分。',
          '',
          'EN: Stay alert and aim to win within the turn limit!',
          'CN: 保持警惕，尝试在限定回合内完成通关！',
        ],
      };


    case 4:
      return {
        title: 'Level 4 — Catapults & Defense / 第四关：投石台与防御',
        lines: [
          'EN: If a monster steps onto a house, the house will be destroyed.',
          'CN: 当怪物进入房子所在的地块时，房子会被破坏。',
          '',
          'EN: A new building — the Catapult — is now available!',
          'CN: 新增建筑：投石台！',
          '',
          'EN: Catapults must be built on top of houses and will attack surrounding tiles every turn.',
          'CN: 投石台必须建造在房子上，建成后每回合会对周围一环发动攻击，消灭怪物。',
          '',
          'EN: Use this power wisely to survive and clear the stage!',
          'CN: 善用这一力量，巧妙防守，尝试顺利通关！',
        ],
      };


    default:
      return DEFAULT_GUIDE;
  }
}
