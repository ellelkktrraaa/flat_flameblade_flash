    function updateFlameZones(world){
        // ===== 火焰区域更新 =====
        for (let i=world.flameZones.length-1; i>=0; i--) {
            const f = world.flameZones[i];
            f.life--;
            if (f.life <= 0) { world.flameZones.splice(i,1); continue; }
            const target = getOpponent(f.owner);
            if (target.hp > 0) {
                if (target.x + target.w > f.x && target.x < f.x + f.w &&
                    target.y + target.h > f.y && target.y < f.y + f.h) {
                    f.timer = (f.timer || 0) + 1;
                    if (f.timer >= f.tickInterval) {
                        f.timer = 0;
                        applyDamage(getOpponent(f.owner), f.damage, f.owner, false);
                        emitParticles(target.x + target.w/2, target.y + target.h/2, 5, '#ff4400', 2, 4, 'circle', 0.5);
                    }
                }
            }
        }

    }
