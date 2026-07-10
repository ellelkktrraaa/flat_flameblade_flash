// ===== 骑士 (knight) =====

CHAR_CONFIGS.knight = {
            id: 'knight', name: '骑士', hp: 100, maxEnergy: 100, energyRegen: 0.05,
            speed: 2.25, jumpPower: -10, attackRange: 44, attackDamage: 5,
            attackCooldown: 60, attackDelay: 8, attackDuration: 68,
            images: { idle: loadImage("assets/IMG-20260702-005046.png"), walk: loadImage("assets/IMG-20260702-005046.png"), jump: loadImage("assets/IMG-20260702-005057.png"), attack: loadImage("assets/IMG-20260702-010935.png"), ult: loadImage("assets/IMG-20260702-005138.png") },
    dex: {
        icon: '⚔️',
        intro: '剑锋划破硝烟，盾面刻满战痕。他从不闪避，因为身后即是王座——凡人之躯，亦可铸就城墙。冲锋的号角撕裂长夜，铁蹄踏碎一切犹豫。\n"难道你只有这点觉悟吗？"',
        stats: [{ label: '生命', value: '100' }, { label: '能量上限', value: '100' }],
        skills: [
            { name: '挥砍（普通攻击）', desc: '对近身敌人造成 5 点伤害。', meta: '消耗：无 ｜ 冷却：1 秒' },
            { name: '剑气（技能一）', desc: '向前方发射一道飞行剑气，造成 10 点伤害。', meta: '消耗：20 能量 ｜ 冷却：8 秒' },
            { name: '招架（技能二）', desc: '进入格挡姿态，持续 0.8 秒，期间可反弹敌方飞行道具，成功反弹后恢复 20 点能量。', meta: '消耗：30 能量 ｜ 冷却：10 秒' },
            { name: '爆发斩（大招）', desc: '消耗全部能量，对近距离敌人（半径约 128 像素）造成 40 点伤害并击飞；对远处敌人则发射大型剑气，造成 25 点伤害。', meta: '消耗：100 能量 ｜ 冷却：5 秒' }
        ]
    },
    fields: {},
    worldArrays: [],
        }

CHAR_SKILL_FACTORIES.knight = function create_knight_skills() {
    return [
                new Skill({
                    key: 'skill1', name: '剑气', cooldown: 480, energyCost: 20,
                    execute: (owner) => {
                        const dir = owner.facing;
                        const px = owner.x + (dir === 1 ? owner.w : 0);
                        const py = owner.y + 30;
                        world.projectiles.push({
                            x: px - 16, y: py - 10, w: 32, h: 20,
                            vx: 5 * dir, vy: 0, life: 90, damage: 10,
                            owner: owner, type: 'knight_sword', color: '#88ddff',
                            reflected: false, img: loadImage("assets/IMG-20260702-011106.png")
                        });
                        emitParticles(px, py, 30, '#88ddff', 5, 6, 'circle', 0.7);
                        playSound('wave');
                        return { success: true };
                    }
                }),
                new Skill({
                    key: 'skill2', name: '招架', cooldown: 600, energyCost: 30,
                    canUse: (owner) => owner.grounded,
                    execute: (owner) => {
                        owner.blocking = true; owner.blockTimer = 48;
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 25, '#ffdd44', 4, 6, 'star', 0.9);
                        playSound('parry');
                        return { success: true };
                    }
                }),
                new Skill({
                    key: 'ult', name: '爆发斩', cooldown: 300, energyCost: 100,
                    execute: (owner) => {
                        hitStop = 20;
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 100, '#ffaa00', 12, 14, 'star', 2.0);
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 60, '#ffdd00', 8, 10, 'circle', 1.5);
                        const radius = 128;
                        const target = getOpponent(owner);
                        const dist = Math.hypot(owner.x + owner.w/2 - target.x - target.w/2, owner.y + owner.h/2 - target.y - target.h/2);
                        if (dist < radius) {
                            applyDamage(target, 40, owner);
                            target.vy = -10; target.vx = owner.facing * 8;
                        } else {
                            world.projectiles.push({
                                x: owner.x + (owner.facing > 0 ? owner.w : -80), y: owner.y - 10,
                                w: 70, h: 70, vx: 10 * owner.facing, vy: 0, life: 35, damage: 25,
                                owner: owner, type: 'knight_ult', color: '#ffdd44',
                                reflected: false, img: loadImage("assets/IMG-20260702-005138.png")
                            });
                        }
                        document.getElementById('gameWrapper').style.animation = 'shake 0.4s';
                        setTimeout(() => document.getElementById('gameWrapper').style.animation = '', 400);
                        playSound('ult');
                        return { success: true };
                    }
                }),
    ];
};

CHAR_CONFIGS.knight.hooks = {
    // 骑士输入处理（通用近战流程）
    handleInput(player, world) {
        const charId = player.charId;
        let moveX = 0;
        if (!player.charging) {
            if(keys.left) moveX=-1;
            if(keys.right) moveX=1;
            if(keys.up && player.grounded && !player.shieldActive){ player.vy=JUMP_SPEED; player.grounded=false; }

            if(keys.attack && !player.shieldActive){
                if (player.attackCooldown <= 0 && !player.attacking) {
                    const cfg = CHAR_CONFIGS[charId];
                    player.attacking = true;
                    player.attackTimer = cfg.attackDuration;
                    player.attackDelay = cfg.attackDelay;
                    player.attackHitDealt = false;
                    player.attackCooldown = cfg.attackCooldown;
                    player.state = 'attack';
                    playSound('swing');
                    keys.attack = false;
                }
            }
            if(keys.skill1 && !player.shieldActive){
                const skill = player.getSkill('skill1');
                if (skill) { const res = skill.tryUse(player); if (res.success) keys.skill1 = false; }
            }
            if(keys.skill2 && !player.shieldActive){
                const skill = player.getSkill('skill2');
                if (skill) { const res = skill.tryUse(player); if (res.success) keys.skill2 = false; }
            }
        }

        if(keys.ult && !player.shieldActive){
            const ult = player.getSkill('ult');
            if (ult) { const res = ult.tryUse(player); if (res.success) keys.ult = false; }
        }

        if (!player.charging && !player.shieldActive && !player.hasStatus('frozen') && !player.dashing) {
            if(player.state!=='crouch'){
                player.vx += moveX * 0.25;
                if(Math.abs(player.vx)>2.25) player.vx=2.25*Math.sign(player.vx);
            }
        }
        if(player.grounded && moveX===0 && !player.attacking && !player.dashing) player.state='idle';
        else if(player.grounded && moveX!==0 && !player.attacking && !player.dashing) player.state='walk';
        if(player.attacking && player.attackTimer<=0){ player.attacking=false; player.state='idle'; }
    }
};
