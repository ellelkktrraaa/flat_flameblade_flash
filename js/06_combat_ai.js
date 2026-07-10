    function rectCollide(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
    function checkHit(attackBox,target){ return rectCollide(attackBox, target.getHitBox()); }

    function reflectProjectile(p) {
        const defender = getOpponent(p.owner);
        if (!defender.blocking) return false;
        p.vx = -p.vx * 1.1;
        p.owner = defender;
        p.color = '#ffdd44';
        defender.energy = Math.min(defender.maxEnergy, defender.energy + 20);
        emitParticles(p.x + p.w/2, p.y + p.h/2, 25, '#ffdd44', 5, 7, 'star', 1.2);
        playSound('parry');
        return true;
    }

    function applyDamage(target, dmg, attacker, knockback = true, hitColor = '#ff8844', soundName = 'hit_enemy') {
        if (!target || target.hp <= 0) return;
        if (attacker && attacker === target) return;

        // 无敌（刺客「一瞬」）期间免疫伤害
        if (target.isInvincible) {
            emitParticles(target.x + target.w/2, target.y + target.h/2, 12, '#aa88ff', 3, 5, 'star', 0.6);
            return;
        }

        if (target.blocking) {
            if (attacker && attacker !== target) {
                attacker.vx = -attacker.facing * 8;
                attacker.vy = -5;
                attacker.hitCooldown = 20;
                emitExplosion(target.x + target.w/2, target.y + target.h/2, '#ffdd44', 50);
                playSound('parry');
            }
            return;
        }

        if (target.shieldActive) {
            const healAmount = Math.floor(dmg * 0.5);
            if (healAmount > 0) {
                target.hp = Math.min(target.maxHp, target.hp + healAmount);
                emitParticles(target.x + target.w/2, target.y + target.h/2, 15, '#44ff88', 3, 5, 'circle', 0.5);
            }
            emitParticles(target.x + target.w/2, target.y + target.h/2, 10, '#88ddff', 3, 5, 'circle', 0.5);
            updateHUD();
            return;
        }

        const baseDmg = dmg + (attacker && attacker.attackBoost ? attacker.attackBoost : 0) + (attacker && attacker.holyEmpowerActive ? 5 : 0);

        // ===== 修改点2：圣骑士技能2 转换比例 1:4 → 1:3 =====
        if (target.divineShieldActive) {
            const holyGain = Math.floor(baseDmg * 3); // 原 *4 → *3
            target.divineShieldAbsorb += baseDmg;
            target.energy = Math.min(target.maxEnergy, target.energy + holyGain);
            emitParticles(target.x + target.w/2, target.y + target.h/2, 18, '#ffd700', 4, 6, 'star', 0.8);
            playSound('parry');
            updateHUD();
            return;
        }

        // ---- 刺客暴击 ----
        let isCritical = false;
        if (attacker && attacker.charId === 'assassin' && attacker.shadowStance) {
            if (Math.random() < 0.5) {
                isCritical = true;
            }
        }

        let finalDmg = baseDmg;
        if (target.holyEmpowerActive) {
            finalDmg = Math.max(1, Math.floor(baseDmg * 0.5));
            knockback = false;
        }

        if (isCritical) {
            finalDmg = Math.floor(finalDmg * 1.5);
            // 暴击特效
            emitParticles(target.x + target.w/2, target.y + target.h/2, 30, '#ffdd44', 6, 8, 'star', 1.5);
            playSound('ult');
        }

        // 角色钩子：受伤时触发
        const tConfig = CHAR_CONFIGS[target.charId];
        if (tConfig && tConfig.hooks && tConfig.hooks.onDamageReceived) tConfig.hooks.onDamageReceived(target, attacker, baseDmg);

        target.hp -= finalDmg;
        target.damageFlash = 10;
        target.hitCooldown = 15;
        if (knockback && attacker && attacker !== target) {
            target.vy = -4;
            target.vx = (attacker.facing || (target === player ? -1 : 1)) * 5;
        }
        emitParticles(target.x+target.w/2,target.y+target.h/2,25,hitColor,6,6,'circle',0.8);
        if (target.hp < 0) target.hp = 0;
        playSound(soundName);
        updateHUD();
    }

    // 刺客「一瞬」完美闪避成功处理：积攒暗影能量、顿帧、特效，满格进入暗影游走
    function triggerAssassinDodge(owner) {
        owner.dodgeSuccess = true;
        owner.shadowEnergy = Math.min(owner.shadowEnergyMax, owner.shadowEnergy + 1);
        hitStop = 15;
        // 完美闪避成功 → 触发时间缓速全局慢放特写
        triggerSlowMotion();
        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 30, '#7744aa', 6, 8, 'star', 1.5);
        playSound('parry');
        if (owner.shadowEnergy >= owner.shadowEnergyMax) {
            owner.shadowStance = true;
            owner.shadowStanceTimer = 480; // 8秒
            emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 60, '#8844cc', 10, 14, 'star', 2.5);
            playSound('ult');
        }
    }

    // ===== 触发时间缓速（全局慢动作特写）=====
    // 纯视觉表现：降低逻辑更新频率，让所有单位一起慢放。时长叠加，受上限约束。
    function triggerSlowMotion(duration = SLOW_DURATION) {
        // PvP 模式下不启用，避免破坏联机同步
        if (gameMode === 'pvp') return;
        slowMoTimer = Math.min(SLOW_MAX, slowMoTimer + duration);
    }

    // ===== 修改点1：蓄力结束后才开始冷却 =====
    function releasePaladinCharge(owner) {
        if (!owner || !owner.chargingSkill1) return;
        const chargeTime = (Date.now() - owner.chargeStartTime) / 1000;
        const actualCharge = Math.min(chargeTime, 2.0);
        const distance = 100 + actualCharge * 150;
        const dir = owner.facing || 1;
        owner.chargingSkill1 = false;
        owner.state = 'idle';
        owner.dashing = true;
        owner.dashRemaining = distance;
        owner.dashDir = dir;
        owner.dashSpeed = (owner.config.speed || 2.1) * 2;
        owner.dashDamageDealt = false;
        // 蓄力结束后开始冷却
        const skill1 = owner.getSkill('skill1');
        if (skill1) skill1.cd = skill1.cooldown;
        emitParticles(owner.x + owner.w/2, owner.y + owner.h/2, 20, '#ffd700', 6, 8, 'star', 1.2);
        playSound('wave');
    }

    // ==================== PvP 远程输入 ====================
    function processPvPRemoteInput() {
        if (!pvpConnected || enemy.hp <= 0) return;
        if (enemy.hasStatus('frozen')) return;
        const f = enemy;
        const rk = remoteKeys;
        const cid = f.charId;
        let moveX = 0;

        if (cid === 'archer') {
            if (rk.left) moveX = -1;
            if (rk.right) moveX = 1;
            if (moveX !== 0) f.facing = moveX > 0 ? 1 : -1;
            if (rk.up && f.grounded && !f.shieldActive) { f.vy = JUMP_SPEED; f.grounded = false; }
            if (rk.attack && !f.shieldActive && f.arrows > 0 && !f.chargingAttack) {
                f.chargingAttack = true; f.chargeStartTime = Date.now(); f.attacking = true; f.state = 'attack';
            }
            if (!rk.attack && f.chargingAttack) {
                const ct = (Date.now() - f.chargeStartTime) / 1000;
                let dmg = 5, cost = 5;
                if (ct >= 2) { dmg = 12; cost = 15; } else if (ct >= 1) { dmg = 8; cost = 10; }
                if (f.energy >= cost) {
                    f.energy -= cost; f.arrows--;
                    const dir = f.facing;
                    const px = f.x + (dir === 1 ? f.w : 0);
                    let spd = Math.min(4 + ct * 2, 10);
                    world.projectiles.push({ x: px - 16, y: f.y + 20, w: 32, h: 20, vx: spd * dir, vy: 0, life: 120,
                        damage: dmg, owner: f, type: 'arrow', color: f.fireArrowBuff ? '#ff8800' : '#aaaaaa',
                        reflected: false, img: f.fireArrowBuff ? IMG.projectile_arrow_fire : IMG.projectile_arrow,
                        isFire: f.fireArrowBuff, tracking: f.trackingBuff, trackingTarget: player });
                    playSound('arrow');
                }
                f.chargingAttack = false; f.attacking = false; f.state = 'idle';
            }
            if (rk.skill1 && !f.shieldActive && !f.chargingAttack) { const s = f.getSkill('skill1'); if(s)s.tryUse(f); }
            if (rk.skill2 && !f.shieldActive && !f.chargingAttack) { const s = f.getSkill('skill2'); if(s)s.tryUse(f); }
            if (rk.ult && !f.shieldActive && !f.chargingAttack) { const s = f.getSkill('ult'); if(s)s.tryUse(f); }
            let sp = f.chargingAttack ? 1.25 : 2.25;
            if (!f.shieldActive && !f.hasStatus('frozen') && !f.dashing) {
                if (f.state !== 'crouch') { f.vx += moveX * sp; f.vx = clamp(f.vx, -sp, sp); }
            }
            if (f.grounded && moveX === 0 && !f.attacking && !f.dashing) f.state = 'idle';
            else if (f.grounded && moveX !== 0 && !f.attacking && !f.dashing) f.state = 'walk';
            if (f.attacking && f.attackTimer <= 0 && !f.chargingAttack) { f.attacking = false; f.state = 'idle'; }

        } else if (cid === 'paladin') {
            if (!f.dashing) {
                if (rk.left) moveX = -1;
                if (rk.right) moveX = 1;
                if (moveX !== 0 && !f.attacking) f.facing = moveX > 0 ? 1 : -1;
                if (!f.chargingSkill1 && rk.up && f.grounded) { f.vy = JUMP_SPEED; f.grounded = false; }
                if (rk.attack && !f.chargingSkill1 && f.attackCooldown <= 0 && !f.attacking) {
                    const cfg = CHAR_CONFIGS[cid];
                    f.attacking = true; f.attackTimer = cfg.attackDuration; f.attackDelay = cfg.attackDelay;
                    f.attackHitDealt = false; f.attackCooldown = cfg.attackCooldown; f.state = 'attack';
                    playSound('swing');
                }
                if (rk.skill1 && !f.chargingSkill1 && f.grounded) { const s = f.getSkill('skill1'); if(s){ if(s.tryUse(f).success) f.chargingSkill1 = true; } }
                if (!rk.skill1 && f.chargingSkill1) { releasePaladinCharge(f); }
                if (rk.skill2) { const s = f.getSkill('skill2'); if(s)s.tryUse(f); }
                if (rk.ult) { const s = f.getSkill('ult'); if(s)s.tryUse(f); }
                const bsp = f.config.speed || 2.1;
                const ms = f.chargingSkill1 ? bsp * 1.2 : bsp;
                if (!f.hasStatus('frozen')) { f.vx += moveX * (f.chargingSkill1 ? 0.3 : 0.25); f.vx = clamp(f.vx, -ms, ms); }
                if (f.grounded && moveX === 0 && !f.attacking && !f.chargingSkill1 && !f.dashing) f.state = 'idle';
                else if (f.grounded && moveX !== 0 && !f.attacking && !f.dashing) f.state = 'walk';
                if (f.attacking && f.attackTimer <= 0) { f.attacking = false; f.state = 'idle'; }
            }
        } else {
            // knight / mage / common
            if (!f.charging) {
                if (rk.left) moveX = -1;
                if (rk.right) moveX = 1;
                if (moveX !== 0 && !f.attacking) f.facing = moveX > 0 ? 1 : -1;
                if (rk.up && f.grounded && !f.shieldActive) { f.vy = JUMP_SPEED; f.grounded = false; }
                if (rk.attack && !f.shieldActive && f.attackCooldown <= 0 && !f.attacking) {
                    const cfg = CHAR_CONFIGS[cid];
                    if (cid === 'mage') {
                        if (f.energy < 10) { /* not enough */ }
                        else {
                            f.energy -= 10; f.attacking = true; f.attackTimer = cfg.attackDuration;
                            f.attackDelay = cfg.attackDelay; f.attackHitDealt = true; f.attackCooldown = cfg.attackCooldown;
                            f.state = 'attack';
                            const dir = f.facing;
                            world.projectiles.push({ x: f.x + (dir === 1 ? f.w : 0) - 16, y: f.y + 18, w: 32, h: 24,
                                vx: 3 * dir, vy: 0, life: 120, damage: 3, owner: f, type: 'mage_fire',
                                color: '#ff6600', reflected: false, img: IMG.projectile_fire, burn: true });
                            emitParticles(f.x + f.w/2, f.y + f.h/2, 20, '#ff6600', 4, 5, 'circle', 0.6);
                            playSound('wave');
                        }
                    } else {
                        f.attacking = true; f.attackTimer = cfg.attackDuration; f.attackDelay = cfg.attackDelay;
                        f.attackHitDealt = false; f.attackCooldown = cfg.attackCooldown; f.state = 'attack';
                        playSound('swing');
                    }
                }
                if (rk.skill1 && !f.shieldActive) { const s = f.getSkill('skill1'); if(s)s.tryUse(f); }
                if (rk.skill2 && !f.shieldActive) { const s = f.getSkill('skill2'); if(s)s.tryUse(f); }
            }
            if (cid === 'mage') {
                const ult = f.getSkill('ult');
                if (rk.ult && !f.shieldActive && !f.charging && (!ult || ult.cd <= 0)) {
                    if (f.energy >= 40) { f.charging = true; f.chargeStart = Date.now(); }
                }
                if (!rk.ult && f.charging) {
                    const ct = (Date.now() - f.chargeStart) / 1000;
                    let dmg = 40, cost = 80;
                    if (ct > 3) { dmg = 60; cost = 120; }
                    if (f.energy >= cost) {
                        f.energy -= cost;
                        const dir = f.facing;
                        world.projectiles.push({ x: f.x + (dir === 1 ? f.w : 0) - 20, y: f.y + 15, w: 40, h: 30,
                            vx: 4 * dir, vy: 0, life: 200, damage: dmg, owner: f, type: 'mage_light',
                            color: '#ffff44', reflected: false, img: IMG.projectile_light });
                        emitParticles(f.x + f.w/2, f.y + f.h/2, 40, '#ffff44', 8, 10, 'star', 1.5);
                        playSound('ult');
                        f.charging = false;
                        if (ult) ult.cd = ult.cooldown;
                    }
                }
            } else {
                if (rk.ult && !f.shieldActive) { const s = f.getSkill('ult'); if(s)s.tryUse(f); }
            }
            if (!f.charging && !f.shieldActive && !f.hasStatus('frozen') && !f.dashing) {
                if (f.state !== 'crouch') { f.vx += moveX * 0.25; f.vx = clamp(f.vx, -2.25, 2.25); }
            }
            if (f.grounded && moveX === 0 && !f.attacking && !f.dashing) f.state = 'idle';
            else if (f.grounded && moveX !== 0 && !f.attacking && !f.dashing) f.state = 'walk';
            if (f.attacking && f.attackTimer <= 0) { f.attacking = false; f.state = 'idle'; }
        }
    }

    function updateAI(){
        if(enemy.hp<=0) return;
        if (enemy.hasStatus('frozen')) return;
        const ai = AI_PRESETS[difficulty] || AI_PRESETS.medium;
        const diff = difficulty;
        let react = ai.react, aggro = ai.aggro, dodge = ai.dodge;
        let skillUseRate = ai.skillRate;
        let moveSpeed = ai.moveSpeed;

        if(enemy.hitCooldown>0) return;
        // 影武者幻影分身：AI 优先攻击最近的存活分身
        let aiTarget = player;
        if (world.phantoms && world.phantoms.length > 0) {
            let nearest = null, nd = Infinity;
            for (const ph of world.phantoms) {
                if (!ph || ph.hp <= 0) continue;
                const d = Math.abs(enemy.x - ph.x);
                if (d < nd) { nd = d; nearest = ph; }
            }
            if (nearest) aiTarget = nearest;
        }
        const dist=Math.abs(enemy.x-aiTarget.x);
        const dirToPlayer=aiTarget.x>enemy.x?1:-1;

        if(enemy.aiThinkDelay>0){ enemy.aiThinkDelay--; return; }
        enemy.aiThinkDelay=Math.floor(react/16)+Math.floor(Math.random()*8);

        const rand=Math.random();

        if (diff === 'hard') {
            if (enemy.forcedSkillTimer <= 0) {
                if (dist < 500) {
                    if (enemy.charId === 'knight') {
                        const skill = enemy.getSkill('skill1');
                        const res = skill ? skill.tryUse(enemy) : { success: false };
                        if (res.success) enemy.forcedSkillTimer = 300;
                        else enemy.forcedSkillTimer = 60;
                    } else if (enemy.charId === 'mage') {
                        const r2 = Math.random();
                        if (r2 < 0.5) {
                            if (enemy.attackCooldown <= 0 && !enemy.attacking && enemy.energy >= 10) {
                                const cfg = CHAR_CONFIGS[enemy.charId];
                                enemy.energy -= 10;
                                enemy.attacking = true;
                                enemy.attackTimer = cfg.attackDuration;
                                enemy.attackDelay = cfg.attackDelay;
                                enemy.attackHitDealt = true;
                                enemy.attackCooldown = cfg.attackCooldown;
                                enemy.state = 'attack';
                                const dir2 = enemy.facing;
                                const px2 = enemy.x + (dir2 === 1 ? enemy.w : 0);
                                const py2 = enemy.y + 30;
                                world.projectiles.push({
                                    x: px2 - 16, y: py2 - 12, w: 32, h: 24,
                                    vx: 3 * dir2, vy: 0, life: 120, damage: 3,
                                    owner: enemy, type: 'mage_fire', color: '#ff6600',
                                    reflected: false, img: IMG.projectile_fire, burn: true
                                });
                                emitParticles(px2, py2, 20, '#ff6600', 4, 5, 'circle', 0.6);
                                playSound('wave');
                                enemy.forcedSkillTimer = 300;
                            } else {
                                enemy.forcedSkillTimer = 60;
                            }
                        } else {
                            const skill = enemy.getSkill('skill1');
                            const res = skill ? skill.tryUse(enemy) : { success: false };
                            if (res.success) enemy.forcedSkillTimer = 300;
                            else enemy.forcedSkillTimer = 60;
                        }
                    } else if (enemy.charId === 'paladin') {
                        if (!enemy.chargingSkill1 && !enemy.dashing && enemy.grounded) {
                            const skill = enemy.getSkill('skill1');
                            if (skill && skill.canUse(enemy)) {
                                skill.tryUse(enemy);
                                enemy.forcedSkillTimer = 180;
                            } else {
                                enemy.forcedSkillTimer = 60;
                            }
                        } else {
                            enemy.forcedSkillTimer = 60;
                        }
                    } else if (enemy.charId === 'archer') {
                        if (enemy.arrows > 0 && enemy.energy >= 5 && !enemy.chargingAttack) {
                            const chargeTime = 0.8;
                            let damage, cost;
                            if (chargeTime < 1) { damage = 5; cost = 5; }
                            else if (chargeTime < 2) { damage = 8; cost = 10; }
                            else { damage = 12; cost = 15; }
                            if (enemy.energy >= cost) {
                                enemy.energy -= cost;
                                enemy.arrows--;
                                const dir2 = enemy.facing;
                                const px2 = enemy.x + (dir2 === 1 ? enemy.w : 0);
                                const py2 = enemy.y + 30;
                                let speed = 4 + chargeTime * 2;
                                speed = Math.min(speed, 10);
                                let arrowImg = IMG.projectile_arrow;
                                let isFire = enemy.fireArrowBuff;
                                if (isFire) arrowImg = IMG.projectile_arrow_fire;
                                world.projectiles.push({
                                    x: px2 - 16, y: py2 - 10, w: 32, h: 20,
                                    vx: speed * dir2, vy: 0,
                                    life: 120,
                                    damage: damage,
                                    owner: enemy,
                                    type: 'arrow',
                                    color: isFire ? '#ff8800' : '#aaaaaa',
                                    reflected: false,
                                    img: arrowImg,
                                    isFire: isFire,
                                    tracking: enemy.trackingBuff,
                                    trackingTarget: player
                                });
                                playSound('arrow');
                                enemy.forcedSkillTimer = 60;
                            } else {
                                enemy.forcedSkillTimer = 30;
                            }
                        } else {
                            enemy.forcedSkillTimer = 60;
                        }
                    } else if (enemy.charId === 'assassin') {
                        const r2 = Math.random();
                        if (r2 < 0.5) {
                            const skill = enemy.getSkill('skill1');
                            const res = skill ? skill.tryUse(enemy) : { success: false };
                            if (res.success) enemy.forcedSkillTimer = 240;
                            else enemy.forcedSkillTimer = 60;
                        } else {
                            const skill = enemy.getSkill('skill2');
                            const res = skill ? skill.tryUse(enemy) : { success: false };
                            if (res.success) enemy.forcedSkillTimer = 360;
                            else enemy.forcedSkillTimer = 60;
                        }
                    }
                } else {
                    enemy.forcedSkillTimer = 60;
                }
            } else {
                enemy.forcedSkillTimer--;
            }
        }

        if(diff==='hard' && enemy.grounded && Math.random()<0.05) {
            enemy.vy = -9;
        }

        let playerProjectileNear = false;
        for (let p of world.projectiles) {
            if (p.owner === player && Math.abs(p.x - enemy.x) < 200) {
                playerProjectileNear = true;
                break;
            }
        }
        if (playerProjectileNear && !enemy.blocking && enemy.grounded) {
            if (enemy.charId === 'knight') {
                const skill = enemy.getSkill('skill2');
                if (skill && skill.canUse(enemy)) { skill.tryUse(enemy); return; }
            } else if (enemy.charId === 'mage') {
                const skill = enemy.getSkill('skill2');
                if (skill && skill.canUse(enemy)) { skill.tryUse(enemy); return; }
            } else if (enemy.charId === 'paladin') {
                const skill = enemy.getSkill('skill2');
                if (skill && skill.canUse(enemy)) { skill.tryUse(enemy); return; }
            } else if (enemy.charId === 'assassin') {
                // 刺客用一瞬闪避投射物
                const skill = enemy.getSkill('skill1');
                if (skill && skill.canUse(enemy)) { skill.tryUse(enemy); return; }
            }
        }

        const skill1 = enemy.getSkill('skill1');
        const skill2 = enemy.getSkill('skill2');
        const ult = enemy.getSkill('ult');
        const canUseSkill1 = skill1 && skill1.canUse(enemy) && dist < 350;
        const canUseSkill2 = skill2 && skill2.canUse(enemy);
        const canUseUlt = ult && ult.canUse(enemy);

        if(dist > 150 && dist < 350 && canUseSkill1 && Math.random() < skillUseRate * 1.5) {
            skill1.tryUse(enemy);
            if (diff === 'hard') skill1.cd = Math.max(skill1.cd, 300);
            return;
        }

        if(dist < 200 && canUseUlt && Math.random() < skillUseRate * 0.8) {
            ult.tryUse(enemy);
            if (diff === 'hard') ult.cd = Math.max(ult.cd, 300);
            return;
        }

        if(dist < 80 && rand < aggro) {
            const cfg = CHAR_CONFIGS[enemy.charId];
            if (enemy.charId === 'archer') {
                if (enemy.arrows > 0 && enemy.energy >= 5) {
                    const chargeTime = 0.5;
                    let damage=5, cost=5;
                    if (enemy.energy >= cost) {
                        enemy.energy -= cost;
                        enemy.arrows--;
                        const dir2 = enemy.facing;
                        const px2 = enemy.x + (dir2 === 1 ? enemy.w : 0);
                        const py2 = enemy.y + 30;
                        let speed = 4 + chargeTime * 2;
                        speed = Math.min(speed, 10);
                        let arrowImg = IMG.projectile_arrow;
                        let isFire = enemy.fireArrowBuff;
                        if (isFire) arrowImg = IMG.projectile_arrow_fire;
                        world.projectiles.push({
                            x: px2 - 16, y: py2 - 10, w: 32, h: 20,
                            vx: speed * dir2, vy: 0,
                            life: 120,
                            damage: damage,
                            owner: enemy,
                            type: 'arrow',
                            color: isFire ? '#ff8800' : '#aaaaaa',
                            reflected: false,
                            img: arrowImg,
                            isFire: isFire,
                            tracking: enemy.trackingBuff,
                            trackingTarget: aiTarget
                        });
                        playSound('arrow');
                    }
                }
            } else if (enemy.charId === 'assassin') {
                const skill = enemy.getSkill('attack');
                if (skill && skill.canUse(enemy)) {
                    skill.tryUse(enemy);
                }
            } else {
                enemy.attacking = true;
                enemy.attackTimer = cfg.attackDuration;
                enemy.attackDelay = cfg.attackDelay;
                enemy.attackHitDealt = false;
            }
            return;
        }

        if(dist > 200) {
            enemy.vx = dirToPlayer * moveSpeed;
            if(enemy.grounded && Math.random() < ai.jumpRate) enemy.vy = -8;
            return;
        }

        if(rand < dodge && dist < 150) {
            enemy.vx = -dirToPlayer * moveSpeed * 1.5;
            if(enemy.grounded && Math.random()<0.1) enemy.vy = -7;
            return;
        }

        if(dist > 80) enemy.vx = dirToPlayer * moveSpeed * 0.8;
        else enemy.vx = 0;
    }

