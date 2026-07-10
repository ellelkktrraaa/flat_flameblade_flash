// ===== 圣骑士 (paladin) =====

CHAR_CONFIGS.paladin = {
            id: 'paladin', name: '圣骑士', hp: 120, maxEnergy: 100, energyRegen: 0,
            speed: 2.1, jumpPower: -10, attackRange: 44, attackDamage: 5,
            attackCooldown: 60, attackDelay: 8, attackDuration: 68,
            images: { idle: loadImage("assets/IMG-20260704-155855.png"), walk: loadImage("assets/IMG-20260704-155904.png"), jump: loadImage("assets/IMG-20260704-155900.png"), attack: loadImage("assets/IMG-20260704-155909.png"), charge: loadImage("assets/IMG-20260704-155913.png"), ult: loadImage("assets/IMG-20260704-155909.png") },
            isPaladin: true, canSkill2InAir: true, ultEnergyNeed: 'maxEnergy',
    resourceLabel: '圣光',
    dex: {
        icon: '🛡️',
        intro: '圣光铸就血肉，信仰化作城墙。每一道伤痕都是新的冠冕，每一次冲击都被转化为前行的力量——他站在这里，不是为了进攻，而是为了证明，什么是无法逾越的。敌人的猛攻，不过是为他加冕的礼炮。\n"你的攻击不错，但我的信仰，比你的刀刃更坚硬。"',
        stats: [{ label: '生命', value: '120' }, { label: '圣光值（能量）', value: '100' }],
        skills: [
            { name: '劈砍（普通攻击）', desc: '向前劈砍，造成 5 点伤害。', meta: '消耗：无 ｜ 冷却：1 秒' },
            { name: '正义冲锋（技能一）', desc: '长按蓄力，松开发动冲锋撞击敌人，蓄力越久冲刺越远（最大约 400 像素），造成 15 点伤害。冷却在蓄力结束后开始计算。', meta: '消耗：无 ｜ 冷却：10 秒' },
            { name: '神圣壁垒（技能二）', desc: '生成持续 4 秒的无敌护盾，吸收所有伤害并以 1:3 比例转化为圣光值（能量）。期间可移动、跳跃、攻击。', meta: '消耗：无 ｜ 冷却：12 秒' },
            { name: '圣佑（大招）', desc: '需满圣光值释放。进入强化状态，伤害 +5，受伤减半，免疫击飞，持续消耗圣光值（15 点 / 秒）。', meta: '消耗：15 圣光 / 秒 ｜ 冷却：无' }
        ]
    },
    fields: {
        divineShieldActive: false, divineShieldTimer: 0, divineShieldAbsorb: 0,
        holyEmpowerActive: false, holyEmpowerTimer: 0,
        chargingSkill1: false, skill1ChargeTime: 0,
    },
    worldArrays: [],
        }

CHAR_SKILL_FACTORIES.paladin = function create_paladin_skills() {
    return [
                // ===== 修改点1：圣骑士技能1 冷却 480→720（12秒），蓄力结束后才开始冷却 =====
                new Skill({
                    key: 'skill1', name: '正义冲锋', cooldown: 600, energyCost: 0, // 原480 → 720
                    canUse: (owner) => owner.grounded && !owner.chargingSkill1 && !owner.dashing,
                    execute: (owner) => {
                        owner.chargingSkill1 = true;
                        owner.chargeStartTime = Date.now();
                        owner.state = 'idle';
                        // 重置冷却，由 releasePaladinCharge 控制
                        this.cd = 0;
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 16, '#ffd700', 3, 5, 'star', 0.7);
                        playSound('wave');
                        return { success: true, needsCharge: true };
                    }
                }),
                // ===== 修改点2：圣骑士技能2 持续时间 300→240（4秒），转换比例 1:4→1:3 =====
                new Skill({
                    key: 'skill2', name: '神圣壁垒', cooldown: 720, energyCost: 0,
                    canUse: (owner) => !owner.divineShieldActive,
                    execute: (owner) => {
                        owner.divineShieldActive = true;
                        owner.divineShieldTimer = 240; // 原300 → 240（4秒）
                        owner.divineShieldAbsorb = 0;
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 40, '#ffd700', 6, 8, 'star', 1.2);
                        playSound('parry');
                        return { success: true };
                    }
                }),
                new Skill({
                    key: 'ult', name: '圣佑', cooldown: 0, energyCost: 0,
                    canUse: (owner) => owner.energy >= owner.maxEnergy && !owner.holyEmpowerActive,
                    execute: (owner) => {
                        owner.holyEmpowerActive = true;
                        owner.holyEmpowerTimer = 0;
                        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 120, '#ffd700', 14, 18, 'star', 3.0);
                        playSound('ult');
                        return { success: true };
                    }
                })
    ];
};

CHAR_CONFIGS.paladin.hooks = {
    // 圣骑士输入处理
    handleInput(player, world) {
        let moveX = 0;
        if (!player.dashing) {
            if(keys.left) moveX=-1;
            if(keys.right) moveX=1;
            if(!player.chargingSkill1 && keys.up && player.grounded){
                player.vy=JUMP_SPEED; player.grounded=false;
            }

            if(keys.attack && !player.chargingSkill1){
                if (player.attackCooldown <= 0 && !player.attacking) {
                    const cfg = CHAR_CONFIGS.paladin;
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
            if(keys.skill1 && !player.chargingSkill1 && player.grounded){
                const skill = player.getSkill('skill1');
                if (skill) {
                    const res = skill.tryUse(player);
                    if (res.success) player.chargingSkill1 = true;
                }
            }
            if(!keys.skill1 && player.chargingSkill1) {
                releasePaladinCharge(player);
            }
            if(keys.skill2){
                const skill = player.getSkill('skill2');
                if (skill) { const res = skill.tryUse(player); if (res.success) keys.skill2 = false; }
            }
            if(keys.ult){
                const skill = player.getSkill('ult');
                if (skill) { const res = skill.tryUse(player); if (res.success) keys.ult = false; }
            }

            const basePaladinSpeed = player.config.speed || 2.1;
            const maxSpeed = player.chargingSkill1 ? basePaladinSpeed * 1.2 : basePaladinSpeed;
            if (!player.hasStatus('frozen')) {
                player.vx += moveX * (player.chargingSkill1 ? 0.3 : 0.25);
                if(Math.abs(player.vx)>maxSpeed) player.vx = maxSpeed * Math.sign(player.vx);
            }
            if(player.grounded && moveX===0 && !player.attacking && !player.chargingSkill1 && !player.dashing) player.state='idle';
            else if(player.grounded && moveX!==0 && !player.attacking && !player.dashing) player.state='walk';
            if(player.attacking && player.attackTimer<=0){ player.attacking=false; player.state='idle'; }
        } else {
            moveX = 0;
        }
    },
    // 圣骑士受到伤害时，获得等同于所受伤害的能量
    onDamageReceived(target, attacker, dmg) {
        if (target.charId !== 'paladin') return;
        target.energy = Math.min(target.maxEnergy, target.energy + dmg);
    },
    // HUD 中将能量条渲染为金色，图标为 ✨
    onHUD(player) {
        if (player.charId !== 'paladin') return;
        energyFill.style.background = '#ffd700';
        energyFill.style.boxShadow = '0 0 10px #ffd700';
        energyText.style.color = '#ffd700';
        energyBar.style.color = '#ffd700';
        const energyIcon = document.querySelector('#energy-bar span');
        if (energyIcon) energyIcon.textContent = '✨';
    },
    // 圣骑士可以在空中使用技能2
    canUseSkill2InAir(fighter) {
        return true;
    }
};
