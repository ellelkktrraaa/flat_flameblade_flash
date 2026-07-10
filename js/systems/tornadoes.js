    function updateTornadoes(world){
        // ===== 龙卷风/漩涡更新 =====
        if (world.tornadoes) {
            for (let i = world.tornadoes.length - 1; i >= 0; i--) {
                const t = world.tornadoes[i];
                t.life--;
                if (t.life <= 0) { world.tornadoes.splice(i, 1); continue; }
                const target = getOpponent(t.owner);
                if (target && target.hp > 0) {
                    const dx = (t.x + t.w/2) - (target.x + target.w/2);
                    const dy = (t.y + t.h/2) - (target.y + target.h/2);
                    const dist = Math.hypot(dx, dy);
                    if (dist < 150) {
                        const pull = t.pullStrength || 0.3;
                        const angle = Math.atan2(dy, dx);
                        target.vx += Math.cos(angle) * pull;
                        target.vy += Math.sin(angle) * pull * 0.5;
                    }
                    if (rectCollide(target.getHitBox(), { x: t.x, y: t.y, w: t.w, h: t.h })) {
                        t.timer = (t.timer || 0) + 1;
                        if (t.timer >= t.tickInterval) {
                            t.timer = 0;
                            applyDamage(getOpponent(t.owner), t.damage, t.owner, false);
                            emitParticles(target.x + target.w/2, target.y + target.h/2, 10, '#88ddff', 3, 5, 'star', 0.6);
                        }
                    }
                }
            }
        }
        if (world.vortexes) {
            for (let i = world.vortexes.length - 1; i >= 0; i--) {
                const v = world.vortexes[i];
                v.life--;
                if (v.life <= 0) { world.vortexes.splice(i, 1); continue; }
                const target = getOpponent(v.owner);
                if (target && target.hp > 0) {
                    const dx = (v.x + v.w/2) - (target.x + target.w/2);
                    const dy = (v.y + v.h/2) - (target.y + target.h/2);
                    const dist = Math.hypot(dx, dy);
                    if (dist < 130) {
                        const pull = v.pullStrength || 0.4;
                        const angle = Math.atan2(dy, dx);
                        target.vx += Math.cos(angle) * pull;
                        target.vy += Math.sin(angle) * pull * 0.4;
                    }
                    if (rectCollide(target.getHitBox(), { x: v.x, y: v.y, w: v.w, h: v.h })) {
                        v.timer = (v.timer || 0) + 1;
                        if (v.timer >= v.tickInterval) {
                            v.timer = 0;
                            applyDamage(getOpponent(v.owner), v.damage, v.owner, false);
                            emitParticles(target.x + target.w/2, target.y + target.h/2, 8, '#7744aa', 3, 5, 'star', 0.6);
                        }
                    }
                }
            }
        }

    }
