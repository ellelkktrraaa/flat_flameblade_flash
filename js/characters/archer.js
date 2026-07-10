// ===== 弓箭手 (archer) =====

CHAR_CONFIGS.archer = {
            id: 'archer', name: '弓箭手', hp: 80, maxEnergy: 100, energyRegen: 0.07,
            speed: 2.0, jumpPower: -10, attackRange: 0, attackDamage: 0,
            attackCooldown: 0, attackDelay: 0, attackDuration: 0,
            images: { idle: loadImage("assets/13-20260703003612.png"), walk: loadImage("assets/13-20260703003612.png"), jump: loadImage("assets/14-20260703142221.png"), attack: loadImage("assets/15-20260703142258.png"), ult: loadImage("assets/15-20260703142258.png") },
            arrows: 10, maxArrows: 10, arrowRegenRate: 480, canSkill2InAir: true,
    dex: {
        icon: '🏹',
        intro: '箭羽无声，掠影无形。他的箭从不落空，就像风从不问方向——在你进入射程的那一刻，终点已被标记。距离是他的盟友，而你，只是靶心上的一个点。\n"跑吧，我喜欢猎物挣扎的样子。"',
        stats: [{ label: '生命', value: '80' }, { label: '能量上限', value: '100' }],
        skills: [
            { name: '射箭（普通攻击）', desc: '长按蓄力，松开发射。蓄力时间影响伤害和能量消耗：0~1 秒：5 伤害 / 5 能量；1~2 秒：8 伤害 / 10 能量；2 秒以上：12 伤害 / 15 能量。可移动和跳跃。', meta: '消耗：5~15 能量 ｜ 冷却：无' },
            { name: '火矢（技能一）', desc: '为射箭附加火焰效果，持续 7 秒。箭矢消失后产生一团火焰，对手站在火焰上每 0.5 秒受到 2 点伤害。', meta: '消耗：20 能量 ｜ 冷却：15 秒' },
            { name: '追踪（技能二）', desc: '射出的箭矢具有轻微追踪效果，持续 10 秒。', meta: '消耗：20 能量 ｜ 冷却：15 秒' },
            { name: '箭雨（大招）', desc: '从天上降下 20 支箭矢落在自身附近，每支造成 5 点伤害（受火矢加成，附带火焰效果）。', meta: '消耗：100 能量 ｜ 冷却：8 秒' }
        ]
    },
    fields: {
        arrows: 10, maxArrows: 10, arrowRegenTimer: 0, arrowRegenRate: 480,
        fireArrowBuff: false, fireArrowTimer: 0,
        trackingBuff: false, trackingTimer: 0,
        chargingAttack: false, chargeStartTime: 0,
    },
    worldArrays: [],
        }

CHAR_SKILL_FACTORIES.archer = function create_archer_skills() {
    return [
                // ===== 修改点4：弓箭手技能1 持续时间 300→420（+2秒） =====
                new Skill({
                    key: 'skill1', name: '火矢', cooldown: 900, energyCost: 20,
                    canUse: (owner) => !owner.fireArrowBuff,
                    execute: (owner) => {
                        owner.fireArrowBuff = true;
                        owner.fireArrowTimer = 420; // 原300，增加2秒
                        emitParticles(owner.x+owner.w/2, owner.y+owner.h/2, 30, '#ff4400', 4, 6, 'star', 1);
                        playSound('wave');
                        return { success: true };
                    }
                }),
                // ===== 修改点5：弓箭手技能2 持续时间 480→600（+2秒） =====
                new Skill({
                    key: 'skill2', name: '追踪', cooldown: 900, energyCost: 20,
                    canUse: (owner) => !owner.trackingBuff,
                    execute: (owner) => {
                        owner.trackingBuff = true;
                        owner.trackingTimer = 600; // 原480，增加2秒
                        emitParticles(owner.x+owner.w/2, owner.y+owner.h/2, 30, '#44ddff', 4, 6, 'star', 1);
                        playSound('wave');
                        return { success: true };
                    }
                }),
                new Skill({
                    key: 'ult', name: '箭雨', cooldown: 480, energyCost: 100,
                    canUse: (owner) => owner.energy >= 100,
                    execute: (owner) => {
                        const count = 20;
                        const centerX = owner.x + owner.w/2;
                        const centerY = owner.y + 20;
                        const spreadX = 150;
                        for (let i=0; i<count; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const dist = Math.random() * spreadX;
                            const targetX = centerX + Math.cos(angle) * dist;
                            const targetY = centerY - 50 - Math.random() * 100;
                            let img = loadImage("assets/IMG-20260703-143031.png");
                            let isFire = owner.fireArrowBuff;
                            if (isFire) img = loadImage("assets/IMG-20260703-143038.png");
                            world.projectiles.push({
                                x: targetX - 16, y: -30 - Math.random()*50,
                                w: 32, h: 20,
                                vx: (Math.random() - 0.5) * 0.5,
                                vy: 3 + Math.random() * 2,
                                life: 120,
                                damage: 5,
                                owner: owner,
                                type: 'arrow_ult',
                                color: isFire ? '#ff8800' : '#cccccc',
                                reflected: false,
                                img: img,
                                isFire: isFire,
                                fromUlt: true
                            });
                        }
                        playSound('ult');
                        return { success: true };
                    }
                })
    ];
};

CHAR_CONFIGS.archer.hooks = {
    // 弓箭手输入处理（能量不足取消蓄力时返回 false 以跳过本帧后续逻辑）
    handleInput(player, world) {
        let moveX=0;
        if(keys.left) moveX=-1;
        if(keys.right) moveX=1;
        if(keys.up && player.grounded && !player.shieldActive){ player.vy=JUMP_SPEED; player.grounded=false; }

        if(keys.attack && !player.shieldActive && player.arrows > 0 && !player.chargingAttack) {
            player.chargingAttack = true;
            player.chargeStartTime = Date.now();
            player.attacking = true;
            player.state = 'attack';
        }
        if(!keys.attack && player.chargingAttack) {
            const chargeTime = (Date.now() - player.chargeStartTime) / 1000;
            let damage, cost;
            if (chargeTime < 1) { damage = 5; cost = 5; }
            else if (chargeTime < 2) { damage = 8; cost = 10; }
            else { damage = 12; cost = 15; }
            if (player.energy < cost) {
                player.chargingAttack = false;
                player.attacking = false;
                player.state = 'idle';
                emitParticles(player.x+player.w/2, player.y+player.h/2, 10, '#ff0000', 2, 4, 'circle', 0.5);
                return false;
            }
            player.energy -= cost;
            player.arrows--;
            const dir = player.facing;
            const px = player.x + (dir === 1 ? player.w : 0);
            const py = player.y + 30;
            let speed = 4 + chargeTime * 2;
            speed = Math.min(speed, 10);
            let arrowImg = IMG.projectile_arrow;
            let isFire = player.fireArrowBuff;
            if (isFire) arrowImg = IMG.projectile_arrow_fire;
            world.projectiles.push({
                x: px - 16, y: py - 10, w: 32, h: 20,
                vx: speed * dir, vy: 0,
                life: 120,
                damage: damage,
                owner: player,
                type: 'arrow',
                color: isFire ? '#ff8800' : '#aaaaaa',
                reflected: false,
                img: arrowImg,
                isFire: isFire,
                tracking: player.trackingBuff,
                trackingTarget: enemy
            });
            playSound('arrow');
            player.chargingAttack = false;
            player.attacking = false;
            player.state = 'idle';
        }

        if(keys.skill1 && !player.shieldActive && !player.chargingAttack){
            const skill = player.getSkill('skill1');
            if (skill) { const res = skill.tryUse(player); if (res.success) keys.skill1 = false; }
        }
        if(keys.skill2 && !player.shieldActive && !player.chargingAttack){
            const skill = player.getSkill('skill2');
            if (skill) { const res = skill.tryUse(player); if (res.success) keys.skill2 = false; }
        }
        if(keys.ult && !player.shieldActive && !player.chargingAttack){
            const skill = player.getSkill('ult');
            if (skill) { const res = skill.tryUse(player); if (res.success) keys.ult = false; }
        }

        let speedFactor = player.chargingAttack ? 1.25 : 2.25;
        if (!player.shieldActive && !player.hasStatus('frozen') && !player.dashing) {
            if(player.state!=='crouch'){
                player.vx += moveX * speedFactor;
                let maxSpeed = player.chargingAttack ? 1.25 : 2.25;
                if(Math.abs(player.vx)>maxSpeed) player.vx = maxSpeed * Math.sign(player.vx);
            }
        }
        if(player.grounded && moveX===0 && !player.attacking && !player.dashing) player.state='idle';
        else if(player.grounded && moveX!==0 && !player.attacking && !player.dashing) player.state='walk';
        if(player.attacking && player.attackTimer<=0 && !player.chargingAttack){ player.attacking=false; player.state='idle'; }
    },
    // 弓箭手每帧更新：箭矢再生、火矢/追踪 buff 计时
    onFighterUpdate(owner) {
        if (owner.charId !== 'archer') return;
        if (owner.arrows < owner.maxArrows) {
            owner.arrowRegenTimer++;
            if (owner.arrowRegenTimer >= owner.arrowRegenRate) {
                owner.arrows++;
                owner.arrowRegenTimer = 0;
            }
        }
        if (owner.fireArrowBuff) {
            owner.fireArrowTimer--;
            if (owner.fireArrowTimer <= 0) owner.fireArrowBuff = false;
        }
        if (owner.trackingBuff) {
            owner.trackingTimer--;
            if (owner.trackingTimer <= 0) owner.trackingBuff = false;
        }
    },
    // 弓箭手绘制：主体绘制前的光晕（预绘制），主体绘制后的蓄力条（后绘制）
    onFighterDraw(ctx, fighter, world) {
        if (fighter.charId !== 'archer') return;
        // 预绘制：buff 光晕
        if (fighter.fireArrowBuff) {
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 40;
        } else if (fighter.trackingBuff) {
            ctx.shadowColor = '#44ddff';
            ctx.shadowBlur = 40;
        }
        // 后绘制：蓄力条
        if (fighter.chargingAttack) {
            const px = fighter.x - world.camera.x;
            const chargeTime = (Date.now() - fighter.chargeStartTime) / 1000;
            const maxWidth = 40;
            const progress = Math.min(chargeTime / 2, 1);
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(px + fighter.w/2 - maxWidth/2 - 2, fighter.y - 20, maxWidth + 4, 10);
            ctx.fillStyle = '#ffaa44';
            ctx.fillRect(px + fighter.w/2 - maxWidth/2, fighter.y - 18, maxWidth * progress, 6);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + fighter.w/2 - maxWidth/2, fighter.y - 18, maxWidth, 6);
            ctx.restore();
        }
    },
    // HUD 中显示箭矢数量
    onHUD(player) {
        if (player.charId !== 'archer') return;
        arrowText.textContent = player.arrows + '/' + player.maxArrows;
    },
    // 火焰箭命中时生成火焰区域（不拦截默认伤害流程）
    onProjectileHit(world, p, target) {
        if (p.type === 'arrow' && p.isFire) {
            world.flameZones.push({
                x: p.x - 20, y: GROUND_Y - 20, w: 120, h: 60,
                life: 240, timer: 0,
                damage: 2, owner: p.owner, tickInterval: 60
            });
            return false; // 不跳过默认伤害，保留箭矢直接伤害
        }
    },
    // 拾取冷却道具时补充箭矢
    onPickup(owner, pickupType) {
        if (owner.charId !== 'archer') return;
        if (pickupType === 'cooldown') {
            owner.arrows = Math.min(owner.maxArrows, owner.arrows + 3);
            updateHUD();
        }
    },
    // 弓箭手可以在空中使用技能2
    canUseSkill2InAir(fighter) {
        return true;
    }
};
