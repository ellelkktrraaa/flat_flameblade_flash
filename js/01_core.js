    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const W=800, H=450;
    canvas.width=W; canvas.height=H;

    const playerHealthBar = document.getElementById('playerHealth');
    const enemyHealthBar = document.getElementById('enemyHealth');
    const playerHealthText = document.getElementById('playerHealthText');
    const enemyHealthText = document.getElementById('enemyHealthText');
    const energyFill = document.getElementById('energyFill');
    const energyText = document.getElementById('energyText');
    const energyBar = document.getElementById('energy-bar');
    const arrowText = document.getElementById('arrowText');
    const menuOverlay = document.getElementById('menu-overlay');
    const menuMain = document.getElementById('menu-main');
    const menuDifficulty = document.getElementById('menu-difficulty');
    const menuPvp = document.getElementById('menu-pvp');
    const difficultyBackBtn = document.getElementById('difficultyBackBtn');
    const charSelect = document.getElementById('char-select');
    const charGrid = document.getElementById('charGrid');
    const resultDiv = document.getElementById('result-message');
    const resultText = document.getElementById('resultText');
    const resultSub = document.getElementById('resultSub');
    const btnAttack = document.getElementById('btnAttack');
    const btnSkill1 = document.getElementById('btnSkill1');
    const btnSkill2 = document.getElementById('btnSkill2');
    const btnUlt = document.getElementById('btnUlt');
    const charStartBtn = document.getElementById('charStartBtn');
    const restartBtn = document.getElementById('restartBtn');
    const menuBtn = document.getElementById('menuBtn');
    const pokedexBtn = document.getElementById('pokedexBtn');
    const pokedexOverlay = document.getElementById('pokedex-overlay');
    const pokedexCloseBtn = document.getElementById('pokedexCloseBtn');
    const dexList = document.getElementById('dexList');
    const dexDetail = document.getElementById('dexDetail');
    const dexDetailContent = document.getElementById('dexDetailContent');
    const dexBackBtn = document.getElementById('dexBackBtn');

    const MAP_W = 2400;
    const GROUND_Y = 380;
    const GRAVITY = 0.22;
    const JUMP_SPEED = -10;
    const FRICTION = 0.88;

    function loadImage(src) {
        const img = new Image();

        // 线上资源加载失败时，自动回退到本地文件
        if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
            img.onerror = function() {
                const filename = src.split('/').pop().split('?')[0];
                // 线上失败时回退到本地 assets 目录
                img.src = 'assets/' + filename;
                img.onerror = null; // 避免无限循环
            };
        }

        img.src = src;
        return img;
    }

    const IMG = {};
    IMG.knight_idle = loadImage("assets/IMG-20260702-005046.png"); // 原url: https://i.ibb.co/TD8HK55C/IMG-20260702-005046.png
    IMG.knight_attack = loadImage("assets/IMG-20260702-010935.png"); // 原url: https://i.ibb.co/1GJDfDmn/IMG-20260702-010935.png
    IMG.knight_jump = loadImage("assets/IMG-20260702-005057.png"); // 原url: https://i.ibb.co/1JphGpJv/IMG-20260702-005057.png
    IMG.knight_walk = IMG.knight_idle;
    IMG.knight_ult = loadImage("assets/IMG-20260702-005138.png"); // 原url: https://i.ibb.co/SX6pnqwk/IMG-20260702-005138.png
    IMG.projectile_knight = loadImage("assets/IMG-20260702-011106.png"); // 原url: https://i.ibb.co/TDrCLcDs/IMG-20260702-011106.png
    IMG.mage_idle = loadImage("assets/5-20260702144646.png"); // 原url: https://i.ibb.co/b5fGHtFr/5-20260702144646.png
    IMG.mage_walk = IMG.mage_idle;
    IMG.mage_jump = loadImage("assets/7-20260702145928.png"); // 原url: https://i.ibb.co/ycsPVPXV/7-20260702145928.png
    IMG.mage_attack = loadImage("assets/12-20260702212001.png"); // 原url: https://i.ibb.co/KpMt9p2Z/12-20260702212001.png
    IMG.mage_ult = loadImage("assets/11-20260702203319.png"); // 原url: https://i.ibb.co/HD9yfbv0/11-20260702203319.png
    IMG.projectile_fire = loadImage("assets/8-20260702202047.png"); // 原url: https://i.ibb.co/VWjn8Vmp/8-20260702202047.png
    IMG.projectile_ice = loadImage("assets/9-20260702202554.png"); // 原url: https://i.ibb.co/fVxcdgd4/9-20260702202554.png
    IMG.projectile_light = loadImage("assets/10-20260702202815.png"); // 原url: https://i.ibb.co/b59wDY2g/10-20260702202815.png
    IMG.archer_idle = loadImage("assets/13-20260703003612.png"); // 原url: https://i.ibb.co/CsQvDZ6C/13-20260703003612.png
    IMG.archer_jump = loadImage("assets/14-20260703142221.png"); // 原url: https://i.ibb.co/35yXPHCL/14-20260703142221.png
    IMG.archer_attack = loadImage("assets/15-20260703142258.png"); // 原url: https://i.ibb.co/XTRgygw/15-20260703142258.png
    IMG.archer_walk = IMG.archer_idle;
    IMG.projectile_arrow = loadImage("assets/16-20260703142620.png"); // 原url: https://i.ibb.co/mVGHtSfw/16-20260703142620.png
    IMG.projectile_arrow_fire = loadImage("assets/18-20260703142934.png"); // 原url: https://i.ibb.co/MxB08WrY/18-20260703142934.png
    IMG.flame = loadImage("assets/17-20260703142847.png"); // 原url: https://i.ibb.co/MkJrpfNj/17-20260703142847.png
    IMG.projectile_arrow_ult = loadImage("assets/IMG-20260703-143031.png"); // 原url: https://i.ibb.co/TM4TZSqy/IMG-20260703-143031.png
    IMG.projectile_arrow_ult_fire = loadImage("assets/IMG-20260703-143038.png"); // 原url: https://i.ibb.co/5XbNXR2G/IMG-20260703-143038.png
    IMG.paladin_idle = loadImage("assets/IMG-20260704-155855.png"); // 原url: https://i.ibb.co/spnW8YnS/IMG-20260704-155855.png
    IMG.paladin_walk = loadImage("assets/IMG-20260704-155904.png"); // 原url: https://i.ibb.co/NnCXtV2m/IMG-20260704-155904.png
    IMG.paladin_jump = loadImage("assets/IMG-20260704-155900.png"); // 原url: https://i.ibb.co/21W9cWs2/IMG-20260704-155900.png
    IMG.paladin_attack = loadImage("assets/IMG-20260704-155909.png"); // 原url: https://i.ibb.co/Q70PhzKQ/IMG-20260704-155909.png
    IMG.paladin_charge = loadImage("assets/IMG-20260704-155913.png"); // 原url: https://i.ibb.co/GfyHwTsz/IMG-20260704-155913.png
    IMG.paladin_ult = IMG.paladin_attack;
    IMG.background = loadImage("assets/801215d83f224786b0f0b4c37c2571d9.png"); // 原url: https://i.ibb.co/NdnxS38k/801215d83f224786b0f0b4c37c2571d9.png
    IMG.shield = loadImage("assets/shield-11-20260702203319.png"); // 原url: https://i.ibb.co/BVZWP9Zv/11-20260702203319.png

    // ---- 魔女贴图 ----
    IMG.witch_idle = loadImage("assets/40-20260705223746.png"); // 原url: https://i.ibb.co/Z18mvDDF/40-20260705223746.png
    IMG.witch_walk = loadImage("assets/43-20260705224001.png"); // 原url: https://i.ibb.co/9HwfD2pF/43-20260705224001.png
    IMG.witch_attack = loadImage("assets/42-20260705223935.png"); // 原url: https://i.ibb.co/FbjVTdy9/42-20260705223935.png
    IMG.witch_jump = loadImage("assets/41-20260705223805.png"); // 原url: https://i.ibb.co/qY7V9tt5/41-20260705223805.png
    IMG.witch_ult = loadImage("assets/44-20260705224021.png"); // 原url: https://i.ibb.co/Gv1YbjpF/44-20260705224021.png
    IMG.projectile_gravity = loadImage("assets/45-20260705224120.png"); // 原url: https://i.ibb.co/LDVLxfR0/45-20260705224120.png
    IMG.meteor = loadImage("assets/46-20260705224210.png"); // 原url: https://i.ibb.co/35xQJVZz/46-20260705224210.png
    IMG.meteor_explosion = loadImage("assets/49-20260705224953.png"); // 原url: https://i.ibb.co/M59ryVHk/49-20260705224953.png
    IMG.vortex = loadImage("assets/47-20260705224456.png"); // 原url: https://i.ibb.co/4vbGdm1/47-20260705224456.png
    IMG.tornado = loadImage("assets/50-20260705225200.png"); // 原url: https://i.ibb.co/zhCKYZDT/50-20260705225200.png

    // ---- 刺客贴图 ----
    IMG.slash = loadImage("assets/53.png"); // 原url: https://i.ibb.co/JFFYY90D/53.png
    IMG.skill2Slash = loadImage("assets/54.png"); // 原url: https://i.ibb.co/cKjCzDr4/54.png

    // ===== 帧动画类：由帧序列 + 每帧播放时长构成，基于真实时间驱动 =====
    // 用真实时间(Date.now)推进，独立于逻辑帧率，慢放/联机下都能正常播放
    class Animation {
        constructor(frames, frameDuration = 100, loop = true) {
            this.frames = frames || [];        // 帧序列（Image 数组）
            this.frameDuration = frameDuration; // 每帧播放时长(ms)
            this.loop = loop;                   // 是否循环
            this.playing = false;
            this.startTime = 0;
        }
        play() {
            if (this.playing) return;
            this.playing = true;
            this.startTime = Date.now();
        }
        stop() { this.playing = false; }
        // 返回当前应显示的帧图像；未播放或无帧时返回 null
        currentFrame() {
            if (!this.playing || this.frames.length === 0) return null;
            const elapsed = Date.now() - this.startTime;
            let idx = Math.floor(elapsed / this.frameDuration);
            if (this.loop) {
                idx = ((idx % this.frames.length) + this.frames.length) % this.frames.length;
            } else if (idx >= this.frames.length) {
                idx = this.frames.length - 1;
            }
            return this.frames[idx];
        }
    }

    // 刺客大招「天地灭尽」全屏动画：assassin_u/0.jpg ~ 13.jpg，共 14 帧
    // 大招持续 3 秒(3000ms)，14 帧均分 → 每帧约 214ms
    // 角色钩子：初始化资源
    const assassinUltFrames = [];
    const assassinUltAnim = new Animation(assassinUltFrames, 214, true);

    let gameRunning = false;
    let gameOver = false;
    let difficulty = 'medium';
    let frame = 0;
    let hitStop = 0;
    // ===== 时间缓速（全局慢动作特写）=====
    let slowMoTimer = 0;       // 剩余真实帧数，>0 时处于慢放
    let slowMoTick = 0;        // 跳帧计数器
    const SLOW_FACTOR = 3;     // 慢放倍率：每 SLOW_FACTOR 真实帧才执行 1 次逻辑更新
    const SLOW_DURATION = 90;  // 单次触发的慢放时长（真实帧）
    const SLOW_MAX = 300;      // 叠加时长上限，防止过久

    // ===== GameWorld 容器：把全局可变状态收进一个轻量容器 =====
    const world = {
        entities: [],
        projectiles: [],
        particles: [],
        pickups: [],
        flameZones: [],
        explosionEffects: [],
        tornadoes: [],
        vortexes: [],
        camera: { x: 0 },
        audioCtx: null,
        platforms: [],
        pickupTimer: 0
    };

    let player, enemy;
    function getOpponent(fighter) { return (fighter === player) ? enemy : player; }
    let selectedCharId = 'knight';

    const keys = { left:false, right:false, up:false, down:false, attack:false, skill1:false, skill2:false, ult:false };

    // 键盘 → 按钮映射：键盘按下/松开直接模拟对应按钮的鼠标事件
    const keyBtnMap = {
        'KeyA': 'btnLeft',      'ArrowLeft':  'btnLeft',
        'KeyD': 'btnRight',     'ArrowRight': 'btnRight',
        'KeyW': 'btnJump',      'ArrowUp':    'btnJump',      'KeyK': 'btnJump',
        'KeyJ': 'btnAttack',
        'KeyU': 'btnSkill1',
        'KeyI': 'btnSkill2',
        'KeyO': 'btnUlt',
    };

    document.addEventListener("keydown", (event) => {
        const btnId = keyBtnMap[event.code];
        if (!btnId) return;
        event.preventDefault();
        const btn = document.getElementById(btnId);
        if (btn) btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    document.addEventListener("keyup", (event) => {
        const btnId = keyBtnMap[event.code];
        if (!btnId) return;
        event.preventDefault();
        const btn = document.getElementById(btnId);
        if (btn) btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // ==================== PvP WebRTC (权威主机架构) ====================
    let gameMode = 'pve';       // 'pve' | 'pvp'
    let isHost = false;         // 主机=创建房间的人，运行完整模拟；客机=只渲染
    let peerConnection = null;
    let dataChannel = null;
    let pvpConnected = false;
    let pvpIceReady = false;
    let pvpGameStarted = false;
    let pvpMyCharId = null;        // 我选的
    let pvpYourCharId = null;      // 对方选的
    let remoteKeys = { left:false, right:false, up:false, attack:false, skill1:false, skill2:false, ult:false };
    let pvpRingBuf = [];            // 客机环形缓冲：[{frame, snap}, ...] 最多2帧
    let pvpInterpT = 0;            // 插值进度 0..1，每帧递增
    const PVP_SEND_INTERVAL = 3;   // 主机每N帧发一次
    const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    // MQTT 信令服务器配置
    const MQTT_BROKER = 'wss://broker.emqx.io:8084/mqtt';
    let mqttClient = null;
    let pvpRoomCode = null;

