// ===== 刺客 (assassin) =====

CHAR_CONFIGS.assassin = {
    id: 'assassin', name: '刺客', hp: 90, maxEnergy: 100, energyRegen: 3/60,
    speed: 2.4, jumpPower: -10, attackRange: 50, attackDamage: 5,
    attackCooldown: 60, attackDelay: 8, attackDuration: 30,
    images: {
        idle: loadImage("assets/56-20260706194405.png"), // 原url: https://i.ibb.co/LzRzL1XB/56-20260706194405.png
        walk: loadImage("assets/56-20260706194405.png"), // 原url: https://i.ibb.co/LzRzL1XB/56-20260706194405.png
        jump: loadImage("assets/60-20260706195326.png"), // 原url: https://i.ibb.co/JRSvB0bZ/60-20260706195326.png
        attack: loadImage("assets/53.png"), // 原url: https://i.ibb.co/JFFYY90D/53.png
        skill1: loadImage("assets/59-20260706194857.png"), // 原url: https://i.ibb.co/NdMzsbtW/59-20260706194857.png
        skill2: loadImage("assets/55-20260706194334.png"), // 原url: https://i.ibb.co/Cpy7QX7C/55-20260706194334.png
        ult: loadImage("assets/57-20260706194512.png"), // 原url: https://i.ibb.co/N2G0n1qY/57-20260706194512.png
        charge: loadImage("assets/59-20260706194857.png")  // 原url: https://i.ibb.co/NdMzsbtW/59-20260706194857.png
    },
    isAssassin: true, ultEnergyNeed: 100, canSkill2InAir: true,
    slashImg: loadImage("assets/53.png"), // 原url: https://i.ibb.co/JFFYY90D/53.png
    skill2Slash: loadImage("assets/54.png"), // 原url: https://i.ibb.co/cKjCzDr4/54.png
    dex: {
        icon: '🗡️',
        intro: '刃光掠过，胜负已分。他不在光明中战斗，只在阴影里收割——每一次呼吸都可能是最后一击，每一次闪避都为下一次绝杀埋下伏笔。\n"没有痛苦……一瞬间就会结束。"',
        stats: [{ label: '生命', value: '90' }, { label: '能量上限', value: '100' }],
        skills: [
            { name: '次元斩（普通攻击）', desc: '挥刀切割空间，在面前生成一道持续 0.5 秒的斩击，造成 5 点伤害。', meta: '消耗：无 ｜ 冷却：1 秒' },
            { name: '一瞬（技能一）', desc: '向前瞬移一小段距离（速度 5），期间无敌。立即刷新次元斩冷却，并在 0.5 秒内强化下次次元斩——斩击出现在身后，伤害提升至 8 点，命中恢复 5 能量。', meta: '消耗：15 能量 ｜ 冷却：无' },
            { name: '裂空斩（技能二）', desc: '斩出一道穿透一切的剑气（非飞行物），对路径上所有敌人造成 15 点伤害。释放时屏幕剧烈抖动。', meta: '消耗：20 能量 ｜ 冷却：13 秒' },
            { name: '天地灭尽（大招）', desc: '斩出大面积刀光，持续 3 秒。期间时间停止，敌我双方无法行动，每 0.25 秒造成 2.5 点伤害（共约 30 点）。', meta: '消耗：100 能量 ｜ 冷却：无' },
            { name: '暗影游走（特殊机制）', desc: '使用「一瞬」穿过敌人攻击时触发闪避，积攒 1 格暗影能量（共 5 格）。满格后进入暗影游走状态，移动留下残影，攻击有 50% 概率暴击（伤害 1.5 倍），持续消耗暗影能量，8 秒后耗尽。', meta: '闪避成功恢复 1 格 ｜ 满格触发强化' }
        ]
    },
    fields: {
        shadowEnergy: 0, shadowEnergyMax: 5, shadowStance: false, shadowStanceTimer: 0,
        shadowEnergyDrainRate: 5/480,
        isInvincible: false, invincibleTimer: 0,
        enhancedSlash: false, enhancedSlashTimer: 0,
        slashActive: false, slashTimer: 0,
        slashX: 0, slashY: 0, slashFacing: 1, slashDamageDealt: false,
        skill2Active: false, skill2Timer: 0,
        skill2X: 0, skill2Y: 0, skill2Facing: 1, skill2DamageDealt: false,
        ultActive: false, ultTimer: 0, ultDamageTimer: 0,
        timeStop: false, timeStopTimer: 0,
        dodgeSuccess: false, dodgeSlowMo: 0,
        shadowTrail: [], maxShadowTrail: 12,
    },
    worldArrays: [],
}

CHAR_SKILL_FACTORIES.assassin = function create_assassin_skills() {
    return [
                new Skill({
                    key: 'attack', name: '次元斩', cooldown: 60, energyCost: 0,
                    canUse: (owner) => owner.attackCooldown <= 0 && !owner.attacking && !owner.ultActive,
                    execute: (owner) => {
                        owner.attacking = true;
                        owner.attackTimer = 30;
                        owner.attackDelay = 8;
                        owner.attackHitDealt = false;
                        owner.attackCooldown = 60;
                        owner.state = 'attack';
                        owner.slashActive = true;
                        owner.slashTimer = 30;
                        owner.slashFacing = owner.facing;
                        owner.slashDamageDealt = false;
                        // 如果处于强化状态，斩击出现在身后
                        if (owner.enhancedSlash && owner.enhancedSlashTimer > 0) {
                            owner.slashX = owner.x - (owner.facing * 40) + owner.w/2 - 50;
                            owner.slashY = owner.y + 10;
                            owner.enhancedSlash = false;
                            owner.enhancedSlashTimer = 0;
                        } else {
                            owner.slashX = owner.x + (owner.facing > 0 ? owner.w : -60) + 10;
                            owner.slashY = owner.y + 10;
                        }
                        playSound('swing');
                        return { success: true };
                    }
                }),
                // ---- 技能1：一瞬 ----
                new Skill({
                    key: 'skill1', name: '一瞬', cooldown: 0, energyCost: 25,
                    canUse: (owner) => !owner.dashing && !owner.ultActive && !owner.attacking,
                    execute: (owner) => {
                        // 无敌
                        owner.isInvincible = true;
                        owner.invincibleTimer = 20;
                        // 重置闪避标记，让本次「一瞬」重新判定完美闪避
                        owner.dodgeSuccess = false;
                        // 突进
                        owner.dashing = true;
                        owner.dashRemaining = 80;
                        owner.dashDir = owner.facing;
                        owner.dashSpeed = 5;
                        owner.dashDamageDealt = false;
                        // 刷新次元斩冷却
                        owner.attackCooldown = 0;
                        // 强化下次次元斩
                        owner.enhancedSlash = true;
                        owner.enhancedSlashTimer = 30; // 0.5秒
                        // 完美闪避判定改为在无敌冲刺期间持续检测（见刺客特殊逻辑），
                        // 用增大的受击体积，冲刺穿过敌人攻击也能触发
                        // 特效
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 20, '#aa88ff', 4, 6, 'star', 0.8);
                        playSound('wave');
                        return { success: true };
                    }
                }),
                // ---- 技能2：裂空斩（远程穿透） ----
new Skill({
    key: 'skill2', name: '裂空斩', cooldown: 780, energyCost: 20,
    canUse: (owner) => !owner.attacking && !owner.ultActive && !owner.dashing,
    execute: (owner) => {
        // 屏幕抖动
        document.getElementById('gameWrapper').style.animation = 'shake 0.4s';
        setTimeout(() => document.getElementById('gameWrapper').style.animation = '', 400);

        // 创建远程剑气投射物
        const dir = owner.facing;
        const startX = owner.x + (dir === 1 ? owner.w : 0);
        const startY = owner.y + 20;

        world.projectiles.push({
            x: startX,
            y: startY,
            w: 60,          // 剑气宽度
            h: 30,          // 剑气高度
            vx: 8 * dir,    // 速度
            vy: 0,
            life: 240,      // 存在时间（约4秒后消失）
            damage: 15,
            owner: owner,
            type: 'assassin_skill2',
            color: '#8844cc',
            img: loadImage("assets/54.png"),
            reflected: false,
            piercing: true,     // 穿透标志
            hitTargets: [],     // 已命中的目标列表，防止重复伤害同一目标
        });

        // 粒子特效
        emitParticles(startX, startY + 15, 30, '#8844cc', 6, 8, 'star', 1.5);
        playSound('wave');
        return { success: true };
    }
}),
                // ---- 大招：天地灭尽 ----
                new Skill({
                    key: 'ult', name: '天地灭尽', cooldown: 0, energyCost: 100,
                    canUse: (owner) => !owner.ultActive && !owner.attacking && !owner.dashing && owner.energy >= 100,
                    execute: (owner) => {
                        owner.ultActive = true;
                        owner.ultTimer = 180; // 3秒
                        owner.ultDamageTimer = 0;
                        owner.timeStop = true;
                        owner.timeStopTimer = 180;
                        owner.state = 'ult';
                        // 时间停止：冻结所有角色
                        // 伤害由更新循环处理
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 120, '#8844cc', 14, 18, 'star', 3.0);
                        playSound('ult');
                        return { success: true };
                    }
                })
    ];
};

CHAR_CONFIGS.assassin.hooks = {
    // 刺客输入处理
    handleInput(player, world) {
        let moveX = 0;
        if(!player.skill2Active){
            if(keys.left) moveX=-1;
            if(keys.right) moveX=1;
            if(keys.up && player.grounded && !player.shieldActive){ player.vy=JUMP_SPEED; player.grounded=false; }
        }

        if(keys.attack && !player.attacking && player.attackCooldown <= 0 && !player.ultActive) {
            const skill = player.getSkill('attack');
            if (skill) { const result = skill.tryUse(player); if (result.success) keys.attack = false; }
        }
        if(keys.skill1 && !player.attacking && !player.ultActive && !player.dashing){
            const skill = player.getSkill('skill1');
            if (skill) { const res = skill.tryUse(player); if (res.success) keys.skill1 = false; }
        }
        if(keys.skill2 && !player.attacking && !player.ultActive && !player.dashing){
            const skill = player.getSkill('skill2');
            if (skill) { const res = skill.tryUse(player); if (res.success) keys.skill2 = false; }
        }
        if(keys.ult && !player.attacking && !player.ultActive && !player.dashing){
            const skill = player.getSkill('ult');
            if (skill) { const res = skill.tryUse(player); if (res.success) keys.ult = false; }
        }

        if (!player.hasStatus('frozen') && !player.dashing && !player.ultActive && !player.skill2Active) {
            if(player.state!=='crouch'){
                player.vx += moveX * 0.25;
                if(Math.abs(player.vx)>2.4) player.vx=2.4*Math.sign(player.vx);
            }
        } else if (player.skill2Active) {
            player.vx = 0;
        }
        if(player.grounded && moveX===0 && !player.attacking && !player.dashing && !player.ultActive) player.state='idle';
        else if(player.grounded && moveX!==0 && !player.attacking && !player.dashing && !player.ultActive) player.state='walk';
        if(player.attacking && player.attackTimer<=0){ player.attacking=false; player.state='idle'; }
    },
    // ---- 刺客逐帧特殊逻辑 ----
    onUpdate(world) {
        for (let f of world.entities) {
            if (f.charId !== 'assassin') continue;
            if (f.hp <= 0) continue;

            // 无敌计时
            if (f.isInvincible) {
                f.invincibleTimer--;
                if (f.invincibleTimer <= 0) f.isInvincible = false;

                // 完美闪避：无敌期间用「增大的受击体积」持续判定，
                // 即使冲刺位移穿过敌人攻击，也能触发闪避（每次一瞬只触发一次）
                if (!f.dodgeSuccess) {
                    const target = getOpponent(f);
                    const expand = 40; // 受击体积向四周扩大，降低完美闪避触发难度
                    const dodgeBox = {
                        x: f.x - expand, y: f.y - expand,
                        w: f.w + expand * 2, h: f.h + expand * 2
                    };
                    let dodged = false;
                    // 1) 敌人近战攻击框
                    if (target && target.attacking && target.hp > 0) {
                        if (rectCollide(dodgeBox, target.getAttackBox())) dodged = true;
                    }
                    // 2) 敌方飞行物（弓箭手箭矢、法师法术等）
                    if (!dodged) {
                        for (const p of world.projectiles) {
                            if (p.owner === f) continue; // 不闪自己的飞行物
                            if (rectCollide(dodgeBox, p)) { dodged = true; break; }
                        }
                    }
                    // 3) 敌方龙卷风 / 漩涡等范围危险物
                    if (!dodged && world.tornadoes) {
                        for (const t of world.tornadoes) {
                            if (t.owner === f) continue;
                            if (rectCollide(dodgeBox, t)) { dodged = true; break; }
                        }
                    }
                    if (!dodged && world.vortexes) {
                        for (const v of world.vortexes) {
                            if (v.owner === f) continue;
                            if (rectCollide(dodgeBox, v)) { dodged = true; break; }
                        }
                    }
                    if (dodged) triggerAssassinDodge(f);
                }
            }

            // 强化斩计时
            if (f.enhancedSlash) {
                f.enhancedSlashTimer--;
                if (f.enhancedSlashTimer <= 0) f.enhancedSlash = false;
            }

            // 斩击（次元斩）更新
            if (f.slashActive) {
                f.slashTimer--;
                if (f.slashTimer <= 0) {
                    f.slashActive = false;
                    f.attacking = false;
                    f.state = 'idle';
                } else if (!f.slashDamageDealt) {
                    const target = getOpponent(f);
                    if (target && target.hp > 0) {
                        const slashBox = { x: f.slashX, y: f.slashY, w: 90, h: 70 };
                        if (rectCollide(slashBox, target.getHitBox())) {
                            let dmg = f.enhancedSlash ? 8 : 5;
                            applyDamage(target, dmg, f);
                            if (f.enhancedSlash) { f.energy = Math.min(f.maxEnergy, f.energy + 5); }
                            f.slashDamageDealt = true;
                            emitSlash(target.x + target.w/2, target.y + target.h/2, f.slashFacing > 0 ? 0 : Math.PI, '#8844cc');
                        }
                    }
                }
            }

            // 裂空斩更新
            if (f.skill2Active) {
                f.skill2Timer--;
                if (f.skill2Timer <= 0) {
                    f.skill2Active = false;
                } else if (!f.skill2DamageDealt) {
                    const target = getOpponent(f);
                    if (target && target.hp > 0) {
                        const slashBox = { x: f.skill2X, y: f.skill2Y, w: 80, h: f.h + 20 };
                        if (rectCollide(slashBox, target.getHitBox())) {
                            applyDamage(getOpponent(f), 15, f);
                            f.skill2DamageDealt = true;
                            emitSlash(target.x + target.w/2, target.y + target.h/2, f.skill2Facing > 0 ? 0 : Math.PI, '#8844cc');
                        }
                    }
                }
            }

            // 大招（天地灭尽）更新
            if (f.ultActive) {
                f.ultTimer--;
                f.ultDamageTimer++;
                // 每 0.25 秒（15 帧）造成 2.5 点伤害
                if (f.ultDamageTimer >= 15) {
                    f.ultDamageTimer = 0;
                    const target = getOpponent(f);
                    if (target && target.hp > 0) {
                        applyDamage(getOpponent(f), 2.5, f);
                        emitParticles(target.x + target.w/2, target.y + target.h/2, 30, '#8844cc', 8, 10, 'star', 1.5);
                    }
                }
                if (f.ultTimer <= 0) {
                    f.ultActive = false;
                    f.timeStop = false;
                    f.timeStopTimer = 0;
                    f.state = 'idle';
                    emitParticles(f.x + f.w/2, f.y + f.h/2, 40, '#8844cc', 6, 8, 'star', 1.2);
                }
            }

            // 时间停止效果（全局）
            if (f.timeStop) {
                // 冻结所有行动，但允许特效继续
                // 在 update 中通过检查 timeStop 来跳过物理更新
            }

            // 暗影游走状态
            if (f.shadowStance) {
                f.shadowStanceTimer--;
                // 消耗暗影能量
                if (f.shadowStanceTimer % 8 === 0) {
                    f.shadowEnergy = Math.max(0, f.shadowEnergy - 0.1);
                }
                // 残影
                f.shadowTrail.push({ x: f.x, y: f.y, facing: f.facing, life: 20 });
                if (f.shadowTrail.length > f.maxShadowTrail) f.shadowTrail.shift();
                // 更新残影生命周期
                for (let i = f.shadowTrail.length - 1; i >= 0; i--) {
                    f.shadowTrail[i].life--;
                    if (f.shadowTrail[i].life <= 0) f.shadowTrail.splice(i, 1);
                }
                // 暴击逻辑：在伤害计算中处理
                if (f.shadowStanceTimer <= 0 || f.shadowEnergy <= 0) {
                    f.shadowStance = false;
                    f.shadowEnergy = 0;
                    f.shadowTrail = [];
                    emitParticles(f.x + f.w/2, f.y + f.h/2, 30, '#8844cc', 4, 6, 'star', 0.8);
                }
            } else {
                // 非暗影游走状态下，缓慢清除残影
                if (f.shadowTrail.length > 0) {
                    for (let i = f.shadowTrail.length - 1; i >= 0; i--) {
                        f.shadowTrail[i].life--;
                        if (f.shadowTrail[i].life <= 0) f.shadowTrail.splice(i, 1);
                    }
                }
            }

            // 暗影能量自然恢复（闪避已恢复）
            // 不自动恢复，只通过闪避获得
        }
    },

    // ---- 刺客绘制钩子（残影、斩击、大招刀光） ----
    onFighterDraw(ctx, fighter, world) {
        if (fighter.charId !== 'assassin') return;
        const { x, y, w, h, facing } = fighter;
        const px = x - world.camera.x;
        const config = CHAR_CONFIGS[fighter.charId];
        const imgs = config.images;
        let img = imgs[ANIM_DEFAULT_KEY];
        for (let s of ANIM_STATES) { if (s.condition(fighter)) { img = imgs[s.key]; break; } }
        // 次元斩时使用 skill2 贴图
        if (fighter.attacking || fighter.slashActive) {
            if (imgs.skill2) img = imgs.skill2;
        }

        // ---- 残影绘制 ----
        if (fighter.shadowTrail && fighter.shadowTrail.length > 0) {
            for (let trail of fighter.shadowTrail) {
                const alpha = trail.life / 20 * 0.35;
                const px2 = trail.x - world.camera.x;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(px2 + w/2, trail.y + h/2);
                ctx.scale(trail.facing || fighter.facing, 1);
                if (img && img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, -w/2, -h/2, w, h);
                }
                ctx.restore();
            }
        }

        // ---- 斩击绘制 ----
        // 次元斩
        if (fighter.slashActive) {
            const sx = fighter.slashX - world.camera.x;
            const slashImg = loadImage("assets/53.png"); // 原url: https://i.ibb.co/JFFYY90D/53.png
            ctx.save();
            ctx.globalAlpha = 0.9;
            if (slashImg && slashImg.complete && slashImg.naturalWidth > 0) {
                ctx.translate(sx + 30, fighter.slashY + 25);
                ctx.scale(fighter.slashFacing, 1);
                ctx.drawImage(slashImg, -45, -35, 90, 70);
            } else {
                ctx.fillStyle = '#8844cc';
                ctx.shadowColor = '#8844cc';
                ctx.shadowBlur = 30;
                ctx.fillRect(sx, fighter.slashY, 90, 70);
            }
            ctx.restore();
        }
        // 裂空斩
        if (fighter.skill2Active) {
            const sx2 = fighter.skill2X - world.camera.x;
            const skill2Img = loadImage("assets/54.png"); // 原url: https://i.ibb.co/cKjCzDr4/54.png
            ctx.save();
            ctx.globalAlpha = 0.9;
            if (skill2Img && skill2Img.complete && skill2Img.naturalWidth > 0) {
                ctx.translate(sx2 + 40, fighter.skill2Y + 30);
                ctx.scale(fighter.skill2Facing, 1);
                ctx.drawImage(skill2Img, -40, -30, 80, 60);
            } else {
                ctx.fillStyle = '#6633aa';
                ctx.shadowColor = '#6633aa';
                ctx.shadowBlur = 40;
                ctx.fillRect(sx2, fighter.skill2Y, 80, 60);
            }
            ctx.restore();
        }
        // 大招刀光
        if (fighter.ultActive) {
            const ux = fighter.x - world.camera.x - 80;
            const uy = fighter.y - 20;
            ctx.save();
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(frame * 0.1);
            ctx.fillStyle = '#6633aa';
            ctx.shadowColor = '#8844cc';
            ctx.shadowBlur = 60;
            // 大面积刀光
            const grad = ctx.createRadialGradient(ux + 120, uy + 40, 20, ux + 120, uy + 40, 140);
            grad.addColorStop(0, 'rgba(136,68,204,0.8)');
            grad.addColorStop(0.5, 'rgba(102,51,170,0.5)');
            grad.addColorStop(1, 'rgba(68,34,136,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(ux, uy, 240, 100);
            // 多道刀光
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2 + frame * 0.02;
                const dist = 60 + 30 * Math.sin(frame * 0.05 + i);
                const lx = ux + 120 + Math.cos(angle) * dist;
                const ly = uy + 40 + Math.sin(angle) * dist * 0.3;
                ctx.fillStyle = `rgba(200,160,255,${0.2 + 0.15 * Math.sin(frame * 0.1 + i)})`;
                ctx.beginPath();
                ctx.arc(lx, ly, 30 + 10 * Math.sin(frame * 0.08 + i), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    },

    // ---- 突进接触钩子：刺客的一瞬不造成伤害、也不击飞 ----
    onDashContact(f, target) {
        if (f.charId !== 'assassin') return false;
        // 返回 true 表示已处理，跳过默认突进伤害
        return true;
    },

    // ---- 伤害结算钩子：暗影游走状态下有 50% 暴击 ----
    onDamageDealt(attacker, target, baseDmg) {
        if (attacker && attacker.charId === 'assassin' && attacker.shadowStance) {
            if (Math.random() < 0.5) {
                return { isCritical: true };
            }
        }
        return null;
    },

    // ---- 全屏叠加绘制钩子：刺客大招「天地灭尽」全屏动画 ----
    onOverlayDraw(ctx, world) {
        // 依据双方 ultActive 判断（PvP 中已同步），host/guest 都能各自本地播放
        const assassinUlting = (player.charId === 'assassin' && player.ultActive)
                            || (enemy.charId === 'assassin' && enemy.ultActive);
        if (!assassinUlting) {
            if (assassinUltAnim.playing) assassinUltAnim.stop();
            return;
        }
        assassinUltAnim.play();
        const frameImg = assassinUltAnim.currentFrame();
        if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.drawImage(frameImg, 0, 0, W, H);
            ctx.restore();
        }
    },

    // ---- HUD 钩子：暗影能量条（刺客专用） ----
    onHUD(player) {
        let shadowContainer = document.getElementById('shadow-energy-container');
        if (player.charId !== 'assassin') {
            const container = document.getElementById('shadow-energy-container');
            if (container) container.style.display = 'none';
            return;
        }
        if (!shadowContainer) {
            const energyBarContainer = document.getElementById('energy-bar');
            const container = document.createElement('div');
            container.id = 'shadow-energy-container';
            container.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:8px; color:#8844cc; text-shadow:1px 1px 0 #000; margin-top:2px;';
            const gridContainer = document.createElement('div');
            gridContainer.id = 'shadow-grid';
            gridContainer.style.cssText = 'flex:1; display:flex; gap:2px; height:6px; background:transparent;';
            for (let i = 0; i < 5; i++) {
                const cell = document.createElement('div');
                cell.className = 'shadow-cell';
                cell.style.cssText = 'flex:1; background:#222; border:1px solid #6633aa; border-radius:2px; transition:background 0.1s;';
                gridContainer.appendChild(cell);
            }
            container.innerHTML = `<span style="color:#8844cc;">🌑</span>`;
            container.appendChild(gridContainer);
            const textSpan = document.createElement('span');
            textSpan.id = 'shadow-energy-text';
            textSpan.style.cssText = 'color:#8844cc; font-size:7px; min-width:20px; text-align:right;';
            textSpan.textContent = '0/5';
            container.appendChild(textSpan);
            energyBarContainer.parentNode.insertBefore(container, energyBarContainer.nextSibling);
            shadowContainer = container;
        }
        const se = player.shadowEnergy || 0;
        const seMax = player.shadowEnergyMax || 5;
        const filled = Math.min(Math.round(se), seMax);
        const cells = document.querySelectorAll('.shadow-cell');
        cells.forEach((cell, idx) => {
            if (idx < filled) {
                cell.style.background = 'linear-gradient(90deg,#6633aa,#aa66ff)';
                cell.style.borderColor = '#aa66ff';
                cell.style.boxShadow = '0 0 4px #8844cc';
            } else {
                cell.style.background = '#222';
                cell.style.borderColor = '#6633aa';
                cell.style.boxShadow = 'none';
            }
        });
        const text = document.getElementById('shadow-energy-text');
        if (text) text.textContent = filled + '/' + seMax;
        if (shadowContainer) {
            if (player.shadowStance) {
                shadowContainer.style.border = '1px solid #aa66ff';
                shadowContainer.style.boxShadow = '0 0 12px rgba(136,68,204,0.4)';
            } else {
                shadowContainer.style.border = 'none';
                shadowContainer.style.boxShadow = 'none';
            }
        }
    },

    // ---- 资源初始化钩子：刺客大招「天地灭尽」全屏动画（14 帧） ----
    initResources() {
        // 刺客大招「天地灭尽」全屏动画：assassin_u/0.jpg ~ 13.jpg，共 14 帧
        // 大招持续 3 秒(3000ms)，14 帧均分 → 每帧约 214ms
        for (let i = 0; i < 14; i++) assassinUltFrames.push(loadImage('assets/assassin_u/' + i + '.jpg'));
    }
};
