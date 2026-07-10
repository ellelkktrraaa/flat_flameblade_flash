    function initAudio() {
        if (!world.audioCtx) world.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    function playSound(type) {
        try {
            initAudio();
            const now = world.audioCtx.currentTime;
            const gainNode = world.audioCtx.createGain();
            gainNode.connect(world.audioCtx.destination);
            let osc;
            switch(type) {
                case 'swing':
                    osc = world.audioCtx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(180, now);
                    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
                    gainNode.gain.setValueAtTime(0.25, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    osc.start(now); osc.stop(now + 0.12);
                    break;
                case 'wave':
                    osc = world.audioCtx.createOscillator();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(500, now);
                    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
                    gainNode.gain.setValueAtTime(0.2, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.start(now); osc.stop(now + 0.2);
                    break;
                case 'parry':
                    osc = world.audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, now);
                    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.1);
                    gainNode.gain.setValueAtTime(0.3, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                    osc.start(now); osc.stop(now + 0.1);
                    break;
                case 'ult': {
                    const bufferSize = world.audioCtx.sampleRate * 0.4;
                    const buffer = world.audioCtx.createBuffer(1, bufferSize, world.audioCtx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 3);
                    const noise = world.audioCtx.createBufferSource();
                    noise.buffer = buffer;
                    const gainNoise = world.audioCtx.createGain();
                    gainNoise.gain.setValueAtTime(0.4, now);
                    gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    noise.connect(gainNoise);
                    gainNoise.connect(world.audioCtx.destination);
                    noise.start(now); noise.stop(now + 0.4);
                    osc = world.audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(80, now);
                    osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
                    const g2 = world.audioCtx.createGain();
                    g2.gain.setValueAtTime(0.3, now);
                    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                    osc.connect(g2);
                    g2.connect(world.audioCtx.destination);
                    osc.start(now); osc.stop(now + 0.4);
                    break;
                }
                case 'hit_player':
                    osc = world.audioCtx.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
                    gainNode.gain.setValueAtTime(0.3, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    osc.start(now); osc.stop(now + 0.12);
                    break;
                case 'hit_enemy':
                    osc = world.audioCtx.createOscillator();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
                    gainNode.gain.setValueAtTime(0.25, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
                    osc.start(now); osc.stop(now + 0.12);
                    break;
                case 'pickup':
                    osc = world.audioCtx.createOscillator();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1200, now);
                    osc.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
                    gainNode.gain.setValueAtTime(0.2, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                    osc.start(now); osc.stop(now + 0.08);
                    break;
                case 'arrow':
                    osc = world.audioCtx.createOscillator();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
                    gainNode.gain.setValueAtTime(0.15, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
                    osc.start(now); osc.stop(now + 0.06);
                    break;
                default: return;
            }
            if (osc) { osc.connect(gainNode); osc.start(now); osc.stop(now + (type === 'ult' ? 0.4 : 0.2)); }
        } catch(e) {}
    }

    function setupButton(id, keyOn, keyOff) {
        const el = document.getElementById(id);
        if (!el) return;
        const start = (e) => { e.preventDefault(); if (keyOn) keyOn(); el.style.transform='scale(0.92)'; };
        const end = (e) => { e.preventDefault(); if (keyOff) keyOff(); el.style.transform='scale(1)'; };
        el.addEventListener('touchstart', start, {passive:false});
        el.addEventListener('touchend', end, {passive:false});
        el.addEventListener('touchcancel', end, {passive:false});
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', end);
        el.addEventListener('mouseleave', end);
    }
    setupButton('btnLeft', ()=>keys.left=true, ()=>keys.left=false);
    setupButton('btnRight', ()=>keys.right=true, ()=>keys.right=false);
    setupButton('btnJump', ()=>keys.up=true, ()=>keys.up=false);
    setupButton('btnAttack', ()=>keys.attack=true, ()=>keys.attack=false);
    setupButton('btnSkill1', ()=>keys.skill1=true, ()=>keys.skill1=false);
    setupButton('btnSkill2', ()=>keys.skill2=true, ()=>keys.skill2=false);
    setupButton('btnUlt', ()=>keys.ult=true, ()=>keys.ult=false);

    function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

    class Particle {
        constructor(x,y,vx,vy,color,life,size,type='circle') {
            this.x=x; this.y=y; this.vx=vx; this.vy=vy;
            this.color=color; this.life=life; this.maxLife=life;
            this.size=size; this.type=type; this.alpha=1;
        }
        update() {
            this.x+=this.vx; this.y+=this.vy; this.vy+=0.08;
            this.life--; this.alpha=this.life/this.maxLife; this.size*=0.97;
            return this.life>0 && this.size>0.3;
        }
        draw(ctx) {
            ctx.globalAlpha=this.alpha;
            ctx.fillStyle=this.color;
            if(this.type==='circle'){ ctx.beginPath(); ctx.arc(this.x,this.y,Math.max(1,this.size),0,Math.PI*2); ctx.fill(); }
            else if(this.type==='rect'){ ctx.fillRect(this.x-this.size/2,this.y-this.size/2,this.size,this.size); }
            else if(this.type==='star'){ ctx.shadowColor=this.color; ctx.shadowBlur=20; ctx.fillRect(this.x-this.size/2,this.y-this.size/2,this.size,this.size); ctx.shadowBlur=0; }
            ctx.globalAlpha=1;
        }
    }
    function emitParticles(x,y,count,color,speed,size,type='circle',spread=1){
        for(let i=0;i<count;i++){
            const a=Math.random()*Math.PI*2;
            const s=Math.random()*speed+1;
            const vx=Math.cos(a)*s*spread;
            const vy=Math.sin(a)*s*spread-1;
            const life=20+Math.random()*30;
            const sz=size*(0.5+Math.random()*0.8);
            world.particles.push(new Particle(x,y,vx,vy,color,life,sz,type));
        }
    }
    function emitSlash(x,y,dir,color){
        for(let i=0;i<15;i++){
            const a=dir+(Math.random()-0.5)*1.2;
            const s=2+Math.random()*5;
            const vx=Math.cos(a)*s;
            const vy=Math.sin(a)*s-2;
            world.particles.push(new Particle(x,y,vx,vy,color,10+Math.random()*20,4+Math.random()*8,'star'));
        }
    }
    function emitExplosion(x,y,color,count=40){
        for(let i=0;i<count;i++){
            const a=Math.random()*Math.PI*2;
            const s=2+Math.random()*6;
            const vx=Math.cos(a)*s;
            const vy=Math.sin(a)*s-2;
            const life=15+Math.random()*25;
            const sz=3+Math.random()*8;
            world.particles.push(new Particle(x,y,vx,vy,color,life,sz,'star'));
        }
    }

    function initPlatforms() {
        world.platforms = [
            { x:0, y:GROUND_Y, w:MAP_W, h:10, isGround:true },
            { x:400, y:GROUND_Y-120, w:120, h:12 },
            { x:1000, y:GROUND_Y-160, w:140, h:12 },
            { x:1600, y:GROUND_Y-110, w:130, h:12 },
        ];
    }
    initPlatforms();

    class Pickup {
        constructor(x, y, type) {
            this.x = x; this.y = y; this.w = 16; this.h = 16;
            this.type = type; this.active = true;
            this.glow = Math.random() * Math.PI * 2;
            this.bob = Math.random() * 100;
        }
        update() {
            this.glow += 0.04; this.bob += 0.02;
            this.y += Math.sin(this.bob) * 0.1;
            return this.active;
        }
        draw(ctx, camX) {
            if (!this.active) return;
            const px = this.x - camX;
            if (px < -30 || px > W + 30) return;
            const pulse = 1 + 0.1 * Math.sin(this.glow);
            const def = PICKUP_DEFS[this.type];
            const color = def ? def.color : '#ffffff';
            const symbol = def ? def.symbol : '?';
            ctx.save();
            ctx.shadowColor = color;
            ctx.shadowBlur = 20 * pulse;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(px + this.w/2, this.y + this.h/2, 10 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px + this.w/2, this.y + this.h/2, 5 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = '#000';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, px + this.w/2, this.y + this.h/2);
        }
    }

    function spawnPickup() {
        if (world.pickups.length >= (difficulty === 'hard' ? 6 : 10)) return;
        const x = 100 + Math.random() * (MAP_W - 200);
        const y = GROUND_Y - 30 - Math.random() * 120;
        const keys = Object.keys(PICKUP_DEFS);
        let total = 0;
        for (let k of keys) total += PICKUP_DEFS[k][difficulty === 'hard' ? 'hardWeight' : 'weight'];
        let r = Math.random() * total;
        let type = keys[0];
        for (let k of keys) {
            r -= PICKUP_DEFS[k][difficulty === 'hard' ? 'hardWeight' : 'weight'];
            if (r <= 0) { type = k; break; }
        }
        world.pickups.push(new Pickup(x, y, type));
    }

    function initPickups() {
        world.pickups = [];
        const count = difficulty === 'hard' ? 4 : 6;
        for (let i=0; i<count; i++) spawnPickup();
    }
    function schedulePickup() {
        const interval = difficulty === 'hard' ? 12000 : 7000;
        if (world.pickupTimer <= 0) {
            spawnPickup();
            world.pickupTimer = interval / 16.67;
        } else {
            world.pickupTimer--;
        }
    }

    class StatusEffect {
        constructor(id, duration, { onTick, onApply, onExpire, vfxColor, freeze, slowFactor, tickInterval, tickDamage, tickParticle }) {
            this.id = id;
            this.duration = duration;
            this.timer = duration;
            this.onTick = onTick || null;
            this.onApply = onApply || null;
            this.onExpire = onExpire || null;
            this.vfxColor = vfxColor || null;
            this.freeze = !!freeze;
            this.slowFactor = slowFactor || 1;
            this.tickInterval = tickInterval || 60;
            this.tickDamage = tickDamage || 0;
            this.tickParticle = tickParticle || null;
            this._ticksSinceLast = 0;
        }
        update(target) {
            this.timer--;
            if (this.timer <= 0) {
                if (this.onExpire) this.onExpire(target);
                return false;
            }
            if (this.tickDamage > 0) {
                this._ticksSinceLast++;
                if (this._ticksSinceLast >= this.tickInterval) {
                    this._ticksSinceLast = 0;
                    if (this.onTick) this.onTick(target);
                }
            }
            return true;
        }
    }

    const STATUS_EFFECTS = {
        burn: {
            id: 'burn', duration: 180, vfxColor: '#ff0000',
            tickDamage: 0.5, tickInterval: 60,
            onTick: (target) => {
                if (target.hp <= 0) return;
                target.hp = Math.max(0, target.hp - 0.5);
                target.damageFlash = 10;
                emitParticles(target.x + target.w/2, target.y + target.h/2, 10, '#ff4444', 2, 4, 'circle', 0.5);
                updateHUD();
            }
        },
        slow: {
            id: 'slow', duration: 180, vfxColor: '#0088ff', slowFactor: 0.8
        },
        frozen: {
            id: 'frozen', duration: 240, vfxColor: '#ffffff', freeze: true,
            onApply: (target) => {
                target.iceHitCount = 0;
                emitParticles(target.x + target.w/2, target.y + target.h/2, 40, '#88ddff', 6, 8, 'star', 1.5);
            },
            onExpire: (target) => { target.iceHitCount = 0; }
        },
        gravity_debuff: {
            id: 'gravity_debuff', duration: 120, vfxColor: '#aa88ff',
            onApply: (target) => {
                target.gravityDebuff = true;
                target.jumpReduction = 0.8;
            },
            onExpire: (target) => {
                target.gravityDebuff = false;
                target.jumpReduction = 1;
            }
        }
    };

    const AI_PRESETS = {
        easy:   { react: 600, aggro: 0.3, dodge: 0.1,  skillRate: 0.15, moveSpeed: 0.75, jumpRate: 0,   label: 'easy' },
        medium: { react: 350, aggro: 0.5, dodge: 0.25, skillRate: 0.3,  moveSpeed: 0.9, jumpRate: 0.02, label: 'medium' },
        hard:   { react: 120, aggro: 0.8, dodge: 0.4,  skillRate: 0.6,  moveSpeed: 1.1, jumpRate: 0.05, label: 'hard' },
    };

    const PICKUP_DEFS = {
        energy:   { weight: 0.5, hardWeight: 0.5, color: '#00aaff', symbol: '\u26A1',
            effect: (t) => { t.energy = Math.min(t.maxEnergy, t.energy + 20); }
        },
        health:   { weight: 0.3, hardWeight: 0.3, color: '#44ff44', symbol: '\u2764\uFE0F',
            effect: (t) => { t.hp = Math.min(t.maxHp, t.hp + 20); }
        },
        attack:   { weight: 0.1, hardWeight: 0.1,  color: '#ff4444', symbol: '\u2694\uFE0F',
            effect: (t) => { t.attackBoost = 10; t.boostTimer = 180; }
        },
        cooldown: { weight: 0.1, hardWeight: 0.1,  color: '#ffdd00', symbol: '\uD83D\uDD04',
            effect: (t) => {
                const skillKeys = ['skill1', 'skill2', 'ult'];
                const key = skillKeys[Math.floor(Math.random() * skillKeys.length)];
                const skill = t.getSkill(key);
                if (skill) skill.cd = 0;
                // 角色钩子：拾取效果增强
                const tConfig = CHAR_CONFIGS[t.charId];
                if (tConfig && tConfig.hooks && tConfig.hooks.onPickup) tConfig.hooks.onPickup(t, item.type);
            }
        },
    };

    const ANIM_STATES = [
    { condition: (f) => f.isCastingUlt, key: 'ult' },
    { condition: (f) => f.dashing, key: 'charge' },
    { condition: (f) => f.attacking || f.chargingAttack, key: 'attack' },
    { condition: (f) => !f.grounded, key: 'jump' },
    { condition: (f) => f.state === 'walk', key: 'walk' },
];

    const ANIM_DEFAULT_KEY = 'idle';

    const CHAR_CONFIGS = {};

