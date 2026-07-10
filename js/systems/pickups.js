    function updatePickupsAndEnd(world){
        // ===== 掉落物更新 =====
        for(let i=world.pickups.length-1;i>=0;i--){
            const item = world.pickups[i];
            if(!item.active) { world.pickups.splice(i,1); continue; }
            item.update();
            const targets = [player, enemy];
            for(let t of targets){
                if(t.hp<=0) continue;
                const dist = Math.hypot(t.x + t.w/2 - item.x - item.w/2, t.y + t.h/2 - item.y - item.h/2);
                if(dist < 35){
                    const def = PICKUP_DEFS[item.type];
                    if (def) {
                        def.effect(t);
                        emitParticles(item.x+item.w/2, item.y+item.h/2, 20, def.color, 4, 6, 'star', 1);
                        playSound('pickup');
                    }
                    item.active = false;
                    world.pickups.splice(i,1);
                    break;
                }
            }
        }

        schedulePickup();
        world.particles = world.particles.filter(p=>p.update());
// 更新爆炸特效（淡出）
for (let i = world.explosionEffects.length - 1; i >= 0; i--) {
    const e = world.explosionEffects[i];
    e.life--;
    e.alpha = e.life / e.maxLife;
    if (e.life <= 0) {
        world.explosionEffects.splice(i, 1);
    }
}
        let targetCamX = player.x - W/2;
        targetCamX = clamp(targetCamX, 0, MAP_W-W);
        world.camera.x += (targetCamX-world.camera.x)*0.1;

        if(player.hp<=0){ gameOver=true; showResult('💀 战败', gameMode === 'pvp' ? '对手获得了胜利!' : 'AI 取得了胜利...'); }
        else if(enemy.hp<=0){ gameOver=true; showResult('🏆 胜利!', gameMode === 'pvp' ? '你击败了对手!' : '你击败了 '+difficulty.toUpperCase()+' 等级的对手!'); }
        updateHUD();
        updateSkillButtons();
    }
