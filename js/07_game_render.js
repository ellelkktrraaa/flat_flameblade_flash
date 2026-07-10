    function initGame(playerCharId, enemyCharId) {
        initAudio();
        player = new Fighter(160, GROUND_Y-56, true, playerCharId, createSkills(playerCharId));
        // PvP 模式下敌方也是玩家控制
        const enemyIsPlayer = (gameMode === 'pvp');
        enemy = new Fighter(600, GROUND_Y-56, enemyIsPlayer, enemyCharId, createSkills(enemyCharId));
        enemy.facing = -1;
        enemy.forcedSkillTimer = 0;
        world.entities = [player, enemy];
        world.projectiles = []; world.particles = []; world.pickups = [];
        world.flameZones = []; world.explosionEffects = [];
        // 角色声明的专属 world 数组（反射初始化）
        const worldArrays = new Set();
        for (const charId of [playerCharId, enemyCharId]) {
            const cfg = CHAR_CONFIGS[charId];
            if (cfg && cfg.worldArrays) for (const a of cfg.worldArrays) worldArrays.add(a);
        }
        for (const a of worldArrays) world[a] = [];
        slowMoTimer = 0; slowMoTick = 0;
        player.hp = player.maxHp;
        enemy.hp = enemy.maxHp;
        player.energy = 0;
        enemy.energy = 0;
        player.shieldActive = false;
        enemy.shieldActive = false;
        player.statuses = [];
        enemy.statuses = [];
        player.iceHitCount = 0;
        enemy.iceHitCount = 0;
        // 通过 fields 反射重置角色专属字段（数组/对象做浅拷贝避免共享引用）
        for (let f of world.entities) {
            const cfg = CHAR_CONFIGS[f.charId];
            if (cfg && cfg.fields) {
                for (const key in cfg.fields) {
                    const val = cfg.fields[key];
                    if (Array.isArray(val)) f[key] = [...val];
                    else if (val !== null && typeof val === 'object') f[key] = { ...val };
                    else f[key] = val;
                }
            }
        }
        // 角色钩子：初始化战士额外状态
        for (let f of world.entities) {
            const config = CHAR_CONFIGS[f.charId];
            if (config && config.hooks && config.hooks.initFighter) config.hooks.initFighter(f);
        }
        initPickups();
        world.pickupTimer = 0;
        gameRunning = true;
        gameOver = false;
        resultDiv.classList.remove('show');
        updateHUD();
        updateSkillButtons();
    }

    function drawFighter(fighter) {
        if (!fighter) return;
        const { x, y, w, h, facing, damageFlash, blocking, shieldActive, charId } = fighter;
        const px = x - world.camera.x;
        if (px < -80 || px > W + 80) return;
        ctx.save();
        // 影武者「夜樱·隐」：对手视角完全不绘制隐身的影武者（含血条/名字标记）
        if (fighter.stealthActive && fighter !== player) { ctx.restore(); return; }
        if (damageFlash > 0 && damageFlash % 4 < 2) ctx.globalAlpha = 0.5;
        if (blocking) { ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 30; }
        if (shieldActive) { ctx.shadowColor = '#88ddff'; ctx.shadowBlur = 30; }
        if (fighter.divineShieldActive || fighter.holyEmpowerActive || fighter.dashing) {
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = fighter.dashing ? 60 : (fighter.holyEmpowerActive ? 48 : 30);
        }

        const config = CHAR_CONFIGS[charId];
        // 角色钩子：战士绘制
        if (config.hooks && config.hooks.onFighterDraw) config.hooks.onFighterDraw(ctx, fighter, world);
        const imgs = config.images;
        let img = imgs[ANIM_DEFAULT_KEY];
        // 魔女大招施法时强制使用 ult 贴图

         for (let s of ANIM_STATES) { if (s.condition(fighter)) { img = imgs[s.key]; break; } }
        // ---- 刺客次元斩时使用 skill2 贴图 ----
        if (fighter.charId === 'assassin' && (fighter.attacking || fighter.slashActive)) {
            if (imgs.skill2) img = imgs.skill2;
        }

        // ---- 刺客残影绘制 ----
        if (fighter.charId === 'assassin' && fighter.shadowTrail && fighter.shadowTrail.length > 0) {
            for (let trail of fighter.shadowTrail) {
                const alpha = trail.life / 20 * 0.35;
                const px2 = trail.x - world.camera.x;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(px2 + w/2, trail.y + h/2);
                ctx.scale(trail.facing || fighter.facing, 1);
                if (img && img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, -w/2, -h/2, w, h);
                }
                ctx.restore();
            }
        }

        if (fighter.shieldActive && IMG.shield && IMG.shield.complete && IMG.shield.naturalWidth > 0) {
            const shieldSize = Math.max(w, h) * 1.5;
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.translate(px + w / 2, y + h / 2);
            ctx.drawImage(IMG.shield, -shieldSize / 2, -shieldSize / 2, shieldSize, shieldSize);
            ctx.restore();
        }
        if (fighter.divineShieldActive || fighter.holyEmpowerActive) {
            ctx.save();
            ctx.globalAlpha = fighter.divineShieldActive ? 0.32 : 0.24;
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = fighter.divineShieldActive ? 4 : 3;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = fighter.holyEmpowerActive ? 48 : 28;
            ctx.beginPath();
            ctx.arc(px + w / 2, y + h / 2, Math.max(w, h) * (fighter.divineShieldActive ? 0.75 : 1.05), 0, Math.PI * 2);
            ctx.stroke();
            if (fighter.holyEmpowerActive) {
                ctx.globalAlpha = 0.12;
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(px + w / 2, y + h / 2, Math.max(w, h) * 1.18, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        if (fighter.dashing && img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            for (let i = 1; i <= 4; i++) {
                const tx = px - fighter.dashDir * i * 12;
                ctx.globalAlpha = 0.3 - i * 0.06;
                ctx.drawImage(img, tx - w/2, y - h/2, w, h);
            }
            ctx.restore();
        }
        ctx.save();
        // 影武者「夜樱·隐」：自身视角主体贴图半透明 50%
        if (fighter.stealthActive && fighter === player) ctx.globalAlpha *= 0.5;
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.translate(px + w / 2, y + h / 2);
            ctx.scale(facing, 1);
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
        for (let s of fighter.statuses) {
            if (s.timer <= 0) continue;
            if (s.freeze) {
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-w/2, -h/2, w, h);
                ctx.globalAlpha = 0.8;
                ctx.strokeStyle = '#88ddff';
                ctx.lineWidth = 2;
                ctx.strokeRect(-w/2, -h/2, w, h);
                ctx.globalAlpha = 1;
            } else if (s.vfxColor) {
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = s.vfxColor;
                ctx.fillRect(-w/2, -h/2, w, h);
            }
        }
        ctx.restore();

        ctx.restore();
        ctx.save();
        ctx.shadowBlur = 10;
        const isLocalPlayer = (fighter === player);
        ctx.shadowColor = isLocalPlayer ? '#00aaff' : '#ff4444';
        ctx.fillStyle = isLocalPlayer ? '#00aaff' : '#ff4444';
        ctx.beginPath();
        ctx.arc(px + w/2, y - 8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.font = '6px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isLocalPlayer ? 'P1' : (gameMode === 'pvp' ? 'P2' : 'AI'), px + w/2, y - 8);
        ctx.restore();
    }

    function drawChargeBar(owner) {
        if (!owner.charging && !owner.chargingSkill1) return;
        const px = owner.x - world.camera.x + owner.w/2;
        const py = owner.y - 20;
        const maxWidth = 40;
        const chargeTime = owner.chargingSkill1 ? (Date.now() - owner.chargeStartTime) / 1000 : (Date.now() - owner.chargeStart) / 1000;
        const progress = owner.chargingSkill1 ? Math.min(chargeTime / 2, 1) : Math.min(chargeTime / 3, 1);
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(px - maxWidth/2 - 2, py - 2, maxWidth + 4, 10);
        ctx.fillStyle = owner.chargingSkill1 ? '#ffd700' : '#ffdd44';
        ctx.fillRect(px - maxWidth/2, py, maxWidth * progress, 6);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(px - maxWidth/2, py, maxWidth, 6);
        ctx.restore();
    }

    function drawMap(){
        if (IMG.background && IMG.background.complete && IMG.background.naturalWidth > 0) {
            ctx.drawImage(IMG.background, -world.camera.x * 0.2, 0, W + 200, H);
        } else {
            const grad=ctx.createLinearGradient(0,0,0,H);
            grad.addColorStop(0,'#1a1a2e'); grad.addColorStop(0.5,'#16213e'); grad.addColorStop(1,'#2b2b44');
            ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
        }
        ctx.fillStyle='rgba(45,45,68,0.3)';
        for(let i=0;i<8;i++){ const x=(i*280-world.camera.x*0.2)%(W+200)-100; const y=GROUND_Y-60-Math.sin(i*1.5)*30; ctx.beginPath(); ctx.moveTo(x,GROUND_Y); ctx.lineTo(x+120,y); ctx.lineTo(x+240,GROUND_Y); ctx.fill(); }
        ctx.fillStyle='#3d3d5c';
        ctx.fillRect(0,GROUND_Y,MAP_W,H-GROUND_Y);
        ctx.fillStyle='#4f4f6f';
        for(let i=0;i<MAP_W;i+=40){ const sx=i-world.camera.x*0.8; if(sx>-20&&sx<W+20) ctx.fillRect(sx,GROUND_Y+4,20,4); }
        for(let p of world.platforms){
            if(p.isGround) continue;
            const sx=p.x-world.camera.x;
            if(sx > -p.w-20 && sx < W+20){
                ctx.fillStyle='#6a4c9c';
                ctx.fillRect(sx, p.y, p.w, p.h);
                ctx.fillStyle='#8a6cbc';
                ctx.fillRect(sx+4, p.y-2, p.w-8, 4);
                ctx.fillStyle='rgba(0,0,0,0.3)';
                ctx.fillRect(sx+4, p.y+p.h, p.w-8, 4);
            }
        }
        ctx.fillStyle='#e94560';
        ctx.fillRect(0-world.camera.x,GROUND_Y-10,10,10);
        ctx.fillRect(MAP_W-10-world.camera.x,GROUND_Y-10,10,10);
    }

    function drawProjectiles(){
        for(let p of world.projectiles){
            const px=p.x-world.camera.x;
            ctx.save();
            ctx.shadowColor = p.color || '#88ddff';
            ctx.shadowBlur = 40;
            if (p.img && p.img.complete && p.img.naturalWidth > 0) {
                ctx.translate(px + p.w/2, p.y + p.h/2);
                if (p.vx < 0) ctx.scale(-1, 1);
                ctx.drawImage(p.img, -p.w/2, -p.h/2, p.w, p.h);
            } else {
                ctx.fillStyle = p.color || '#88ddff';
                ctx.fillRect(px, p.y, p.w, p.h);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(px + 4, p.y + 4, p.w - 8, p.h - 8);
            }
            ctx.restore();
            if(frame % 2 === 0) {
                emitParticles(p.x + p.w/2, p.y + p.h/2, 3, p.color || '#88ddff', 2, 4, 'circle', 0.3);
            }
        }
    }

    function drawFlameZones() {
        for (let f of world.flameZones) {
            const px = f.x - world.camera.x;
            if (px < -50 || px > W + 50) continue;
            ctx.save();
            ctx.globalAlpha = 0.8;
            if (IMG.flame && IMG.flame.complete && IMG.flame.naturalWidth > 0) {
                ctx.drawImage(IMG.flame, px, f.y, f.w, f.h);
            } else {
                ctx.fillStyle = '#ff4400';
                ctx.shadowColor = '#ff4400';
                ctx.shadowBlur = 30;
                ctx.fillRect(px, f.y, f.w, f.h);
            }
            ctx.restore();
        }
    }

    function drawPickups(){
        for(let p of world.pickups) p.draw(ctx, world.camera.x);
    }

    function updateSkillButtons() {
        const charId = player.charId;
        const config = CHAR_CONFIGS[charId];
        if (charId === 'archer') {
            btnAttack.querySelector('.sub-label').textContent = player.arrows + '/' + player.maxArrows;
            btnAttack.classList.toggle('cooldown', player.arrows === 0);
        } else {
            const maxAttackCD = CHAR_CONFIGS[charId].attackCooldown || 60;
            const canAttack = player.attackCooldown === 0 && !player.attacking && !player.chargingSkill1 && !player.dashing;
            btnAttack.classList.toggle('cooldown', !canAttack);
            btnAttack.querySelector('.sub-label').textContent = canAttack ? '攻击' : (player.attackCooldown > 0 ? Math.ceil(player.attackCooldown/60)+'s' : '');
            updateCDOverlay(btnAttack, player.attackCooldown, maxAttackCD);
        }

        const skill1 = player.getSkill('skill1');
        if (skill1) {
            const canSkill1 = skill1.canUse(player) && !player.dashing;
            btnSkill1.classList.toggle('cooldown', !canSkill1);
            if (!canSkill1 && skill1.cd > 0) {
                btnSkill1.querySelector('.sub-label').textContent = Math.ceil(skill1.cd/60)+'s';
            } else if (player.dashing) {
                btnSkill1.querySelector('.sub-label').textContent = '突进中';
            } else {
                btnSkill1.querySelector('.sub-label').textContent = '技能1';
            }
            updateCDOverlay(btnSkill1, skill1.cd, skill1.cooldown);
        }

        const skill2 = player.getSkill('skill2');
        if (skill2) {
            const canSkill2 = skill2.canUse(player) && (player.grounded || charId === 'archer' || charId === 'paladin' || charId === 'assassin') && !player.dashing;
            btnSkill2.classList.toggle('cooldown', !canSkill2);
            if (!canSkill2 && skill2.cd > 0) {
                btnSkill2.querySelector('.sub-label').textContent = Math.ceil(skill2.cd/60)+'s';
            } else if (!player.grounded && charId !== 'archer' && charId !== 'paladin' && charId !== 'assassin') {
                btnSkill2.querySelector('.sub-label').textContent = '空中';
            } else if (player.dashing) {
                btnSkill2.querySelector('.sub-label').textContent = '突进中';
            } else {
                btnSkill2.querySelector('.sub-label').textContent = '技能2';
            }
            updateCDOverlay(btnSkill2, skill2.cd, skill2.cooldown);
        }

        const ult = player.getSkill('ult');
        const ultCD = ult ? ult.cd : 0;
        const ultMaxCD = ult ? ult.cooldown : 480;
        let ultNeed = 40;
        if (config.ultEnergyNeed) {
            ultNeed = config.ultEnergyNeed === 'maxEnergy' ? player.maxEnergy : config.ultEnergyNeed;
        }
        const canUlt = ult && ult.canUse(player) && player.energy >= ultNeed && !player.attacking && !player.chargingAttack && !player.chargingSkill1 && !player.dashing;
        btnUlt.classList.toggle('cooldown', !canUlt);
        if (!canUlt) {
            if (ultCD > 0) {
                btnUlt.querySelector('.sub-label').textContent = Math.ceil(ultCD/60)+'s';
            } else if (player.energy < ultNeed) {
                btnUlt.querySelector('.sub-label').textContent = Math.floor(player.energy)+'%';
            } else if (player.dashing) {
                btnUlt.querySelector('.sub-label').textContent = '突进中';
            } else {
                btnUlt.querySelector('.sub-label').textContent = '大招';
            }
        } else {
            btnUlt.querySelector('.sub-label').textContent = '大招';
        }
        updateCDOverlay(btnUlt, ultCD, ultMaxCD);
    }

    function updateCDOverlay(btn, cd, maxCD) {
        const overlay = btn.querySelector('.cd-overlay');
        if (!overlay) return;
        if (cd <= 0) {
            overlay.classList.add('hidden');
            return;
        }
        overlay.classList.remove('hidden');
        const progress = 1 - cd / maxCD;
        const angle = progress * 360;
        overlay.style.background = `conic-gradient(from 0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.6) ${angle}deg, transparent ${angle}deg, transparent 100%)`;
    }

    function showDexDetail(charId) {
        const data = CHAR_CONFIGS[charId].dex;
        if (!data) return;
        dexList.style.display = 'none';
        dexDetail.classList.add('active');
        
        // 存储当前角色ID到全局，供技能点击使用
        window._currentDexChar = charId;
        
        let html = `
            <div class="dex-title" id="dexTitleBar" style="cursor: pointer;" title="点击返回角色介绍"><span class="dex-icon">${data.icon}</span> ${CHAR_CONFIGS[charId].name}</div>
            <div class="dex-stats">${data.stats.map(s => `<span>❤️ ${s.label}：${s.value}</span>`).join('')}</div>
            <div style="margin-top: 12px; font-size: clamp(12px, 1.6vw, 16px); color: #ffd700; border-bottom: 1px solid rgba(255,215,0,0.2); padding-bottom: 4px;">✦ 技能列表</div>
            <div id="dexSkillList" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                ${(() => {
                    const normalSkills = data.skills.map((s, i) => ({...s, originalIndex: i})).filter(s => !s.name.includes('特殊机制'));
                    const specialSkills = data.skills.map((s, i) => ({...s, originalIndex: i})).filter(s => s.name.includes('特殊机制'));
                    const normalHtml = normalSkills.map((s) => `
                        <div class="dex-skill-tag" data-index="${s.originalIndex}" data-special="0" style="padding: 4px 12px; background: rgba(255,255,255,0.06); border-radius: 16px; border: 1px solid #555; color: #ccc; cursor: pointer; transition: all 0.2s; font-size: clamp(8px, 1.2vw, 12px);">
                            ${s.name}
                        </div>
                    `).join('');
                    const specialHtml = specialSkills.map((s) => `
                        <div class="dex-skill-tag" data-index="${s.originalIndex}" data-special="1" style="padding: 4px 12px; background: rgba(200,120,255,0.12); border-radius: 16px; border: 1px dashed #e0a3ff; color: #e0a3ff; cursor: pointer; transition: all 0.2s; font-size: clamp(8px, 1.2vw, 12px); text-decoration: underline;">
                            ✦ ${s.name}
                        </div>
                    `).join('');
                    return normalHtml + specialHtml;
                })()}
            </div>
            <div id="dexInfoPanel" style="margin-top: 12px; padding: 10px 14px; background: rgba(0,0,0,0.3); border-radius: 8px; min-height: 60px; border: 1px solid #444; color: #aaa; font-size: clamp(9px, 1.2vw, 13px);"></div>
        `;
        dexDetailContent.innerHTML = html;

        // 初始显示角色介绍
        showDexIntro(charId);

        // 绑定技能列表点击事件（委托）
        const skillList = document.getElementById('dexSkillList');
        if (skillList) {
            skillList.addEventListener('click', function(e) {
                const tag = e.target.closest('.dex-skill-tag');
                if (!tag) return;
                const idx = parseInt(tag.dataset.index, 10);
                showSkillDetail(charId, idx);
            });
        }
        // 点击角色名称/图标 → 回到角色介绍
        const titleBar = document.getElementById('dexTitleBar');
        if (titleBar) {
            titleBar.addEventListener('click', function() {
                showDexIntro(charId);
            });
        }
    }

    // 重置技能标签样式（普通/特殊各自的默认态）
    function resetDexTagStyles() {
        document.querySelectorAll('.dex-skill-tag').forEach(el => {
            const isSpecial = el.dataset.special === '1';
            el.style.borderColor = isSpecial ? '#e0a3ff' : '#555';
            el.style.background = isSpecial ? 'rgba(200,120,255,0.12)' : 'rgba(255,255,255,0.06)';
            el.style.color = isSpecial ? '#e0a3ff' : '#ccc';
        });
    }

    // 在共用面板显示角色介绍
    function showDexIntro(charId) {
        const data = CHAR_CONFIGS[charId] ? CHAR_CONFIGS[charId].dex : null;
        const panel = document.getElementById('dexInfoPanel');
        if (!data || !panel) return;
        resetDexTagStyles();
        panel.innerHTML = `
            <div style="color: #eee; line-height: 1.6; font-style: italic; white-space: pre-wrap;">${data.intro}</div>
        `;
    }

    function showSkillDetail(charId, index) {
        const data = CHAR_CONFIGS[charId] ? CHAR_CONFIGS[charId].dex : null;
        if (!data || !data.skills[index]) return;
        const skill = data.skills[index];
        const panel = document.getElementById('dexInfoPanel');
        if (!panel) return;

        // 高亮当前选中的技能标签（按 data-index 匹配，其余恢复默认）
        resetDexTagStyles();
        document.querySelectorAll('.dex-skill-tag').forEach(el => {
            if (parseInt(el.dataset.index, 10) === index) {
                el.style.borderColor = '#ffd700';
                el.style.background = 'rgba(255,215,0,0.15)';
                el.style.color = '#ffd700';
            }
        });

        panel.innerHTML = `
            <div style="font-weight: bold; color: #ffd700; font-size: clamp(11px, 1.4vw, 15px);">${skill.name}</div>
            <div style="margin-top: 4px; color: #ddd;">${skill.desc}</div>
            <div style="margin-top: 6px; font-size: clamp(8px, 1vw, 11px); color: #88ddff;"><em>${skill.meta}</em></div>
        `;
    }

    function hideDexDetail() {
        dexDetail.classList.remove('active');
        dexList.style.display = 'flex';
    }
