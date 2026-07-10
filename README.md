# 焰刃流光 (Flameblade Flash)

一款基于 HTML5 Canvas 的 2D 格斗游戏，支持 PvE（对战 AI）和 PvP（WebRTC 联机）。

---

## 目录结构

```
flat_flameblade_flash/
├── index.html          ← 游戏入口，引用所有 JS / CSS
├── index.css           ← 全局样式
├── assets/             ← 静态资源（贴图、动画帧）
│   ├── assassin_u/     ← 刺客大招全屏动画帧 (0~13.jpg)
│   └── ...             ← 其他角色/特效贴图
├── js/
│   ├── 01_core.js      ← DOM引用、常量、资源加载、world 容器、输入绑定
│   ├── 02_network.js   ← MQTT / WebRTC / PvP 网络全部逻辑
│   ├── 03_systems.js   ← 音频、粒子、平台、拾取物、状态效果、角色配置注册表
│   ├── 04_skills.js    ← Skill 类 + createSkills() 分发
│   ├── 05_fighter.js   ← Fighter 类（物理、状态、绘制）
│   ├── 06_combat_ai.js ← 碰撞检测、伤害计算、AI、PvP 远程输入
│   ├── 07_game_render.js ← initGame()、draw 函数、HUD 按钮
│   ├── 08_update.js    ← update() 骨架（调度所有 system）
│   ├── 09_render_loop.js ← draw() / loop() / updateHUD()
│   ├── 10_menu_boot.js ← 菜单、角色选择、事件绑定、启动
│   ├── characters/     ← 角色插件目录
│   │   ├── knight.js
│   │   ├── mage.js
│   │   ├── archer.js
│   │   ├── paladin.js
│   │   ├── witch.js
│   │   ├── assassin.js
│   │   └── shadowworrior.js
│   └── systems/        ← 游戏逻辑子系统（每帧调用）
│       ├── input.js      ← 玩家输入处理（分发到各角色 handleInput 钩子）
│       ├── dash.js       ← 突进逻辑
│       ├── tornadoes.js  ← 龙卷风/漩涡更新
│       ├── projectiles.js ← 投射物更新
│       ├── flameZones.js ← 火焰区域更新
│       ├── slow.js       ← 状态减速
│       └── pickups.js    ← 掉落物 + 爆炸 + 相机 + 胜负判定
└── README.md
```

---

## 代码架构

### 游戏循环

```
loop()                          [09_render_loop.js]
  ├─ update()                   [08_update.js]
  │   ├─ updatePlayerInput()    [systems/input.js]
  │   ├─ updateDash()           [systems/dash.js]
  │   ├─ updateTornadoes()      [systems/tornadoes.js]
  │   ├─ updateProjectiles()    [systems/projectiles.js]
  │   ├─ updateFlameZones()     [systems/flameZones.js]
  │   ├─ updateSlow()           [systems/slow.js]
  │   └─ updatePickupsAndEnd()  [systems/pickups.js]
  └─ draw()                     [09_render_loop.js + 07_game_render.js]
      ├─ drawMap()
      ├─ drawFighter(player)    ← 内部调用 hooks.onFighterDraw
      ├─ drawFighter(enemy)
      ├─ drawProjectiles()
      ├─ drawFlameZones()
      ├─ drawPickups()
      ├─ hooks.onOverlayDraw()  ← 覆盖层（各角色陷阱/分身/刀光/动画等）
      └─ 调试信息
```

### GameWorld 容器

所有全局可变状态收在 `world` 对象中（定义于 `01_core.js`）：

| 属性 | 类型 | 说明 |
|------|------|------|
| `entities` | `Fighter[]` | 所有战斗者（player + enemy） |
| `projectiles` | `object[]` | 飞行中的投射物 |
| `particles` | `Particle[]` | 粒子特效 |
| `pickups` | `Pickup[]` | 掉落物 |
| `flameZones` | `object[]` | 火焰区域 |
| `explosionEffects` | `object[]` | 爆炸特效 |
| `tornadoes` | `object[]` | 龙卷风（魔女技能1） |
| `vortexes` | `object[]` | 漩涡（魔女技能2） |
| `phantoms` | `object[]` | 幻影分身（影武者技能2） |
| `camera` | `{x: number}` | 相机位置 |
| `audioCtx` | `AudioContext` | 音频上下文 |
| `platforms` | `object[]` | 平台配置 |
| `pickupTimer` | `number` | 掉落物生成计时器 |

所有 system 函数接收 `(world)` 作为参数——轻量依赖注入。

### 数据驱动的配置字段

以下字段在 `CHAR_CONFIGS` 中定义后，系统自动生效，无需改任何系统文件：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `resourceLabel` | `string` | `'能量'` | 选人界面"能量"资源名称（如圣骑士用 `'圣光'`） |
| `canSkill2InAir` | `boolean` | `false` | 是否可以在空中使用技能2 |
| `ultEnergyNeed` | `number \| 'maxEnergy'` | `40` | 大招能量门槛（`'maxEnergy'` 表示满能量） |
| `dex` | `object` | — | 图鉴面板数据（icon/intro/stats/skills） |
| `fields` | `object` | `{}` | 角色专属反射字段，键值对 `{ fieldName: defaultValue }`。Fighter 构造和 initGame 重开时自动初始化，无需在 initFighter 里重复赋值 |
| `worldArrays` | `string[]` | `[]` | 角色需要的 world 数组名（如 `['tornadoes','vortexes']`、`['phantoms']`），initGame 自动 `world[name] = []` |

---

## 如何编写角色插件

### 概览

添加一个新角色只需要 **一个文件** + **一行 HTML**，无需修改任何系统代码。角色专属的初始字段通过 `config.fields` 反射注册，角色专属的 world 数组通过 `config.worldArrays` 声明。

每个角色文件包含四部分：

1. `CHAR_CONFIGS.xxx` — 角色属性 + `fields`（反射字段）+ `worldArrays`（反射数组）+ `dex`（图鉴）
2. `CHAR_SKILL_FACTORIES.xxx` — 技能工厂函数
3. `CHAR_CONFIGS.xxx.hooks` — 钩子函数（`handleInput` 必须实现，其余按需选填）

### 第一部分：角色配置 `CHAR_CONFIGS.xxx`

```js
CHAR_CONFIGS.mychar = {
    id: 'mychar',          // 唯一 ID，必须与注册键名一致
    name: '我的角色',       // 显示名称
    hp: 100,                // 生命上限
    maxEnergy: 100,         // 能量上限
    energyRegen: 0.05,      // 能量自然恢复速率（每帧）

    speed: 2.0,             // 移动速度
    jumpPower: -10,         // 跳跃力度
    attackRange: 44,        // 攻击判定范围（像素）
    attackDamage: 5,        // 近战普攻伤害

    attackCooldown: 60,     // 普攻冷却（帧数）
    attackDelay: 8,         // 攻击前摇（帧数）
    attackDuration: 68,     // 攻击持续（帧数）

    images: {               // 贴图映射（key 对应动画状态）
        idle: IMG.xxx_idle,
        walk: IMG.xxx_walk,
        jump: IMG.xxx_jump,
        attack: IMG.xxx_attack,
        ult: IMG.xxx_ult,
        // 可选: charge, skill1, skill2
    },

    // ===== 可选配置 =====
    canSkill2InAir: true,    // 是否可在空中使用技能2
    ultEnergyNeed: 100,       // 大招能量需求数值（或 'maxEnergy'=满能量）
    resourceLabel: '圣光',    // 选人界面能量条标签（默认"能量"）

    // 角色专属字段：Fighter 构造 / 重开时自动反射初始化
    fields: {
        arrows: 10,           // 例：弓箭手初始箭矢数
        maxArrows: 10,        // 例：弓箭手箭矢上限
        arrowRegenTimer: 0,
        arrowRegenRate: 480,  // 例：弓箭手箭矢再生速率（帧数）
    },
    // 角色需要的 world 数组（initGame 自动创建为 []）
    worldArrays: ['phantoms'],

    dex: {                    // 图鉴数据（可选）
        icon: '🐉',           // emoji 图标
        intro: '角色介绍文本',
        stats: [{ label: '生命', value: '100' }, { label: '能量上限', value: '100' }],
        skills: [
            { name: '技能名', desc: '描述', meta: '消耗/冷却信息' },
        ],
    },
};
```

### 第二部分：技能工厂 `CHAR_SKILL_FACTORIES.xxx`

返回一个 `Skill[]` 数组。每个技能使用 `new Skill({...})` 定义：

```js
CHAR_SKILL_FACTORIES.mychar = function create_mychar_skills() {
    return [
        // 普通攻击 (key: 'attack')
        new Skill({
            key: 'attack',          // 技能键位
            name: '斩击',            // 技能名称
            cooldown: 60,            // 冷却帧数
            energyCost: 0,           // 能量消耗
            canUse: (owner) => {     // 使用条件（返回 boolean）
                return owner.attackCooldown <= 0 && !owner.attacking;
            },
            execute: (owner) => {    // 执行逻辑
                owner.attacking = true;
                owner.attackTimer = 60;
                // ... 设置攻击状态
                playSound('swing');
                return { success: true };  // 返回是否成功
            }
        }),

        // 技能1 (key: 'skill1')
        new Skill({ key: 'skill1', name: '火球', cooldown: 480, energyCost: 20,
            canUse: (owner) => true,
            execute: (owner) => {
                // 可以往 world.projectiles 里推投射物
                world.projectiles.push({ /* ... */ });
                emitParticles(/* ... */);
                playSound('wave');
                return { success: true };
            }
        }),

        // 技能2 (key: 'skill2')
        new Skill({ key: 'skill2', /* ... */ }),

        // 大招 (key: 'ult')
        new Skill({ key: 'ult', /* ... */ }),
    ];
};
```

**技能键位约定：**
- `'attack'` — 普攻键
- `'skill1'` — 技能1 键
- `'skill2'` — 技能2 键
- `'ult'` — 大招键

**投射物类型约定：**
- 自定义类型字符串（如 `'knight_sword'`、`'meteor'`、`'assassin_skill2'`）会在 `systems/projectiles.js` 中按通用流程处理
- 如需特殊碰撞逻辑，请使用 `onProjectileHit` 钩子

### 第三部分：钩子 `CHAR_CONFIGS.xxx.hooks`

钩子是角色专属逻辑的唯一出口。每个钩子都是**可选**的——不填则走默认行为。

所有可用钩子一览：

| 钩子 | 签名 | 调用时机 | 调用位置 |
|------|------|----------|----------|
| `handleInput` | `(player, world)` | 每帧处理玩家输入 | `systems/input.js` |
| `onUpdate` | `(world)` | 每帧 | `systems/input.js` |
| `onFighterUpdate` | `(owner)` | Fighter.applyPhysics() 内 | `05_fighter.js` |
| `onFighterDraw` | `(ctx, fighter, world)` | Fighter 主体绘制后 | `07_game_render.js` |
| `onProjectileUpdate` | `(world, i, p)` | 投射物位置更新后 | `systems/projectiles.js` |
| `onProjectileHit` | `(world, p, target, i)` | 投射物命中目标时 | `systems/projectiles.js` |
| `onDashContact` | `(f, target)` | 突进碰撞时 | `systems/dash.js` |
| `onDamageDealt` | `(attacker, target, baseDmg)` | 伤害计算时 | `06_combat_ai.js` |
| `onDamageReceived` | `(target, attacker, dmg)` | 伤害施加前 | `06_combat_ai.js` |
| `onOverlayDraw` | `(ctx, world)` | draw() 末尾 | `09_render_loop.js` |
| `onHUD` | `(player)` | updateHUD() 内 | `09_render_loop.js` |
| `onPickup` | `(owner, pickupType)` | 拾取道具时 | `03_systems.js` |
| `initFighter` | `(fighter)` | initGame() 内 | `07_game_render.js` |
| `initResources` | `()` | 游戏启动时 | `01_core.js` |

> **注意**：`handleInput` 是所有角色**必须实现**的钩子（否则按键无响应）。`initFighter` 主要用于有逻辑的初始化（如清空残留数组），纯字段赋值已由 `config.fields` 反射接管。

---

### 钩子详解

#### `handleInput(player, world)`
每帧处理玩家按键输入的角色专属逻辑。用于将各角色的移动、跳跃、攻击、技能按键分发从系统文件解耦到角色文件中。钩子返回 `false` 时，`input.js` 会提前 `return` 跳过本帧后续的 PvP/AI/物理逻辑（用于蓄力能量不足等场景）。

**所有角色均需实现此钩子**，否则该角色的按键输入将无响应。蓝本参考 `knight.js` 的 `handleInput`。

```js
handleInput(player, world) {
    let moveX = 0;
    if (keys.left) moveX = -1;
    if (keys.right) moveX = 1;
    if (keys.up && player.grounded) { player.vy = JUMP_SPEED; player.grounded = false; }
    if (keys.attack && player.attackCooldown <= 0 && !player.attacking) {
        // 调用 player.getSkill('attack').tryUse(player) 或自定义攻击逻辑
    }
    // ... 技能分发、移动速度、状态切换
}
```

#### `onUpdate(world)`
每帧调用的角色专属逻辑。用于实现需要每帧持续检测的机制。

**刺客示例**：无敌计时、完美闪避判定、次元斩/裂空斩/大招/暗影游走状态更新。

```js
onUpdate(world) {
    for (let f of world.entities) {
        if (f.charId !== 'mychar') continue;
        if (f.hp <= 0) continue;
        // 每帧逻辑...
    }
}
```

#### `onFighterUpdate(owner)`
在 `Fighter.applyPhysics()` 内部调用。用于角色自定义的时序/计时器管理。

**弓箭手示例**：箭矢再生计时、火矢/追踪 buff 倒计时。

```js
onFighterUpdate(owner) {
    if (owner.charId !== 'mychar') return;
    // 自定义计时器...
}
```

#### `onFighterDraw(ctx, fighter, world)`
在 `drawFighter()` 末尾（主体贴图、状态特效绘制之后）调用。用于绘制角色专属视觉元素。

**刺客示例**：残影绘制、次元斩刀光、裂空斩刀光、大招刀光。
**弓箭手示例**：火矢/追踪 buff 光晕、蓄力条。

```js
onFighterDraw(ctx, fighter, world) {
    if (fighter.charId !== 'mychar') return;
    const px = fighter.x - world.camera.x;
    // Canvas 绘制...
}
```

#### `onProjectileUpdate(world, i, p)`
在投射物每帧位置/寿命更新之后调用。返回 `true` 表示已处理（该投射物不会继续走默认流程）。

**魔女示例**：陨石（`type === 'meteor'`）落地爆炸、空中寿命结束爆炸。

```js
onProjectileUpdate(world, i, p) {
    if (p.type !== 'my_type') return false;
    // 自定义投射物更新逻辑...
    return true;  // 已处理，跳过默认
}
```

#### `onProjectileHit(world, p, target, i)`
投射物碰撞到目标时调用。返回 `true` 表示已处理（跳过默认伤害流程）。

**刺客示例**：裂空斩剑气穿透（不消失、用 hitTargets 去重）。
**魔女示例**：陨石直接命中目标时触发爆炸。
**弓箭手示例**：火焰箭命中时在地面生成火焰区域。

```js
onProjectileHit(world, p, target, i) {
    if (p.owner && p.owner.charId !== 'mychar') return false;
    // 自定义命中逻辑...
    return true;  // 已处理
}
```

#### `onDashContact(f, target)`
突进判定碰到对手时调用。返回 `true` 表示**已处理，跳过默认突进伤害和击飞**。

**刺客示例**：一瞬无伤突进，不造成伤害也不击飞。

```js
onDashContact(f, target) {
    if (f.charId !== 'mychar') return false;
    return true;  // 跳过默认伤害
}
```

#### `onDamageDealt(attacker, target, baseDmg)`
在 `applyDamage()` 中计算最终伤害前调用。可返回 `{ isCritical: true }` 触发暴击（伤害 ×1.5 + 暴击特效粒子）。

**刺客示例**：暗影游走状态下 50% 概率暴击。

```js
onDamageDealt(attacker, target, baseDmg) {
    if (attacker && attacker.charId === 'mychar' && attacker.someCondition) {
        if (Math.random() < 0.5) return { isCritical: true };
    }
    return null;  // 不触发暴击
}
```

#### `onDamageReceived(target, attacker, dmg)`
在伤害计算完成、目标即将扣血前调用。用于受击方触发被动效果。

**圣骑士示例**：受到伤害时将伤害量转化为能量。

```js
onDamageReceived(target, attacker, dmg) {
    if (target.charId !== 'mychar') return;
    target.energy = Math.min(target.maxEnergy, target.energy + dmg);
}
```

#### `onOverlayDraw(ctx, world)`
在 `draw()` 末尾，所有元素绘制完成之后调用。用于全屏叠加效果。

**刺客示例**：大招激活时，播放 14 帧刺客大招全屏动画叠加。

```js
onOverlayDraw(ctx, world) {
    if (player.charId !== 'mychar' || !player.isUlting) return;
    // 全屏绘制...
}
```

#### `onHUD(player)`
在 `updateHUD()` 末尾调用。用于自定义能量条样式、添加额外 UI 元素。

**圣骑士示例**：将能量条渲染为金色。
**弓箭手示例**：显示箭矢计数。
**刺客示例**：创建暗影能量 5 格条。

```js
onHUD(player) {
    if (player.charId !== 'mychar') return;
    // 自定义 HUD...
}
```

#### `onPickup(owner, pickupType)`
玩家拾取道具时调用。`pickupType` 是 `PICKUP_DEFS` 的键名（`'energy'` / `'health'` / `'attack'` / `'cooldown'`）。

**弓箭手示例**：拾取冷却道具时额外补充 3 支箭矢。

```js
onPickup(owner, pickupType) {
    if (owner.charId !== 'mychar') return;
    if (pickupType === 'cooldown') {
        // 自定义拾取效果...
        updateHUD();
    }
}
```

#### `initFighter(fighter)`
在 `initGame()` 中为每个 Fighter 初始化时调用。用于设置角色专属的额外初始状态。

**刺客示例**：初始化暗影能量、斩击、无敌、大招等全部 18 个额外字段。
**弓箭手示例**：初始化箭矢数、火矢/追踪 buff。

```js
initFighter(fighter) {
    if (fighter.charId !== 'mychar') return;
    fighter.myCustomState = 0;
    // ...
}
```

#### `initResources()`
游戏启动时调用一次。用于加载角色专属的图片资源（如帧动画序列）。

**刺客示例**：加载 14 帧大招全屏动画 `assassin_u/0.jpg` ~ `assassin_u/13.jpg`。

```js
initResources() {
    for (let i = 0; i < 10; i++) {
        myUltFrames.push(loadImage('assets/mychar_ult/' + i + '.jpg'));
    }
}
```

---

### 完整示例：最小化角色

以下是从零开始创建可运行角色的最小完整模板。**普攻走默认近战命中流程、技能走默认投射物流程，无需任何额外钩子**；首次测试只需确认贴图、普攻近战、技能丢投射物正常即可。

```js
// ===== 我的角色 (mychar) =====

// 1. 角色配置（含反射字段 + world 数组声明）
CHAR_CONFIGS.mychar = {
    id: 'mychar', name: '我的角色', hp: 100, maxEnergy: 100, energyRegen: 0.05,
    speed: 2.0, jumpPower: -10, attackRange: 44, attackDamage: 5,
    attackCooldown: 60, attackDelay: 8, attackDuration: 68,
    images: {
        idle: loadImage("assets/13-20260703003612.png"),   // 复用弓箭手贴图作为占位
        walk: loadImage("assets/13-20260703003612.png"),
        jump: loadImage("assets/14-20260703142221.png"),
        attack: loadImage("assets/15-20260703142258.png"),
    },
    // 角色专属字段：Fighter 构造与重开时自动反射初始化
    fields: {
        myCustomVar: 0,
    },
    // 角色需要的 world 数组：initGame 自动创建 world[name] = []
    worldArrays: [],
    // 图鉴（可选）
    dex: {
        icon: '🐉', intro: '示例角色。',
        stats: [{ label:'生命', value:'100' },{ label:'能量上限', value:'100' }],
        skills: [
            { name:'挥砍（普攻）', desc:'近战 5 伤害', meta:'消耗：无｜冷却：1 秒' },
            { name:'火球（技能一）', desc:'投射物 10 伤害', meta:'消耗：20 能量｜冷却：8 秒' },
        ]
    },
};

// 2. 技能工厂
CHAR_SKILL_FACTORIES.mychar = function create_mychar_skills() {
    return [
        // 普攻：走 Fighter 默认近战判定（自动对攻击框命中的敌人 applyDamage 5）
        new Skill({
            key: 'attack', name: '挥砍', cooldown: 60, energyCost: 0,
            canUse: (o) => o.attackCooldown <= 0 && !o.attacking,
            execute: (o) => {
                const cfg = CHAR_CONFIGS.mychar;
                o.attacking = true; o.attackTimer = cfg.attackDuration;
                o.attackDelay = cfg.attackDelay; o.attackHitDealt = false;
                o.attackCooldown = cfg.attackCooldown; o.state = 'attack';
                playSound('swing'); return { success: true };
            }
        }),
        // 技能一：发射投射物（走默认 projectiles 更新/碰撞/绘制流程）
        new Skill({
            key: 'skill1', name: '火球', cooldown: 480, energyCost: 20,
            canUse: (o) => true,
            execute: (o) => {
                world.projectiles.push({
                    x: o.x + (o.facing > 0 ? o.w : -32), y: o.y + 30,
                    w: 32, h: 24, vx: 5 * o.facing, vy: 0,
                    life: 90, damage: 10, owner: o,
                    type: 'mychar_ball', color: '#ff4400', reflected: false,
                });
                playSound('wave'); return { success: true };
            }
        }),
    ];
};

// 3. 钩子：仅需 handleInput（所有角色必须实现，用于按键分发）
CHAR_CONFIGS.mychar.hooks = {
    handleInput(player, world) {
        let moveX = 0;
        if (keys.left)  moveX = -1;
        if (keys.right) moveX = 1;
        if (keys.up && player.grounded) { player.vy = JUMP_SPEED; player.grounded = false; }

        if (keys.attack && player.attackCooldown <= 0 && !player.attacking) {
            const s = player.getSkill('attack');
            if (s) { const r = s.tryUse(player); if (r.success) keys.attack = false; }
        }
        if (keys.skill1) { const s = player.getSkill('skill1'); if (s) { const r = s.tryUse(player); if (r.success) keys.skill1 = false; } }

        if (!player.hasStatus('frozen') && !player.dashing) {
            player.vx += moveX * 0.25;
            const maxSpd = 2.25;
            if (Math.abs(player.vx) > maxSpd) player.vx = maxSpd * Math.sign(player.vx);
        }
        if (player.grounded && moveX === 0 && !player.attacking && !player.dashing) player.state = 'idle';
        else if (player.grounded && moveX !== 0 && !player.attacking && !player.dashing) player.state = 'walk';
        if (player.attacking && player.attackTimer <= 0) { player.attacking = false; player.state = 'idle'; }
    }
};
```

**说明**：
- `fields` — 所有角色专属的初始字段（含默认值）写在这里，Fighter 构造函数和 `initGame` 重开时自动反射初始化。数组/对象值会被浅拷贝，避免 PvP 双角色共享引用。
- `worldArrays` — 角色需要挂在 world 上的动态数组（如影武者的 `['phantoms']`、魔女的 `['tornadoes','vortexes']`），`initGame` 会自动创建为 `[]`。无需在文件里手写防御性 `if (!world.xxx) world.xxx = []` 检查。
- `handleInput` — 每帧按键分发的入口，**所有角色必须实现**。参考 `knight.js` 的通用近战流程或上面示例。

---

### 注册角色

在 `index.html` 中添加一行 `<script>`：

```html
<script src="js/characters/knight.js"></script>
<script src="js/characters/mage.js"></script>
...
<script src="js/characters/mychar.js"></script>   <!-- ← 新增 -->
```

无需修改任何 JS 系统文件。

---

### 可用的全局 API

在钩子函数中可以安全调用的全局变量和函数：

**游戏状态**
- `player` / `enemy` — 两个 Fighter 实例
- `world` — GameWorld 容器
- `gameMode` — `'pve'` 或 `'pvp'`
- `frame` — 当前帧号
- `keys` — 按键状态 `{left, right, up, attack, skill1, skill2, ult}`

**工具函数**
- `getOpponent(fighter)` — 获取对手
- `rectCollide(a, b)` — 矩形碰撞检测
- `applyDamage(target, dmg, attacker, knockback?, hitColor?, soundName?)` — 统一伤害入口
- `clamp(v, min, max)`

**特效 / 音效**
- `emitParticles(x, y, count, color, speed, size, type, spread)`
- `emitSlash(x, y, dir, color)`
- `emitExplosion(x, y, color, count)`
- `playSound(type)` — `'swing'` / `'wave'` / `'parry'` / `'ult'` / `'hit_player'` / `'hit_enemy'` / `'pickup'` / `'arrow'`
- `triggerAssassinDodge(owner)` — 刺客闪避成功（仅刺客使用）
- `triggerSlowMotion(duration)` — 触发全局慢放

**常量**
- `W: 800, H: 450` — 画布尺寸
- `MAP_W: 2400` — 地图总宽
- `GROUND_Y: 380` — 地面 Y 坐标
- `GRAVITY: 0.22` / `JUMP_SPEED: -10`
- `IMG` — 所有贴图引用
- `CHAR_CONFIGS` — 角色配置注册表

**UI 操作**
- `updateHUD()` / `updateSkillButtons()`
- `gameRunning` / `gameOver` / `showResult(title, sub)`

---

### 最佳实践

1. **每个钩子第一行做好 `charId` 守卫**。钩子会被所有角色共享调用，不守卫会污染其他角色。
2. **投射物 type 用唯一字符串**。建议格式：`'角色名_类型'`（如 `'assassin_skill2'`）。
3. **复杂新增状态字段在 `initFighter` 中重置**。确保重开时状态干净。
4. **新增资源在 `initResources` 中加载**。避免在配置阶段做耗时操作。
5. **实现自定义输入时使用 `handleInput` 钩子**。角色专属的按键处理（移动、跳跃、技能分发）放在 `handleInput(player, world)` 中，返回 `false` 可提前终止本帧的 AI/物理。
6. **不直接修改系统文件**。所有差异通过钩子和配置字段消化。以下少数例外可能需要最小侵入：AI 目标优先策略（`updateAI`）、隐身渲染分支（`drawFighter`）。
7. **参考现有角色**。结构最完整的参考是 `assassin.js`（8 钩子 + handleInput），最简参考是 `knight.js`（handleInput 钩子）。
