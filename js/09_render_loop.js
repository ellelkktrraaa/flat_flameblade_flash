    function draw(){
        ctx.clearRect(0,0,W,H);
        drawMap();
        drawFighter(player);
        drawFighter(enemy);
        drawProjectiles();

        // 绘制龙卷风
        if (world.tornadoes) {
            for (let t of world.tornadoes) {
                const px = t.x - world.camera.x;
                if (px > -t.w && px < W + t.w) {
                    ctx.save();
                    ctx.globalAlpha = 0.8;
                    if (t.img && t.img.complete && t.img.naturalWidth > 0) {
                        ctx.drawImage(t.img, px, t.y, t.w, t.h);
                    } else {
                        ctx.fillStyle = '#88ddff';
                        ctx.shadowColor = '#88ddff';
                        ctx.shadowBlur = 30;
                        ctx.fillRect(px, t.y, t.w, t.h);
                    }
                    ctx.restore();
                }
            }
        }
        // 绘制漩涡
        if (world.vortexes) {
            for (let v of world.vortexes) {
                const px = v.x - world.camera.x;
                if (px > -v.w && px < W + v.w) {
                    ctx.save();
                    ctx.globalAlpha = 0.8;
                    if (v.img && v.img.complete && v.img.naturalWidth > 0) {
                        ctx.drawImage(v.img, px, v.y, v.w, v.h);
                    } else {
                        ctx.fillStyle = '#7744aa';
                        ctx.shadowColor = '#7744aa';
                        ctx.shadowBlur = 30;
                        ctx.fillRect(px, v.y, v.w, v.h);
                    }
                    ctx.restore();
                }
            }
        }
        drawFlameZones();
        drawPickups();
        drawChargeBar(player);
        if (gameMode === 'pvp') drawChargeBar(enemy);
        for(let p of world.particles) p.draw(ctx);// 绘制爆炸特效
for (let e of world.explosionEffects) {
    const px = e.x - world.camera.x;
    ctx.save();
    ctx.globalAlpha = e.alpha;
    if (e.img && e.img.complete && e.img.naturalWidth > 0) {
        ctx.drawImage(e.img, px, e.y, e.w, e.h);
    }
    ctx.restore();
}
        ctx.fillStyle='#aaa'; ctx.font='8px monospace';
        ctx.fillText(`粒子:${world.particles.length} | 掉落:${world.pickups.length} | 火焰:${world.flameZones.length}`, 10, 20);

        // ===== 角色覆盖层钩子（刺客大招全屏动画、影武者陷阱/分身/刀光等）=====
        // 对场上出现的每个角色（去重）调用一次 onOverlayDraw
        const overlaySeen = new Set();
        for (const f of [player, enemy]) {
            if (!f || overlaySeen.has(f.charId)) continue;
            overlaySeen.add(f.charId);
            const oCfg = CHAR_CONFIGS[f.charId];
            if (oCfg && oCfg.hooks && oCfg.hooks.onOverlayDraw) oCfg.hooks.onOverlayDraw(ctx, world);
        }

        // ===== 时间缓速视觉：紫色暗角特写滤镜 =====
        if (slowMoTimer > 0) {
            ctx.save();
            // 边缘渐变暗角
            const grad = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.3, W/2, H/2, Math.max(W,H)*0.7);
            grad.addColorStop(0, 'rgba(136,68,204,0)');
            grad.addColorStop(1, 'rgba(80,30,140,0.45)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
            // 整体轻微紫色调
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = 'rgba(120,80,200,0.12)';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }
    }

    function loop(){ 
        // 时间缓速：慢放期间按 SLOW_FACTOR 跳帧执行逻辑更新，draw 照常每帧渲染
        if (slowMoTimer > 0) {
            slowMoTimer--;
            slowMoTick++;
            if (slowMoTick >= SLOW_FACTOR) {
                slowMoTick = 0;
                update();
            }
        } else {
            slowMoTick = 0;
            update();
        }
        draw(); 
        // PvP主机：每帧发状态（包括gameOver后持续发结算，不受update内return影响）
        if (gameMode === 'pvp' && isHost && pvpGameStarted) sendPvPState();
        requestAnimationFrame(loop); 
    }

    function updateHUD(){
        const pH=Math.max(0,(player.hp/player.maxHp)*100);
        const eH=Math.max(0,(enemy.hp/enemy.maxHp)*100);
        playerHealthBar.style.width=pH+'%';
        enemyHealthBar.style.width=eH+'%';
        playerHealthText.textContent=Math.floor(player.hp);
        enemyHealthText.textContent=Math.floor(enemy.hp);
        const eng=Math.min(100,(player.energy/player.maxEnergy)*100);
        energyFill.style.width=eng+'%';
        energyText.textContent=Math.floor(eng)+'%';
        const energyIcon = document.querySelector('#energy-bar span');
        // 默认能量条样式
        energyFill.style.background = '#00d4ff';
        energyFill.style.boxShadow = '0 0 10px #00d4ff';
        energyText.style.color = '#aaccff';
        energyBar.style.color = '#aaccff';
        if (energyIcon) energyIcon.textContent = '⚡';
        // 角色钩子：自定义HUD
        const pConfig = CHAR_CONFIGS[player.charId];
        if (pConfig && pConfig.hooks && pConfig.hooks.onHUD) pConfig.hooks.onHUD(player);
        arrowText.textContent = '--';
}

