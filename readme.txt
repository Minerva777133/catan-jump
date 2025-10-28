src/
 ├─ main.ts                      # 入口：注册各关卡场景
 ├─ config/
 │   └─ gameConfig.ts            # 全局配置（地图、跳跃、建造成本、胜利分数、资源权重）
 ├─ core/
 │   └─ hex.ts                   # 六边形坐标/绘制工具、资源类型与颜色
 ├─ levels/
 │   ├─ LevelSpec.ts             # 关卡规范：允许覆盖的配置项
 │   └─ levels.ts                # 关卡列表：1/2/3 关定义（第3关启用石头/怪物）
 ├─ map/
 │   └─ Board.ts                 # 地图生成与像素命中（精确落点到格子）
 ├─ rules/
 │   └─ Rules.ts                 # 跳跃计算、落地结算（收集资源/奖励）
 ├─ systems/
 │   ├─ BuildSystem.ts           # 建造系统（房子/武器）
 │   ├─ Enemies.ts               # 怪物系统（生成/命中/清理），仅第3关启用
 │   ├─ History.ts               # 悔棋快照
 │   └─ Victory.ts               # 计分与胜利判断（建房+1、击杀+1）
 ├─ scenes/
 │   ├─ MainSceneBase.ts         # 场景基类（调度各系统、处理圆环点击）
 │   ├─ MainScene.ts             # 第1关（SCORE_TO_WIN=5）
 │   ├─ MainScene2.ts            # 第2关（SCORE_TO_WIN=7）
 │   └─ MainScene3.ts            # 第3关（石头&怪物&武器）
 └─ ui/
     ├─ HUD.ts                   # 顶栏（Build/Undo/Restart/Last/Next + 子菜单）
     ├─ InputRing.ts             # 右下角圆环（固定屏幕坐标；按住→蓄力，松开→跳）
     └─ EndOverlay.ts            # 结算弹窗（胜利/失败）

public/
 └─ assets/                      # 图片/音频等静态资源（可选）


# 安装依赖
npm install

# 本地开发
npm run dev
# 打开 http://localhost:5173

# 生产打包
npm run build

# 预览生产包
npm run preview
# 打开 http://localhost:4173

# 仅分发 dist 目录给他人（无需 Node）
# 对方可用 Python 起一个简单服务器：
cd dist && python -m http.server 8080
