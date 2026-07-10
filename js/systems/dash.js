    function updateDash(world){
        // ===== 突进逻辑（逐帧移动） =====
        for (let f of world.entities) {
            if (f.dashing && f.hp > 0) {
                const step = f.dashSpeed;
                const newX = f.x + f.dashDir * step;
                if (newX < 10 || newX + f.w > MAP_W - 10) {
                    f.dashing = false;
                    f.state = 'idle';
                    f.vx = 0;
                    emitParticles(f.x + f.w/2, f.y + f.h/2, 10, '#ffd700', 3, 5, 'star', 0.8);
                    continue;
                }
                let hitWall = false;
                for (let p of world.platforms) {
                    if (p.isGround) continue;
                    const testX = newX + (f.dashDir > 0 ? f.w : 0);
                    if (f.dashDir > 0 && testX > p.x && f.x + f.w <= p.x && f.y + f.h > p.y && f.y < p.y + p.h) {
                        hitWall = true;
                        break;
                    }
                    if (f.dashDir < 0 && newX < p.x + p.w && f.x >= p.x + p.w && f.y + f.h > p.y && f.y < p.y + p.h) {
                        hitWall = true;
                        break;
                    }
                }
                if (hitWall) {
                    f.dashing = false;
                    f.state = 'idle';
                    f.vx = 0;
                    emitParticles(f.x + f.w/2, f.y + f.h/2, 10, '#ffd700', 3, 5, 'star', 0.8);
                    continue;
                }
                f.x = newX;
                f.dashRemaining -= step;
                const target = getOpponent(f);
                if (target && target.hp > 0) {
                    if (rectCollide(f.getHitBox(), target.getHitBox())) {
    if (!f.dashDamageDealt) {
        f.dashDamageDealt = true;
        // 角色钩子：突进接触特殊处理
        const cfg = CHAR_CONFIGS[f.charId];
        if (!(cfg && cfg.hooks && cfg.hooks.onDashContact && cfg.hooks.onDashContact(f, target))) {
            applyDamage(target, 15, f);
            target.vx = f.dashDir * 7;
            if (!target.holyEmpowerActive) target.vy = -4;
        }
        emitParticles(target.x + target.w/2, target.y + target.h/2, 40, '#ffaa00', 10, 12, 'star', 1.8);
    }
}
                }
                if (f.dashRemaining <= 0) {
                    f.dashing = false;
                    f.state = 'idle';
                    f.vx = f.dashDir * 2;
                    emitParticles(f.x + f.w/2, f.y + f.h/2, 15, '#ffd700', 4, 6, 'star', 1.0);
                }
            }
        }



    }
