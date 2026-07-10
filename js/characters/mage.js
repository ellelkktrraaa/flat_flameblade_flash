// ===== 法师 (mage) =====

CHAR_CONFIGS.mage = {
            id: 'mage', name: '法师', hp: 70, maxEnergy: 120, energyRegen: 0.07,
            speed: 1.9, jumpPower: -9, attackRange: 30, attackDamage: 0,
            attackCooldown: 120, attackDelay: 0, attackDuration: 120,
            images: { idle: loadImage("assets/5-20260702144646.png"), walk: loadImage("assets/5-20260702144646.png"), jump: loadImage("assets/7-20260702145928.png"), attack: loadImage("assets/12-20260702212001.png"), ult: loadImage("assets/11-20260702203319.png") },
    dex: {
        icon: '🔮',
        intro: '指尖勾动元素洪流，咒语编织法则牢笼。他的目光穿透虚妄，每一道法术都是精心计算的毁灭——火焰跳舞，冰霜筑墙，雷电为鞭。在知识面前，蛮力不过是未开化的低语。\n"要我教你，什么叫真正的秩序吗？"',
        stats: [{ label: '生命', value: '70' }, { label: '能量上限', value: '120' }],
        skills: [
            { name: '火球（普通攻击）', desc: '向前方发射一枚火球，造成 3 点伤害，命中后附加灼烧效果（持续 3 秒，每秒 0.5 点伤害）。', meta: '消耗：10 能量 ｜ 冷却：2 秒' },
            { name: '冰晶（技能一）', desc: '向前方发射冰晶，造成 7 点直接伤害，并附加减速效果（持续 3 秒，移动速度降低 20%）。', meta: '消耗：15 能量 ｜ 冷却：12 秒' },
            { name: '护罩（技能二）', desc: '生成一个持续 2 秒的护盾，期间免疫所有伤害，并回复所受伤害量 50% 的生命值。', meta: '消耗：20 能量 ｜ 冷却：15 秒' },
            { name: '光波蓄力（大招）', desc: '长按大招键蓄力，松开后发射光波。蓄力时间越长，伤害和能量消耗越高：蓄力 1 秒内：伤害 20，消耗 40；1~3 秒：伤害 40，消耗 80；超过 3 秒：伤害 60，消耗 120。', meta: '消耗：40~120 能量 ｜ 冷却：8 秒' }
        ]
    },
    fields: {},
    worldArrays: [],
        }

CHAR_SKILL_FACTORIES.mage = function create_mage_skills() {
    return [
                new Skill({
                    key: 'skill1', name: '冰晶', cooldown: 720, energyCost: 15,
                    execute: (owner) => {
                        const dir = owner.facing;
                        const px = owner.x + (dir === 1 ? owner.w : 0);
                        const py = owner.y + 30;
                        world.projectiles.push({
                            x: px - 16, y: py - 12, w: 32, h: 24,
                            vx: 4 * dir, vy: 0, life: 150, damage: 7,
                            owner: owner, type: 'mage_ice', color: '#66ccff',
                            reflected: false, img: loadImage("assets/9-20260702202554.png"), slow: true
                        });
                        emitParticles(px, py, 25, '#66ccff', 4, 6, 'star', 0.8);
                        playSound('wave');
                        return { success: true };
                    }
                }),
                new Skill({
                    key: 'skill2', name: '护罩', cooldown: 900, energyCost: 20,
                    canUse: (owner) => !owner.shieldActive,
                    execute: (owner) => {
                        owner.shieldActive = true; owner.shieldTimer = 120;
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 40, '#88ddff', 6, 8, 'circle', 1.2);
                        playSound('parry');
                        return { success: true };
                    }
                }),
                new Skill({
                    key: 'ult', name: '光波蓄力', cooldown: 480, energyCost: 0,
                    execute: () => ({ success: false })
                })
    ];
};

CHAR_CONFIGS.mage.hooks = {
    // 法师输入处理（大招蓄力，能量不足松开时返回 false 以跳过本帧后续逻辑）
    handleInput(player, world) {
        let moveX = 0;
        if (!player.charging) {
            if(keys.left) moveX=-1;
            if(keys.right) moveX=1;
            if(keys.up && player.grounded && !player.shieldActive){ player.vy=JUMP_SPEED; player.grounded=false; }

            if(keys.attack && !player.shieldActive){
                if (player.attackCooldown <= 0 && !player.attacking) {
                    const cfg = CHAR_CONFIGS.mage;
                    if (player.energy < 10) { keys.attack = false; }
                    else {
                        player.energy -= 10;
                        player.attacking = true;
                        player.attackTimer = cfg.attackDuration;
                        player.attackDelay = cfg.attackDelay;
                        player.attackHitDealt = true;
                        player.attackCooldown = cfg.attackCooldown;
                        player.state = 'attack';
                        const dir = player.facing;
                        const px = player.x + (dir === 1 ? player.w : 0);
                        const py = player.y + 30;
                        world.projectiles.push({
                            x: px - 16, y: py - 12, w: 32, h: 24,
                            vx: 3 * dir, vy: 0, life: 120, damage: 3,
                            owner: player, type: 'mage_fire', color: '#ff6600',
                            reflected: false, img: IMG.projectile_fire, burn: true
                        });
                        emitParticles(px, py, 20, '#ff6600', 4, 5, 'circle', 0.6);
                        playSound('wave');
                        keys.attack = false;
                    }
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

        const ult = player.getSkill('ult');
        if (keys.ult && !player.shieldActive && !player.charging && (!ult || ult.cd <= 0)) {
            if (player.energy >= 40) {
                player.charging = true;
                player.chargeStart = Date.now();
                emitParticles(player.x + player.w/2, player.y + player.h/2, 10, '#ffdd44', 2, 4, 'star', 0.5);
            } else {
                keys.ult = false;
            }
        }
        if (!keys.ult && player.charging) {
            const chargeTime = (Date.now() - player.chargeStart) / 1000;
            let damage = 20, cost = 40;
            if (chargeTime > 3) { damage = 60; cost = 120; }
            else if (chargeTime > 1) { damage = 40; cost = 80; }
            if (player.energy < cost) {
                player.charging = false;
                emitParticles(player.x + player.w/2, player.y + player.h/2, 15, '#ff0000', 3, 5, 'circle', 0.6);
                return false;
            }
            player.energy -= cost;
            const dir = player.facing;
            const px = player.x + (dir === 1 ? player.w : 0);
            const py = player.y + 30;
            world.projectiles.push({
                x: px - 20, y: py - 15, w: 40, h: 30,
                vx: 4 * dir, vy: 0,
                life: 200,
                damage: damage,
                owner: player,
                type: 'mage_light',
                color: '#ffff44',
                reflected: false,
                img: IMG.projectile_light
            });
            emitParticles(px, py, 40, '#ffff44', 8, 10, 'star', 1.5);
            playSound('ult');
            player.charging = false;
            if (ult) ult.cd = ult.cooldown;
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
