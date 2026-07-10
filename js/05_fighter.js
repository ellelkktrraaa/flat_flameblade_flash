    class Fighter {
        constructor(x,y,isPlayer,charId,skills){
            const config = CHAR_CONFIGS[charId];
            this.x=x; this.y=y; this.w=32; this.h=56;
            this.vx=0; this.vy=0;
            this.isPlayer=isPlayer;
            this.name = isPlayer ? '玩家' : 'AI';
            this.charId = charId;
            this.config = config;
            this.skills = skills;
            this.skillMap = {};
            for (let s of skills) this.skillMap[s.key] = s;
            this.facing = isPlayer ? 1 : -1;
            this.hp = config.hp;
            this.maxHp = config.hp;
            this.energy = 0;
            this.maxEnergy = config.maxEnergy;
            // 反射：从 CHAR_CONFIGS.xxx.fields 自动初始化角色专属字段
            const fields = config.fields || {};
            for (const key in fields) {
                const val = fields[key];
                if (Array.isArray(val)) this[key] = [...val];
                else if (val !== null && typeof val === 'object') this[key] = { ...val };
                else this[key] = val;
            }
            this.grounded = false;
            this.attacking = false;
            this.attackTimer = 0;
            this.attackCooldown = 0;
            this.attackDelay = 0;
            this.attackHitDealt = false;
            this.hitCooldown = 0;
            this.state = 'idle';
            this.damageFlash = 0;
            this.blocking = false;
            this.blockTimer = 0;
            this.onPlatform = null;
            this.aiThinkDelay = 0;
            this.aiActionTimer = 0;
            this.attackBoost = 0;
            this.boostTimer = 0;
            this.imageState = 'idle';
            this.forcedSkillTimer = 0;
            this.shieldActive = false;
            this.shieldTimer = 0;
            this.chargeStart = 0;
            this.charging = false;
            this.statuses = [];
            this.iceHitCount = 0;
            this.dashing = false;
            this.dashRemaining = 0;
            this.dashDir = 1;
            this.dashSpeed = 0;
            this.dashDamageDealt = false;
        }
        getSkill(key) { return this.skillMap[key]; }
        addStatus(effectId) {
            const def = STATUS_EFFECTS[effectId];
            if (!def) return;
            if (def.freeze && this.hasStatus('frozen')) return;
            for (let s of this.statuses) { if (s.id === effectId) { s.timer = def.duration; return; } }
            const inst = new StatusEffect(def.id, def.duration, def);
            if (inst.onApply) inst.onApply(this);
            this.statuses.push(inst);
        }
        hasStatus(effectId) { return this.statuses.some(s => s.id === effectId && s.timer > 0); }
        updateStatuses() {
            this.statuses = this.statuses.filter(s => s.update(this));
        }
        getSlowedFactor() {
            for (let s of this.statuses) { if (s.slowFactor < 1) return s.slowFactor; }
            return 1;
        }
        isMovementLocked() { return this.hasStatus('frozen') || this.shieldActive || this.dashing; }
        getHitBox(){ return { x:this.x+4, y:this.y+4, w:this.w-8, h:this.h-8 }; }
        getAttackBox(){
            const range = this.config.attackRange || 44;
            const ox = this.facing === 1 ? this.w : -range;
            return { x:this.x+ox, y:this.y+6, w:range, h:this.h-16 };
        }
        applyPhysics(){
            if (this.isCastingUlt) {
                this.vx = 0;
                this.vy = 0;
                this.imageState = 'ult';
                // 跳过物理模拟，但仍执行后面的计时/冷却/能量逻辑
            } else {
            if (this.dashing) {
                this.vx = this.dashSpeed * this.dashDir;
            }
            if (this.isFlying) {
                this.vy = 0;
            } else if(!this.grounded) {
                this.vy += GRAVITY;
            }
            if(this.grounded && Math.abs(this.vx)>0.1 && !this.dashing) this.vx *= FRICTION;
            else if(this.grounded && !this.dashing) this.vx=0;
            if (this.isMovementLocked() && !this.dashing) { this.vx = 0; this.vy = 0; }
            this.x += this.vx;
            this.y += this.vy;
            this.grounded = false;
            for(let p of world.platforms){
                if(this.vy >= 0 && this.x + this.w > p.x + 4 && this.x < p.x + p.w - 4 &&
                   this.y + this.h >= p.y && this.y + this.h <= p.y + p.h + 6){
                    this.y = p.y - this.h;
                    this.vy = 0;
                    this.grounded = true;
                    this.onPlatform = p;
                    break;
                }
            }
            if(!this.grounded && this.y >= GROUND_Y - this.h){
                this.y = GROUND_Y - this.h;
                this.vy = 0;
                this.grounded = true;
            }
            this.x = clamp(this.x, 10, MAP_W-10-this.w);
            if(Math.abs(this.vx)>0.5 && !this.dashing) this.facing = this.vx>0?1:-1;
            if (this.dashing) this.facing = this.dashDir;
            }
            if(this.attacking) this.attackTimer--;
            if(this.attackDelay > 0) {
                this.attackDelay--;
                if(this.attackDelay <= 0 && !this.attackHitDealt) {
                    this.attackHitDealt = true;
                    const target = getOpponent(this);
                    if(gameRunning && !gameOver && target && target.hp > 0) {
                        const box = this.getAttackBox();
                        if(checkHit(box, target)) {
                            applyDamage(target, this.config.attackDamage || 5, this);
                            const slashColor = (this === player) ? '#ffaa44' : '#ff8844';
                            emitSlash(target.x + target.w/2, target.y + target.h/2, this.facing > 0 ? 0 : Math.PI, slashColor);
                        }
                    }
                }
            }
            if(this.attackCooldown>0) this.attackCooldown--;
            if(this.hitCooldown>0) this.hitCooldown--;
            if(this.damageFlash>0) this.damageFlash--;
            if(this.blocking) {
                this.blockTimer--;
                if(this.blockTimer <= 0) this.blocking = false;
            }
            if (this.shieldActive) {
                this.shieldTimer--;
                if (this.shieldTimer <= 0) this.shieldActive = false;
            }
            // 角色钩子：战士每帧更新
            const config = CHAR_CONFIGS[this.charId];
            if (config && config.hooks && config.hooks.onFighterUpdate) config.hooks.onFighterUpdate(this);
            if (this.divineShieldActive) {
                this.divineShieldTimer--;
                if (this.divineShieldTimer <= 0) this.divineShieldActive = false;
            }
            if (this.holyEmpowerActive) {
                this.holyEmpowerTimer++;
                if (this.holyEmpowerTimer >= 60) {
                    this.holyEmpowerTimer = 0;
                    // 
                    this.energy = Math.max(0, this.energy - 10); 
                    if (this.energy <= 0) {
                        this.holyEmpowerActive = false;
                        emitParticles(this.x + this.w/2, this.y + this.h/2, 20, '#ffd700', 4, 6, 'star', 0.8);
                    }
                }
            }
            if (!this.isPlayer && this.chargingSkill1 && Date.now() - this.chargeStartTime >= 800) {
                // AI 蓄力完成后自动释放（在 update 中处理）
            }
            this.updateStatuses();
            for (let s of this.skills) s.update();
            const regen = this.config.energyRegen ?? 0.083;
            if(this.energy<this.maxEnergy) this.energy += regen;
            if(this.energy>this.maxEnergy) this.energy=this.maxEnergy;
            if(this.boostTimer > 0) {
                this.boostTimer--;
                if(this.boostTimer <= 0) this.attackBoost = 0;
            }
            if(this.attacking && this.attackTimer <= 0 && !this.chargingAttack) {
                this.attacking = false;
                this.state = 'idle';
            }
            if(this.dashing) this.imageState = 'charge';
            else if(this.attacking) this.imageState = 'attack';
            else if(!this.grounded) this.imageState = 'jump';
            else if(this.state === 'walk') this.imageState = 'walk';
            else this.imageState = 'idle';
        }
    }

