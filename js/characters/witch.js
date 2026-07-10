// ===== 魔女 (witch) =====

CHAR_CONFIGS.witch = {
            id: 'witch', name: '魔女', hp: 70, maxEnergy: 120, energyRegen: 0.083,
            speed: 2.0, jumpPower: -9, attackRange: 0, attackDamage: 0,
            attackCooldown: 120, attackDelay: 0, attackDuration: 0,
            images: { idle: loadImage("assets/40-20260705223746.png"), walk: loadImage("assets/43-20260705224001.png"), jump: loadImage("assets/41-20260705223805.png"), attack: loadImage("assets/42-20260705223935.png"), ult: loadImage("assets/44-20260705224021.png") },
            isWitch: true,
    dex: {
        icon: '🧹',
        intro: '风暴裹挟着紫色的裂隙，从天空的伤口中落下。她未踏足战场，风已先至——不是来战斗的，是来终结的。陨石撕裂天穹、火光填满人们的瞳孔。\n"果然，凡人还是与地面比较适配。"',
        stats: [{ label: '生命', value: '70' }, { label: '能量上限', value: '120' }],
        skills: [
            { name: '重力球（普通攻击）', desc: '向前方发射一颗重力球，造成 4 点伤害。命中后敌人被紫色光芒包裹，最大跳跃高度减少 20%，持续 2 秒。飞行状态下会斜向下发射。', meta: '消耗：3 能量 ｜ 冷却：2 秒' },
            { name: '风轨·绝啸（技能一）', desc: '在前方生成一个巨大龙卷风，持续 4 秒。龙卷风具有吸附效果，对靠近的敌人每 0.5 秒造成 5 点伤害。', meta: '消耗：20 能量 ｜ 冷却：15 秒' },
            { name: '黯渊·涡流（技能二）', desc: '在脚下留下一个漩涡并快速起跳，漩涡持续 3 秒，吸附敌人并每 0.5 秒造成 3 点伤害。', meta: '消耗：20 能量 ｜ 冷却：12 秒' },
            { name: '陨星·寂灭（大招）', desc: '只能在跳跃/飞行状态下释放。召唤一颗巨大陨石从天而降，撞击地面造成大范围（半径 400 像素）爆炸，造成 40 点伤害。释放后魔女进入悬停施法状态，直到陨石落地。', meta: '消耗：100 能量（需至少 120 能量） ｜ 冷却：无' },
            { name: '飞行（特殊机制）', desc: '跳跃到空中后再次按跳跃键即可展开飞行，身体悬停在空中并可自由水平移动（飞行时移速略降）。飞行持续消耗能量（每秒 8 点），能量耗尽会自动落下。飞行中可再次按跳跃键主动结束。飞行状态下重力球会斜向下方发射，大招「陨星·寂灭」也需在跳跃或飞行状态才能释放。', meta: '消耗：8 能量 / 秒 ｜ 空中再次跳跃触发' }
        ]
    },
    fields: {
        isFlying: false, flyEnergyDrain: 8/60,
        gravityDebuff: false, jumpReduction: 1,
        isCastingUlt: false, castUltX: 0, castUltY: 0,
    },
    worldArrays: ['tornadoes', 'vortexes'],
        }

CHAR_SKILL_FACTORIES.witch = function create_witch_skills() {
    return [
                // 普通攻击：重力球（飞行状态下斜下方发射）
                new Skill({
                    key: 'attack', name: '重力球', cooldown: 120, energyCost: 3,
                    canUse: (owner) => owner.attackCooldown <= 0 && !owner.attacking,
                    execute: (owner) => {
                        const dir = owner.facing;
                        const px = owner.x + (dir === 1 ? owner.w : 0);
                        const py = owner.y + 30;
                        // 根据是否飞行调整速度方向
                        let vx = 4 * dir;
                        let vy = 0;
                        if (owner.isFlying) {
                            vx = 3 * dir;   // 水平速度略减，体现斜向
                            vy = 2;         // 向下速度
                        }
                        world.projectiles.push({
                            x: px - 16, y: py - 12, w: 32, h: 24,
                            vx: vx, vy: vy, life: 120, damage: 4,
                            owner: owner, type: 'gravity', color: '#aa88ff',
                            reflected: false, img: loadImage("assets/45-20260705224120.png"),
                            isGravity: true,
                        });
                        emitParticles(px, py, 20, '#aa88ff', 4, 6, 'star', 0.8);
                        playSound('wave');
                        owner.attackCooldown = 120;
                        return { success: true };
                    }
                }),
                // 技能1：龙卷风
                new Skill({
                    key: 'skill1', name: '风轨·绝啸', cooldown: 900, energyCost: 20,
                    canUse: (owner) => true,
                    execute: (owner) => {
                        const x = owner.x + (owner.facing > 0 ? owner.w : -120);
                        const y = GROUND_Y - 40;
                        const tornado = {
                            x: x, y: y - 80, w: 120, h: 160,
                            life: 240, timer: 0, damage: 5, tickInterval: 60,
                            owner: owner, type: 'tornado',
                            img: loadImage("assets/50-20260705225200.png"),
                            pullStrength: 0.3,
                        };
                        world.tornadoes.push(tornado);
                        emitParticles(x + 60, y + 80, 40, '#88ddff', 6, 8, 'star', 1.5);
                        playSound('wave');
                        return { success: true };
                    }
                }),
                // 技能2：漩涡
                new Skill({
                    key: 'skill2', name: '黯渊·涡流', cooldown: 720, energyCost: 20,
                    canUse: (owner) => owner.grounded && !owner.attacking,
                    execute: (owner) => {
                        const x = owner.x - 40;
                        const y = GROUND_Y - 30;
                        const vortex = {
                            x: x, y: y, w: 80, h: 30,
                            life: 180, timer: 0, damage: 3, tickInterval: 30,
                            owner: owner, type: 'vortex',
                            img: loadImage("assets/47-20260705224456.png"),
                            pullStrength: 0.4,
                        };
                        world.vortexes.push(vortex);
                        owner.vy = -10;
                        owner.grounded = false;
                        emitParticles(x + 40, y + 15, 30, '#7744aa', 6, 8, 'star', 1.2);
                        playSound('wave');
                        return { success: true };
                    }
                }),
                // 大招：陨星·寂灭（只能在跳跃/飞行状态释放）
                new Skill({
                    key: 'ult', name: '陨星·寂灭', cooldown: 0, energyCost: 100,
                    canUse: (owner) => {
                        if (owner.grounded) return false;
                        if (owner.energy < 100) return false;
                        if (owner.attacking || owner.chargingAttack) return false;
                        return true;
                    },
                    execute: (owner) => {
                        const targetX = owner.x + owner.w / 2;   // 直接取施法者自身的中心X
                        const dir = owner.facing || 1;
                        const meteor = {
                            x: targetX - 200, y: -500,
                            w: 600, h: 600,
                            vx: 1 * dir, vy: 1,
                            life: 300,
                            damage: 40,
                            owner: owner,
                            type: 'meteor',
                            exploded: false,
                            img: loadImage("assets/46-20260705224210.png"),
                        };
                        world.projectiles.push(meteor);
                        // 设置施法状态
                        owner.isCastingUlt = true;
                        owner.castUltX = owner.x;
                        owner.castUltY = owner.y;
                        owner.state = 'ult';
                        owner.vx = 0;
                        owner.vy = 0;
                        playSound('ult');
                        emitParticles(meteor.x + 300, meteor.y + 300, 80, '#ff8844', 12, 15, 'star', 2.5);
                        return { success: true };
                    }
                })
    ];
};

CHAR_CONFIGS.witch.hooks = {
    // 女巫输入处理（含飞行切换）
    handleInput(player, world) {
        let moveX = 0;
        // ----- 飞行切换 -----
        if (keys.up) {
            if (player.grounded && !player.isFlying) {
                player.vy = player.jumpReduction * JUMP_SPEED;
                player.grounded = false;
                keys.up = false;
            } else if (!player.grounded && !player.isFlying && !player.attacking && !player.chargingAttack) {
                if (player.energy > 0) {
                    player.isFlying = true;
                    player.vy = 0;
                    keys.up = false;
                    emitParticles(player.x + player.w/2, player.y + player.h/2, 20, '#aa88ff', 4, 6, 'star', 0.8);
                }
            } else if (player.isFlying) {
                player.isFlying = false;
                keys.up = false;
                emitParticles(player.x + player.w/2, player.y + player.h/2, 20, '#aa88ff', 4, 6, 'star', 0.8);
            }
        }

        // 飞行能量消耗
        if (player.isFlying) {
            player.energy -= player.flyEnergyDrain;
            if (player.energy <= 0) {
                player.energy = 0;
                player.isFlying = false;
                emitParticles(player.x + player.w/2, player.y + player.h/2, 15, '#ff0000', 3, 5, 'circle', 0.6);
            }
        }

        // 水平移动
        if (keys.left) moveX = -1;
        if (keys.right) moveX = 1;
        if (moveX !== 0) {
            player.facing = moveX > 0 ? 1 : -1;
        }
        if (!player.hasStatus('frozen') && !player.dashing) {
            const speed = player.isFlying ? 1.8 : 2.0;
            player.vx += moveX * 0.25;
            if (Math.abs(player.vx) > speed) player.vx = speed * Math.sign(player.vx);
        }
        if (player.grounded && moveX === 0 && !player.attacking && !player.dashing) player.state = 'idle';
        else if (player.grounded && moveX !== 0 && !player.attacking && !player.dashing) player.state = 'walk';

        // 攻击 (重力球)
        if (keys.attack && !player.attacking && player.attackCooldown <= 0) {
            const skill = player.getSkill('attack');
            if (skill) { const result = skill.tryUse(player); if (result.success) keys.attack = false; }
        }

        // 技能1
        if (keys.skill1 && !player.attacking && !player.chargingAttack) {
            const skill = player.getSkill('skill1');
            if (skill) { const result = skill.tryUse(player); if (result.success) keys.skill1 = false; }
        }

        // 技能2
        if (keys.skill2 && !player.attacking && !player.chargingAttack && player.grounded) {
            const skill = player.getSkill('skill2');
            if (skill) { const result = skill.tryUse(player); if (result.success) keys.skill2 = false; }
        }

        // 大招
        if (keys.ult && !player.attacking && !player.chargingAttack) {
            const skill = player.getSkill('ult');
            if (skill) { const result = skill.tryUse(player); if (result.success) keys.ult = false; }
        }

        if (player.attacking && player.attackTimer <= 0) {
            player.attacking = false;
            player.state = 'idle';
        }
    },
    // 陨石投射物更新：落地爆炸 / 空中寿命结束爆炸
    onProjectileUpdate: function(world, i, p) {
        if (p.type !== 'meteor') return false;

        // 陨石落地爆炸（优先检测）
        if (p.y + p.h >= GROUND_Y) {
            // 清除施法状态
            if (p.owner && p.owner.isCastingUlt) {
                p.owner.isCastingUlt = false;
                p.owner.state = 'idle';
            }
            // 爆炸特效
            world.explosionEffects.push({
                x: p.x + p.w / 2 - 300,
                y: GROUND_Y - 300,
                w: 600, h: 600,
                life: 60, maxLife: 60,
                img: loadImage("assets/49-20260705224953.png"),
                alpha: 1
            });
            emitExplosion(p.x + p.w / 2, GROUND_Y - 20, '#ff8844', 120);
            emitExplosion(p.x + p.w / 2, GROUND_Y - 20, '#ffaa00', 80);
            // 范围伤害
            const explosionRadius = 400;
            const mTarget = getOpponent(p.owner);
            if (mTarget && mTarget.hp > 0) {
                const dist = Math.hypot(mTarget.x + mTarget.w / 2 - (p.x + p.w / 2),
                                        mTarget.y + mTarget.h / 2 - GROUND_Y);
                if (dist < explosionRadius) {
                    applyDamage(getOpponent(p.owner), p.damage, p.owner, false);
                    mTarget.vy = -12;
                    mTarget.vx = (mTarget.x - p.x) * 0.3;
                }
            }
            world.projectiles.splice(i, 1);
            return true;
        }

        // 超出边界或寿命结束时，陨石在空中触发爆炸
        if (p.x < -50 || p.x > MAP_W + 50 || p.y > GROUND_Y || p.life <= 0) {
            world.explosionEffects.push({
                x: p.x + p.w / 2 - 300,
                y: p.y + p.h / 2 - 300,
                w: 400, h: 400,
                life: 60, maxLife: 60,
                img: loadImage("assets/49-20260705224953.png"),
                alpha: 1
            });
            if (p.owner) {
                p.owner.isCastingUlt = false;
                p.owner.state = 'idle';
                p.owner.vx = 0;
                p.owner.vy = 0;
            }
            const explosionRadius = 400;
            const mTarget = getOpponent(p.owner);
            if (mTarget && mTarget.hp > 0) {
                const dist = Math.hypot(mTarget.x + mTarget.w / 2 - (p.x + p.w / 2),
                                        mTarget.y + mTarget.h / 2 - GROUND_Y);
                if (dist < explosionRadius) {
                    applyDamage(getOpponent(p.owner), p.damage, p.owner, false);
                    mTarget.vy = -12;
                    mTarget.vx = (mTarget.x - p.x) * 0.3;
                }
            }
            world.projectiles.splice(i, 1);
            return true;
        }

        return false;
    },

    // 陨石直接命中目标（极少情况，但保留）
    onProjectileHit: function(world, p, target, i) {
        if (p.type !== 'meteor') return false;

        world.explosionEffects.push({
            x: p.x + p.w / 2 - 300,
            y: p.y + p.h / 2 - 300,
            w: 600, h: 600,
            life: 60, maxLife: 60,
            img: loadImage("assets/49-20260705224953.png"),
            alpha: 1
        });
        if (p.owner) {
            p.owner.isCastingUlt = false;
            p.owner.state = 'idle';
            p.owner.vx = 0;
            p.owner.vy = 0;
        }
        const explosionRadius = 400;
        const mTarget = getOpponent(p.owner);
        if (mTarget && mTarget.hp > 0) {
            const dist = Math.hypot(mTarget.x + mTarget.w / 2 - (p.x + p.w / 2),
                                    mTarget.y + mTarget.h / 2 - (p.y + p.h / 2));
            if (dist < explosionRadius) {
                applyDamage(getOpponent(p.owner), p.damage, p.owner, false);
                mTarget.vy = -12;
                mTarget.vx = (mTarget.x - p.x) * 0.3;
            }
        }
        world.projectiles.splice(i, 1);
        return true;
    },

    // 魔女绘制钩子（施法状态视觉，预留）
    onFighterDraw: function(ctx, fighter, world) {
        if (fighter.charId !== 'witch') return;
        if (fighter.isCastingUlt) {
            // 施法大招视觉（预留，供后续扩展）
        }
    },

    // 魔女 HUD 钩子（预留）
    onHUD: function(player) {
        if (player.charId !== 'witch') return;
    },
};
