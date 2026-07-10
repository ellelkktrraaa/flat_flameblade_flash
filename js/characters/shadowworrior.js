// ===== 影武者 (shadowwarrior) =====

// 局部预载：绘制专用贴图
const SW_IMG = {
    trapA: loadImage("assets/无标题64_20260708193638.png"),   // 暗影替身 帧1
    trapB: loadImage("assets/无标题65_20260708193629.png"),   // 暗影替身 帧2
    cloneReveal: loadImage("assets/无标题67_20260708193339.png"), // 幻影·舞 遮挡
    iaidoSlash: loadImage("assets/无标题63_20260708191107.png"),  // 居合刀光
    retreat: loadImage("assets/无标题70_20260708193914.png"),     // 后撤
    breakStrike: loadImage("assets/无标题74_20260708195508.png"), // 破影一击
    iaidoBody: loadImage("assets/无标题68_20260708195710.png"),   // 居合姿态
    grab: loadImage("assets/nywz1.png"),                           // 抓取·法力球（敌人身上）
    grabBurst: loadImage("assets/nywz2.png"),                      // 抓取·爆炸（结束替换）
};

// 世界坐标 → 屏幕坐标绘制一张贴图（带朝向翻转）
function sw_drawImage(ctx, img, worldX, worldY, w, h, facing, alpha) {
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const px = worldX - world.camera.x;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.translate(px + w / 2, worldY + h / 2);
    ctx.scale(facing || 1, 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
}

CHAR_CONFIGS.shadowwarrior = {
    id: 'shadowwarrior', name: '影武者', hp: 90, maxEnergy: 100, energyRegen: 3 / 60,
    speed: 2.1, jumpPower: -10, attackRange: 44, attackDamage: 5,
    attackCooldown: 60, attackDelay: 8, attackDuration: 68,
    images: {
        idle: loadImage("assets/无标题61_20260708190607.png"),
        walk: loadImage("assets/无标题75_20260709014958.png"),
        jump: loadImage("assets/无标题62_20260708190832.png"),
        attack: loadImage("assets/无标题73_20260708195446.png"),
        ult: loadImage("assets/无标题68_20260708195710.png"),
    },
    ultEnergyNeed: 100,
    dex: {
        icon: '🥷',
        intro: '影随身动，刃自暗生。他不与你正面相搏，只在你的呼吸之间往返穿梭——当你终于看清那道残影时，刀锋早已归鞘。\n"你砍中的，从来都不是我。"',
        stats: [{ label: '生命', value: '90' }, { label: '能量上限', value: '100' }],
        skills: [
            { name: '胧月·斩（普通攻击）', desc: '挥刀劈砍，造成 5 点伤害。', meta: '消耗：无 ｜ 冷却：1 秒' },
            { name: '影缚·袭（技能一）', desc: '在原地生成暗影替身陷阱（存在 5 秒）。敌人靠近时替身化为影球包裹并抓取敌人，包裹造成 5 点伤害，随后炸裂造成 10 点伤害。', meta: '消耗：15 能量 ｜ 冷却：12 秒' },
            { name: '幻影·舞（技能二）', desc: '生成 2 个幻影分身（各 10 点血量）冲向敌人，仅能使用胧月·斩。敌方会优先攻击分身。', meta: '消耗：25 能量 ｜ 冷却：20 秒' },
            { name: '影舞流·居合（大招）', desc: '向前快速位移并留下一道刀光，自身姿态定格。刀光命中造成 10 点伤害并抓取，1 秒后爆炸造成 30 点伤害。', meta: '消耗：100 能量 ｜ 冷却：8 秒' },
            { name: '夜樱·隐（特殊机制）', desc: '使用技能1/2 后 1 秒内使用胧月·斩，改为后撤并隐身（对手视角消失），获得 1 秒无敌，最多维持 2.5 秒。隐身下胧月·斩变为破影一击（前冲，10 点伤害）。任意攻击/技能/大招都会解除隐身。', meta: '—' }
        ]
    },
    fields: {
        stealthActive: false, stealthTimer: 0,
        lastSkillTime: -999, retreatTimer: 0, retreatDir: 1,
        pendingTrap: false, shadowTrapActive: false, shadowTrap: null,
        pendingClones: false, cloneRevealTimer: 0,
        iaidoActive: false, iaidoTimer: 0,
        iaidoFrozen: false, iaidoDir: 1, iaidoSlash: null,
    },
    worldArrays: ['phantoms'],
};

CHAR_SKILL_FACTORIES.shadowwarrior = function create_shadowwarrior_skills() {
    return [
        // 胧月·斩（普通攻击）：走默认近战命中流程
        new Skill({
            key: 'attack', name: '胧月·斩', cooldown: 60, energyCost: 0,
            canUse: (owner) => owner.attackCooldown <= 0 && !owner.attacking,
            execute: (owner) => {
                const cfg = CHAR_CONFIGS.shadowwarrior;
                owner.attacking = true;
                owner.attackTimer = cfg.attackDuration;
                owner.attackDelay = cfg.attackDelay;
                owner.attackHitDealt = false;
                owner.attackCooldown = cfg.attackCooldown;
                owner.state = 'attack';
                playSound('swing');
                return { success: true };
            }
        }),
        // 影缚·袭（技能一）：标记生成陷阱
        new Skill({
            key: 'skill1', name: '影缚·袭', cooldown: 720, energyCost: 15,
            canUse: (owner) => !owner.shadowTrapActive,
            execute: (owner) => {
                owner.pendingTrap = true;
                owner.lastSkillTime = frame;
                emitParticles(owner.x + owner.w / 2, owner.y + owner.h / 2, 20, '#6633aa', 4, 6, 'star', 0.8);
                playSound('wave');
                return { success: true };
            }
        }),
        // 幻影·舞（技能二）：标记生成 2 个分身
        new Skill({
            key: 'skill2', name: '幻影·舞', cooldown: 1200, energyCost: 25,
            canUse: (owner) => true,
            execute: (owner) => {
                owner.pendingClones = true;
                owner.cloneRevealTimer = 30;
                owner.lastSkillTime = frame;
                emitParticles(owner.x + owner.w / 2, owner.y + owner.h / 2, 30, '#8844cc', 5, 7, 'star', 1.0);
                playSound('wave');
                return { success: true };
            }
        }),
        // 影舞流·居合（大招）
        new Skill({
            key: 'ult', name: '影舞流·居合', cooldown: 480, energyCost: 100,
            canUse: (owner) => owner.energy >= 100 && !owner.iaidoActive,
            execute: (owner) => {
                const dir = owner.facing;
                owner.iaidoActive = true;
                owner.iaidoTimer = 60;      // 大招持续 1 秒（60 帧），到点刀光爆炸
                owner.iaidoDir = dir;
                owner.iaidoFrozen = true;
                // 刀光留在释放起点前方（加长范围）
                owner.iaidoSlash = {
                    x: owner.x + (dir === 1 ? owner.w : -360),
                    y: owner.y - 4,
                    w: 360, h: owner.h + 8,
                    dir: dir, hitDealt: false
                };
                emitParticles(owner.x + owner.w / 2, owner.y + owner.h / 2, 40, '#8844cc', 8, 10, 'star', 1.8);
                playSound('ult');
                return { success: true };
            }
        })
    ];
};

CHAR_CONFIGS.shadowwarrior.hooks = {
    // ---- 输入处理 ----
    handleInput(player, world) {
        // 居合定格期间不响应移动/攻击输入
        if (player.iaidoActive && player.iaidoFrozen) {
            player.vx = 0;
            return;
        }

        let moveX = 0;
        if (!player.dashing) {
            if (keys.left) moveX = -1;
            if (keys.right) moveX = 1;
            if (keys.up && player.grounded) { player.vy = JUMP_SPEED; player.grounded = false; }
        }

        // 攻击键：区分 破影一击 / 夜樱·隐 / 普通斩
        if (keys.attack && !player.attacking) {
            if (player.stealthActive) {
                // 隐身中：破影一击（前冲突进）
                player.dashing = true;
                player.dashRemaining = 60;
                player.dashDir = player.facing;
                player.dashSpeed = 6;
                player.dashDamageDealt = false;
                player.stealthActive = false; // 攻击解除隐身
                emitParticles(player.x + player.w / 2, player.y + player.h / 2, 20, '#8844cc', 4, 6, 'star', 0.8);
                playSound('swing');
                keys.attack = false;
            } else if (frame - player.lastSkillTime <= 60) {
                // 夜樱·隐窗口：后撤 + 隐身（后撤用突进实现，距离对标刺客一瞬）
                player.stealthActive = true;
                player.stealthTimer = 150;     // 2.5 秒
                player.retreatTimer = 15;
                player.retreatDir = player.facing;
                player.isInvincible = true;
                player.invincibleTimer = 60;   // 1 秒无敌
                player.dashing = true;
                player.dashRemaining = 80;
                player.dashDir = -player.facing; // 向后突进
                player.dashSpeed = 5;
                player.dashDamageDealt = true;   // 后撤不造成突进伤害
                player.lastSkillTime = -999;   // 消耗掉窗口
                emitParticles(player.x + player.w / 2, player.y + player.h / 2, 24, '#6633aa', 5, 7, 'star', 1.0);
                playSound('wave');
                keys.attack = false;
            } else {
                // 普通胧月·斩
                const skill = player.getSkill('attack');
                if (skill) { const res = skill.tryUse(player); if (res.success) keys.attack = false; }
            }
        }

        // 技能/大招：使用即解除隐身
        if (keys.skill1) {
            const skill = player.getSkill('skill1');
            if (skill) { const res = skill.tryUse(player); if (res.success) { player.stealthActive = false; keys.skill1 = false; } }
        }
        if (keys.skill2) {
            const skill = player.getSkill('skill2');
            if (skill) { const res = skill.tryUse(player); if (res.success) { player.stealthActive = false; keys.skill2 = false; } }
        }
        if (keys.ult) {
            const skill = player.getSkill('ult');
            if (skill) { const res = skill.tryUse(player); if (res.success) { player.stealthActive = false; keys.ult = false; } }
        }

        // 水平移动
        if (!player.hasStatus('frozen') && !player.dashing) {
            player.vx += moveX * 0.25;
            const maxSpeed = 2.25;
            if (Math.abs(player.vx) > maxSpeed) player.vx = maxSpeed * Math.sign(player.vx);
        }
        if (player.grounded && moveX === 0 && !player.attacking && !player.dashing) player.state = 'idle';
        else if (player.grounded && moveX !== 0 && !player.attacking && !player.dashing) player.state = 'walk';
        if (player.attacking && player.attackTimer <= 0) { player.attacking = false; player.state = 'idle'; }
    },

    // ---- 每帧逻辑 ----
    onUpdate(world) {
        for (let f of world.entities) {
            if (f.charId !== 'shadowwarrior') continue;
            if (f.hp <= 0) continue;

            // 无敌计时
            if (f.isInvincible) {
                f.invincibleTimer--;
                if (f.invincibleTimer <= 0) f.isInvincible = false;
            }

            // 后撤计时
            if (f.retreatTimer > 0) f.retreatTimer--;

            // 夜樱·隐计时
            if (f.stealthActive) {
                f.stealthTimer--;
                if (f.stealthTimer <= 0) f.stealthActive = false;
            }

            // AI 影武者：技能1/2 后 1 秒窗口内自动触发夜樱·隐（玩家由 handleInput 按键触发）
            if (f !== player && !f.stealthActive && !f.iaidoActive && frame - f.lastSkillTime > 0 && frame - f.lastSkillTime <= 60) {
                f.stealthActive = true;
                f.stealthTimer = 150;
                f.retreatTimer = 15;
                f.retreatDir = f.facing;
                f.isInvincible = true;
                f.invincibleTimer = 60;
                f.dashing = true;
                f.dashRemaining = 80;
                f.dashDir = -f.facing;
                f.dashSpeed = 5;
                f.dashDamageDealt = true;
                f.lastSkillTime = -999;
                emitParticles(f.x + f.w / 2, f.y + f.h / 2, 24, '#6633aa', 5, 7, 'star', 1.0);
            }

            // 幻影·舞遮挡贴图计时
            if (f.cloneRevealTimer > 0) f.cloneRevealTimer--;

            // ---- 居合更新 ----
            if (f.iaidoActive) {
                // 前 20 帧前冲（加长位移距离）
                if (f.iaidoTimer > 40) {
                    f.x = clamp(f.x + f.iaidoDir * 14, 10, MAP_W - 10 - f.w);
                }
                f.vx = 0; f.vy = 0;
                const target = getOpponent(f);
                const slash = f.iaidoSlash;
                if (slash && target && target.hp > 0 && rectCollide(slash, target.getHitBox())) {
                    if (!slash.hitDealt) {
                        // 首次命中：斩击伤害 + 标记
                        applyDamage(target, 10, f);
                        slash.hitDealt = true;
                        emitSlash(target.x + target.w / 2, target.y + target.h / 2, f.iaidoDir > 0 ? 0 : Math.PI, '#8844cc');
                    }
                    // 抓取持续：每帧刷新 frozen，使抓取时长与大招持续时长一致
                    target.addStatus('frozen');
                }
                f.iaidoTimer--;
                if (f.iaidoTimer <= 0) {
                    // 刀光爆炸
                    if (slash && target && target.hp > 0 && rectCollide(slash, target.getHitBox())) {
                        applyDamage(target, 30, f);
                    }
                    // 解除抓取（使抓取时长严格等于大招持续时长）
                    if (target) target.statuses = target.statuses.filter(s => s.id !== 'frozen');
                    if (slash) emitExplosion(slash.x + slash.w / 2, slash.y + slash.h / 2, '#8844cc', 60);
                    f.iaidoActive = false;
                    f.iaidoFrozen = false;
                    f.iaidoSlash = null;
                    f.state = 'idle';
                }
            }

            // ---- 暗影替身（陷阱） ----
            if (f.pendingTrap) {
                f.shadowTrap = {
                    x: f.x, y: f.y, w: 40, h: 56,
                    timer: 300, anim: 0, phase: 'idle', captureTimer: 0,
                    captured: null, burstTimer: 0
                };
                f.shadowTrapActive = true;
                f.pendingTrap = false;
            }
            if (f.shadowTrapActive && f.shadowTrap) {
                const trap = f.shadowTrap;
                trap.anim++;
                trap.timer--;
                const target = getOpponent(f);
                if (trap.phase === 'idle') {
                    if (target && target.hp > 0 && rectCollide(trap, target.getHitBox())) {
                        // 触发包裹抓取
                        trap.phase = 'capture';
                        trap.captureTimer = 45;
                        trap.captured = target;
                        applyDamage(target, 5, f);
                        target.addStatus('frozen');
                        emitParticles(target.x + target.w / 2, target.y + target.h / 2, 20, '#6633aa', 4, 6, 'circle', 0.8);
                    } else if (trap.timer <= 0) {
                        // 超时消失
                        f.shadowTrapActive = false;
                        f.shadowTrap = null;
                    }
                } else if (trap.phase === 'capture') {
                    // 抓取期间持续锁定，并让特效跟随敌人
                    if (target && target.hp > 0) {
                        target.addStatus('frozen');
                        trap.x = target.x - 4;
                        trap.y = target.y;
                    }
                    trap.captureTimer--;
                    if (trap.captureTimer <= 0) {
                        // 炸裂：结算伤害、解除抓取、切换爆炸贴图
                        if (target && target.hp > 0) applyDamage(target, 10, f);
                        if (target) target.statuses = target.statuses.filter(s => s.id !== 'frozen');
                        emitExplosion(trap.x + trap.w / 2, trap.y + trap.h / 2, '#8844cc', 50);
                        trap.phase = 'burst';
                        trap.burstTimer = 18; // 爆炸贴图停留约 0.3 秒
                    }
                } else if (trap.phase === 'burst') {
                    trap.burstTimer--;
                    if (trap.burstTimer <= 0) {
                        f.shadowTrapActive = false;
                        f.shadowTrap = null;
                    }
                }
            }

            // ---- 幻影分身生成 ----
            if (f.pendingClones) {
                for (let i = 0; i < 2; i++) {
                    world.phantoms.push({
                        x: f.x + (i === 0 ? -40 : 40), y: f.y,
                        w: 32, h: 56, vx: 0, vy: 0,
                        hp: 10, maxHp: 10,
                        facing: f.facing, grounded: true,
                        owner: f, state: 'idle', imageState: 'idle',
                        attacking: false, attackTimer: 0, attackCooldown: 0,
                        attackDelay: 0, attackHitDealt: false,
                        hitCd: 0, alive: true, life: 600
                    });
                }
                f.pendingClones = false;
            }
        }

        // ---- 幻影分身更新（全局） ----
        if (world.phantoms && world.phantoms.length > 0) {
            for (let i = world.phantoms.length - 1; i >= 0; i--) {
                const ph = world.phantoms[i];
                // 清理：owner 阵亡 / 分身死亡 / 超时
                if (!ph.owner || ph.owner.hp <= 0 || ph.hp <= 0 || (ph.life--) <= 0) {
                    emitParticles(ph.x + ph.w / 2, ph.y + ph.h / 2, 20, '#8844cc', 4, 6, 'star', 0.8);
                    world.phantoms.splice(i, 1);
                    continue;
                }
                if (ph.hitCd > 0) ph.hitCd--;

                const target = getOpponent(ph.owner);

                // 简单 AI：朝敌人移动
                if (target && target.hp > 0) {
                    const dx = target.x - ph.x;
                    const dist = Math.abs(dx);
                    ph.facing = dx > 0 ? 1 : -1;
                    if (dist > 46) {
                        ph.x += Math.sign(dx) * 2.2;
                        ph.state = 'walk';
                    } else {
                        ph.state = 'idle';
                        // 到达攻击距离：胧月·斩
                        if (ph.attackCooldown <= 0 && !ph.attacking) {
                            ph.attacking = true;
                            ph.attackTimer = 30;
                            ph.attackDelay = 8;
                            ph.attackHitDealt = false;
                            ph.attackCooldown = 60;
                            ph.state = 'attack';
                        }
                    }
                }

                // 重力落地
                ph.y = GROUND_Y - ph.h;
                ph.grounded = true;

                // 攻击命中判定
                if (ph.attacking) {
                    ph.attackTimer--;
                    if (ph.attackDelay > 0) {
                        ph.attackDelay--;
                        if (ph.attackDelay <= 0 && !ph.attackHitDealt) {
                            ph.attackHitDealt = true;
                            if (target && target.hp > 0) {
                                const ox = ph.facing === 1 ? ph.w : -44;
                                const box = { x: ph.x + ox, y: ph.y + 6, w: 44, h: ph.h - 16 };
                                if (rectCollide(box, target.getHitBox())) {
                                    applyDamage(target, 5, ph.owner);
                                    emitSlash(target.x + target.w / 2, target.y + target.h / 2, ph.facing > 0 ? 0 : Math.PI, '#8844cc');
                                }
                            }
                        }
                    }
                    if (ph.attackTimer <= 0) { ph.attacking = false; ph.state = 'idle'; ph.imageState = 'idle'; }
                }
                if (ph.attackCooldown > 0) ph.attackCooldown--;

                // 分身姿态
                ph.imageState = ph.attacking ? 'attack' : (ph.state === 'walk' ? 'walk' : 'idle');

                // ---- 分身受击（被敌方近战/投射物命中） ----
                const foe = getOpponent(ph.owner);
                if (foe && foe.hp > 0) {
                    // 近战
                    if (foe.attacking && foe.attackHitDealt && ph.hitCd <= 0) {
                        if (rectCollide(foe.getAttackBox(), { x: ph.x + 4, y: ph.y + 4, w: ph.w - 8, h: ph.h - 8 })) {
                            ph.hp -= (foe.config.attackDamage || 5);
                            ph.hitCd = 30;
                            emitParticles(ph.x + ph.w / 2, ph.y + ph.h / 2, 12, '#ff8844', 3, 5, 'star', 0.6);
                        }
                    }
                    // 敌方投射物
                    for (let j = world.projectiles.length - 1; j >= 0; j--) {
                        const p = world.projectiles[j];
                        if (p.owner === ph.owner) continue; // 不受本方投射物影响
                        if (rectCollide(p, { x: ph.x + 4, y: ph.y + 4, w: ph.w - 8, h: ph.h - 8 })) {
                            ph.hp -= (p.damage || 5);
                            emitParticles(ph.x + ph.w / 2, ph.y + ph.h / 2, 12, '#ff8844', 3, 5, 'star', 0.6);
                            if (!p.piercing) world.projectiles.splice(j, 1);
                        }
                    }
                }
            }
        }
    },

    // ---- 突进接触：破影一击造成 10 点伤害 ----
    onDashContact(f, target) {
        if (f.charId !== 'shadowwarrior') return false;
        applyDamage(target, 10, f);
        target.vx = f.dashDir * 6;
        emitParticles(target.x + target.w / 2, target.y + target.h / 2, 30, '#8844cc', 8, 10, 'star', 1.4);
        return true; // 跳过默认 15 点伤害
    },

    // ---- 主体绘制后：居合姿态 / 后撤 / 破影 贴图叠加 ----
    onFighterDraw(ctx, fighter, world) {
        if (fighter.charId !== 'shadowwarrior') return;
        // 隐身自身透明由系统 drawFighter 处理，这里不重复
    },

    // ---- 覆盖层绘制：陷阱、分身、刀光、遮挡、特殊姿态 ----
    onOverlayDraw(ctx, world) {
        // 找到场上的影武者
        for (let f of world.entities) {
            if (f.charId !== 'shadowwarrior' || f.hp <= 0) continue;

            // 暗影替身：idle 待机动画（原地两帧交替）；capture 法力球包裹敌人；burst 爆炸
            if (f.shadowTrapActive && f.shadowTrap) {
                const trap = f.shadowTrap;
                if (trap.phase === 'idle') {
                    const img = (Math.floor(trap.anim / 30) % 2 === 0) ? SW_IMG.trapA : SW_IMG.trapB;
                    sw_drawImage(ctx, img, trap.x, trap.y, trap.w + 8, trap.h, 1, 0.7);
                } else if (trap.phase === 'capture') {
                    // 法力球渲染在被抓敌人身上
                    const t = trap.captured;
                    if (t) sw_drawImage(ctx, SW_IMG.grab, t.x - 10, t.y - 10, t.w + 20, t.h + 20, 1, 0.95);
                } else if (trap.phase === 'burst') {
                    const t = trap.captured;
                    const bx = t ? t.x - 10 : trap.x - 10;
                    const by = t ? t.y - 10 : trap.y - 10;
                    const bw = (t ? t.w : trap.w) + 20;
                    const bh = (t ? t.h : trap.h) + 20;
                    sw_drawImage(ctx, SW_IMG.grabBurst, bx, by, bw, bh, 1, 1);
                }
            }

            // 居合刀光
            if (f.iaidoActive && f.iaidoSlash) {
                sw_drawImage(ctx, SW_IMG.iaidoSlash, f.iaidoSlash.x, f.iaidoSlash.y, f.iaidoSlash.w, f.iaidoSlash.h, f.iaidoDir, 0.85);
                // 居合定格姿态
                sw_drawImage(ctx, SW_IMG.iaidoBody, f.x, f.y, f.w, f.h, f.facing, 1);
            }

            // 后撤贴图
            if (f.retreatTimer > 0) {
                sw_drawImage(ctx, SW_IMG.retreat, f.x, f.y, f.w, f.h, f.facing, (f === player && f.stealthActive) ? 0.5 : 1);
            }

            // 幻影·舞 遮挡贴图
            if (f.cloneRevealTimer > 0) {
                sw_drawImage(ctx, SW_IMG.cloneReveal, f.x - 8, f.y - 8, f.w + 16, f.h + 16, f.facing, 1);
            }
        }

        // 幻影分身绘制
        if (world.phantoms && world.phantoms.length > 0) {
            const imgs = CHAR_CONFIGS.shadowwarrior.images;
            for (const ph of world.phantoms) {
                if (ph.hp <= 0) continue;
                let img = imgs.idle;
                if (ph.imageState === 'attack') img = imgs.attack;
                else if (ph.imageState === 'walk') img = imgs.walk;
                sw_drawImage(ctx, img, ph.x, ph.y, ph.w, ph.h, ph.facing, 0.75);
                // 分身血条
                const px = ph.x - world.camera.x;
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(px, ph.y - 8, ph.w, 4);
                ctx.fillStyle = '#8844cc';
                ctx.fillRect(px, ph.y - 8, ph.w * Math.max(0, ph.hp / ph.maxHp), 4);
                ctx.restore();
            }
        }
    },

    // ---- 初始化 ----
    initFighter(fighter) {
        if (fighter.charId !== 'shadowwarrior') return;
        // 清空该角色遗留的分身
        world.phantoms.length = 0;
    }
};
