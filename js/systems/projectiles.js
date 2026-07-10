    function updateProjectiles(world){
        // ===== 投射物更新 =====
        for (let i = world.projectiles.length - 1; i >= 0; i--) {
            const p = world.projectiles[i];
            // 1. 更新位置和寿命
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            // 2. 追踪效果
            if (p.tracking && p.owner && p.trackingTarget && p.trackingTarget.hp > 0) {
                const target = p.trackingTarget;
                const dx = target.x + target.w / 2 - (p.x + p.w / 2);
                const dy = target.y + target.h / 2 - (p.y + p.h / 2);
                const dist = Math.hypot(dx, dy);
                if (dist < 300) {
                    const angle = Math.atan2(dy, dx);
                    const currentAngle = Math.atan2(p.vy, p.vx);
                    let diff = angle - currentAngle;
                    while (diff > Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;
                    const turnSpeed = 0.03;
                    const newAngle = currentAngle + clamp(diff, -turnSpeed, turnSpeed);
                    const speed = Math.hypot(p.vx, p.vy);
                    p.vx = Math.cos(newAngle) * speed;
                    p.vy = Math.sin(newAngle) * speed;
                }
            }

            // 3. 角色钩子：投射物更新特殊逻辑
            if (CHAR_CONFIGS.witch && CHAR_CONFIGS.witch.hooks && CHAR_CONFIGS.witch.hooks.onProjectileUpdate) {
                if (CHAR_CONFIGS.witch.hooks.onProjectileUpdate(world, i, p)) continue;
            }

            // 4. 超出边界或寿命结束
            if (p.x < -50 || p.x > MAP_W + 50 || p.y > GROUND_Y || p.life <= 0) {
                // 角色钩子：投射物更新特殊逻辑（过期处理）
                if (CHAR_CONFIGS.witch && CHAR_CONFIGS.witch.hooks && CHAR_CONFIGS.witch.hooks.onProjectileUpdate) {
                    if (CHAR_CONFIGS.witch.hooks.onProjectileUpdate(world, i, p)) continue;
                }
                // 普通投射物移除
                world.projectiles.splice(i, 1);
                continue;
            }

            // 5. 碰撞检测（双方）
            let target = getOpponent(p.owner);

            if (!target || p.owner === target) {
                world.projectiles.splice(i, 1);
                continue;
            }

            // 格挡反弹
            if (target.blocking && target !== p.owner) {
                if (reflectProjectile(p)) continue;
            }

            if (target.hp > 0) {
                const hit = target.getHitBox();
                if (rectCollide(p, hit)) {
                    // 角色钩子：投射物命中特殊逻辑
                    const ownerConfig = p.owner ? CHAR_CONFIGS[p.owner.charId] : null;
                    if (ownerConfig && ownerConfig.hooks && ownerConfig.hooks.onProjectileHit) {
                        if (ownerConfig.hooks.onProjectileHit(world, p, target, i)) continue;
                    }

                    // 冰晶冰冻累积
                    if (p.type === 'mage_ice' && p.owner === player) {
                        target.iceHitCount++;
                        if (target.iceHitCount >= 2) {
                            target.addStatus('frozen');
                        }
                    }
                    if (p.isGravity) target.addStatus('gravity_debuff');
                    if (p.burn) target.addStatus('burn');
                    if (p.slow) target.addStatus('slow');
                    if (p.isFire) target.addStatus('burn');

                    // 伤害
                    {
                        const pTarget = getOpponent(p.owner);
                        if (p.type === 'mage_fire' || p.type === 'mage_ice' || p.type === 'mage_light') {
                            applyDamage(pTarget, p.damage, p.owner, false);
                        } else {
                            applyDamage(pTarget, p.damage, p.owner);
                        }
                    }

                    emitParticles(p.x + p.w / 2, p.y + p.h / 2, 30, '#ffaa00', 6, 8, 'star', 1.2);

                    world.projectiles.splice(i, 1);
                }
            }
        }

    }
