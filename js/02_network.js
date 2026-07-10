    function safeBtoa(str) { return btoa(unescape(encodeURIComponent(str))); }
    function safeAtob(str) { return decodeURIComponent(escape(atob(str))); }

    function setPvPStatus(msg, ok) {
        const el = document.getElementById('pvpStatus');
        if (el) { el.textContent = msg; el.className = 'pvp-status' + (ok ? ' connected' : ''); }
    }

    // ---------- MQTT 信令 ----------
    function generateRoomCode() {
        return String(Math.floor(10000 + Math.random() * 90000));
    }

    function connectMQTT(roomCode) {
        return new Promise((resolve, reject) => {
            if (mqttClient) { try { mqttClient.end(true); } catch(e) {} }
            const clientId = 'pvp_' + Math.random().toString(36).substr(2, 8);
            mqttClient = mqtt.connect(MQTT_BROKER, { clientId: clientId, clean: true, connectTimeout: 10000, reconnectPeriod: 0 });
            let settled = false;
            mqttClient.on('connect', () => {
                if (settled) return;
                const topicOffer = 'flameblade/' + roomCode + '/offer';
                const topicAnswer = 'flameblade/' + roomCode + '/answer';
                const topicIce = 'flameblade/' + roomCode + '/ice';
                const topicJoined = 'flameblade/' + roomCode + '/joined';
                mqttClient.subscribe([topicOffer, topicAnswer, topicIce, topicJoined], (err) => {
                    if (settled) return;
                    if (err) { settled = true; reject(err); return; }
                    settled = true; resolve();
                });
            });
            mqttClient.on('message', (topic, payload) => {
                try {
                    const msg = JSON.parse(payload.toString());
                    handleMqttMessage(topic, msg);
                } catch(e) {}
            });
            mqttClient.on('error', (err) => {
                if (settled) return;
                settled = true; reject(err);
            });
            setTimeout(() => { if (!settled) { settled = true; reject(new Error('连接信令超时')); } }, 15000);
        });
    }

    function handleMqttMessage(topic, msg) {
        if (!pvpRoomCode) return;
        const baseTopic = 'flameblade/' + pvpRoomCode + '/';
        if (topic === baseTopic + 'offer' && !isHost) {
            handleRemoteOffer(msg);
        } else if (topic === baseTopic + 'answer' && isHost) {
            handleRemoteAnswer(msg);
        } else if (topic === baseTopic + 'ice') {
            handleRemoteIce(msg);
        } else if (topic === baseTopic + 'joined' && isHost) {
            // 有客人加入，只需更新状态（offer已通过retain机制自动送达）
            setPvPStatus('对方已加入，正在建立连接...');
        }
    }

    // ---------- 连接建立 ----------
    function setupConnectionListeners(pc) {
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                sendMqttMsg('ice', { candidate: e.candidate });
            } else {
                pvpIceReady = true;
                const sdpMsg = safeBtoa(JSON.stringify(pc.localDescription));
                if (isHost) {
                    sendMqttMsg('offer', { sdp: sdpMsg }, { retain: true });
                    setPvPStatus('等待对方加入...');
                } else {
                    sendMqttMsg('answer', { sdp: sdpMsg });
                    setPvPStatus('已回复，等待连接...');
                }
            }
        };
        pc.oniceconnectionstatechange = () => {
            const st = pc.iceConnectionState;
            if (st === 'connected' || st === 'completed') setPvPStatus('网络已连通！等待数据通道...');
            else if (st === 'failed') setPvPStatus('连接失败，请返回重试');
            else if (st === 'disconnected') setPvPStatus('连接断开，正在尝试重连...');
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') setPvPStatus('连接失败，请返回重试');
        };
    }

    function setupDataChannelHandlers(ch) {
        ch.onopen = () => {
            pvpConnected = true;
            setPvPStatus('已连接！开始角色选择...', true);
            setTimeout(() => { goToPvPCharSelect(); }, 600);
        };
        ch.onmessage = (e) => { handlePvPMessage(e.data); };
        ch.onclose = () => { pvpConnected = false; };
        ch.onerror = () => { setPvPStatus('数据通道出错，请重试'); };
    }

    function sendMqttMsg(type, data, opts) {
        if (!mqttClient || !mqttClient.connected || !pvpRoomCode) return;
        const topic = 'flameblade/' + pvpRoomCode + '/' + type;
        try { mqttClient.publish(topic, JSON.stringify(data), opts || {}); } catch(e) {}
    }

    async function handleRemoteOffer(msg) {
        // 防重复：如果已经有连接在谈判中，忽略重复offer
        if (peerConnection && (peerConnection.signalingState === 'have-local-offer' || peerConnection.signalingState === 'stable')) return;
        try {
            const offer = JSON.parse(safeAtob(msg.sdp));
            if (peerConnection) { try { peerConnection.close(); } catch(e) {} }
            peerConnection = new RTCPeerConnection(rtcConfig);
            setupConnectionListeners(peerConnection);
            peerConnection.ondatachannel = (e) => { dataChannel = e.channel; setupDataChannelHandlers(dataChannel); };
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            setPvPStatus('正在建立连接...');
        } catch(e) { setPvPStatus('解析房间失败，请重试'); }
    }

    async function handleRemoteAnswer(msg) {
        // 防重复：如果已经收到过answer，忽略后续的
        if (peerConnection && peerConnection.signalingState === 'stable') return;
        try {
            const answer = JSON.parse(safeAtob(msg.sdp));
            if (!peerConnection) return;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            setPvPStatus('正在建立点对点连接...');
        } catch(e) { setPvPStatus('回复格式错误，请重试'); }
    }

    async function handleRemoteIce(msg) {
        if (!peerConnection) return;
        try { await peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch(e) {}
    }

    async function pvpCreateRoom() {
        if (!window.RTCPeerConnection) { setPvPStatus('浏览器不支持WebRTC，请换用Chrome/Edge'); return; }
        setPvPStatus('正在创建房间...');
        document.getElementById('pvpCreateArea').style.display = 'flex';
        document.getElementById('pvpJoinArea').style.display = 'none';
        isHost = true; pvpIceReady = false; pvpGameStarted = false;
        pvpRoomCode = generateRoomCode();
        document.getElementById('pvpRoomCodeDisplay').textContent = pvpRoomCode;

        try { await connectMQTT(pvpRoomCode); }
        catch(e) { setPvPStatus('创建房间失败: ' + (e.message || '未知')); return; }

        setPvPStatus('信令已连接，等待对方加入...');
        if (peerConnection) { try { peerConnection.close(); } catch(e) {} }
        peerConnection = new RTCPeerConnection(rtcConfig);
        setupConnectionListeners(peerConnection);
        dataChannel = peerConnection.createDataChannel('game', { ordered: true });
        setupDataChannelHandlers(dataChannel);

        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
        } catch(e) { setPvPStatus('创建房间失败: ' + (e.message || '未知')); }
    }

    async function pvpJoinRoom() {
        if (!window.RTCPeerConnection) { setPvPStatus('浏览器不支持WebRTC，请换用Chrome/Edge'); return; }
        const code = document.getElementById('pvpRoomCodeInput').value.trim();
        if (!code || code.length !== 5 || !/^\d{5}$/.test(code)) {
            setPvPStatus('请输入5位数字的房间代码！'); return;
        }
        setPvPStatus('正在加入房间...');
        isHost = false; pvpIceReady = false; pvpGameStarted = false;
        pvpRoomCode = code;

        try { await connectMQTT(pvpRoomCode); }
        catch(e) { setPvPStatus('加入房间失败: ' + (e.message || '未知')); return; }

        setPvPStatus('已加入房间，等待主机...');
        // 通知房主有人加入
        sendMqttMsg('joined', { ts: Date.now() });
    }

    function copyRoomCode() {
        const el = document.getElementById('pvpRoomCodeDisplay');
        const code = el ? el.textContent : '';
        if (!code || code === '-----') return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                setPvPStatus('房间代码已复制！发送给对方吧', true);
            }).catch(() => { setPvPStatus('复制失败，请手动记住代码'); });
        } else {
            const ta = document.createElement('textarea');
            ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); setPvPStatus('房间代码已复制！发送给对方吧', true); }
            catch(e) { setPvPStatus('复制失败，请手动记住代码'); }
            document.body.removeChild(ta);
        }
    }

    function goToPvPCharSelect() {
        menuOverlay.style.display = 'none';
        menuPvp.style.display = 'none';
        charSelect.style.display = 'flex';
        initCharSelect();
        gameMode = 'pvp';
    }

    // ---------- PvP 消息协议 ----------
    function sendPvPMsg(obj) {
        if (!pvpConnected || !dataChannel || dataChannel.readyState !== 'open') return;
        try { dataChannel.send(JSON.stringify(obj)); } catch(e) {}
    }

    function handlePvPMessage(raw) {
        try {
            const msg = JSON.parse(raw);
            switch (msg.type) {
                case 'input':
                    remoteKeys = msg.keys;
                    break;
                case 'ready': {
                    pvpYourCharId = msg.charId;
                    // 双方谁后点"开始战斗"谁触发——
                    // 如果我是主机：我和对方的角色都到了 → 开打
                    // 如果我是客机：只记录，等主机的 start 消息
                    if (isHost && pvpMyCharId && pvpYourCharId) tryStartPvPGame();
                    break;
                }
                case 'start': {
                    if (!isHost) {
                        pvpMyCharId = msg.guestChar;
                        pvpYourCharId = msg.hostChar;
                        pvpGameStarted = true;
                        charSelect.style.display = 'none';
                        initGame(pvpMyCharId, pvpYourCharId);
                    }
                    break;
                }
                case 'state': {
                    // 客机：存入环形缓冲
                    const s = msg;
                    if (s.hp && s.gp) {
                        // 去重：只接受更新的帧
                        const last = pvpRingBuf[pvpRingBuf.length - 1];
                        if (!last || s.frame > last.frame) {
                            pvpRingBuf.push({ frame: s.frame, snap: s });
                            // 保持最多2帧（cur/next）
                            while (pvpRingBuf.length > 2) pvpRingBuf.shift();
                            // 新帧到达 → 插值从0重新开始
                            if (pvpRingBuf.length === 2) pvpInterpT = 0;
                        }
                    }
                    break;
                }
                case 'restart': {
                    // 客机请求重开（也隐含确认收到了结算）
                    if (isHost && pvpGameStarted) {
                        pvpGameOverAcked = true;
                        initGame(pvpMyCharId, pvpYourCharId);
                        sendPvPMsg({ type: 'start', hostChar: pvpMyCharId, guestChar: pvpYourCharId });
                    }
                    break;
                }
                case 'result_ack': {
                    // 主机：客机确认收到结算 → 停止重发
                    if (isHost) pvpGameOverAcked = true;
                    break;
                }
            }
        } catch(e) {}
    }

    function tryStartPvPGame() {
        if (!isHost || !pvpMyCharId || !pvpYourCharId) return;
        pvpGameStarted = true;
        charSelect.style.display = 'none';
        initGame(pvpMyCharId, pvpYourCharId);  // 主机: player=自己, enemy=客机
        sendPvPMsg({ type: 'start', hostChar: pvpMyCharId, guestChar: pvpYourCharId });
    }

    // ---------- 状态快照 ----------
function fighterState(f) {
    if (!f) return null;
    return {
        x: f.x, y: f.y, vx: f.vx, vy: f.vy,
        hp: f.hp, eng: f.energy,
        f: f.facing, s: f.state, c: f.charId,
        d: f.damageFlash, bl: f.blocking, sh: f.shieldActive,
        ds: f.divineShieldActive, he: f.holyEmpowerActive,
        dash: f.dashing, dd: f.dashDir,
        ch: f.charging, ca: f.chargingAttack, cs: f.chargingSkill1,
        fb: f.fireArrowBuff, tb: f.trackingBuff,
        ar: f.arrows || 0,
        sk1: (f.getSkill('skill1')||{}).cd || 0,
        sk2: (f.getSkill('skill2')||{}).cd || 0,
        ult: (f.getSkill('ult')||{}).cd || 0,
        st: f.statuses.filter(s=>s.timer>0).map(s=>({id:s.id,t:s.timer})),
        gr: f.grounded,
        isCastingUlt: f.isCastingUlt,   // ← 新增此行
        ua: f.ultActive                 // 大招激活（供全屏动画同步）
    };
}

    function snapshotProjectiles() {
        return world.projectiles.map(p => ({
            x:p.x, y:p.y, vx:p.vx, vy:p.vy, w:p.w, h:p.h,
            t:p.type, c:p.color, dmg:p.damage,
            o:(p.owner===player?'p':'e'),
            f:p.isFire||false, tr:p.tracking||false, rf:p.reflected||false,
            l:p.life
        }));
    }

    function snapshotPickups() {
        return world.pickups.filter(p=>p.active).map(p => ({x:p.x, y:p.y, t:p.type, a:p.active}));
    }

    function snapshotFlameZones() {
        return world.flameZones.map(fz => ({x:fz.x, y:fz.y, w:fz.w, h:fz.h, l:fz.life}));
    }

    function makeStateSnapshot() {
        return {
            type: 'state',
            frame: frame,
            hp: fighterState(player),    // host = 主机自己
            gp: fighterState(enemy),     // guest = 客机
            pr: snapshotProjectiles(),
            pk: snapshotPickups(),
            fz: snapshotFlameZones(),
            go: gameOver,
            w: player.hp<=0 ? 'guest' : (enemy.hp<=0 ? 'host' : null)
        };
    }

function applyFighterState(f, s) {
    if (!s || !f) return;
    f.x = s.x; f.y = s.y; f.vx = s.vx; f.vy = s.vy;
    f.hp = s.hp; f.energy = s.eng;
    f.facing = s.f; f.state = s.s;
    f.damageFlash = s.d; f.blocking = s.bl; f.shieldActive = s.sh;
    f.divineShieldActive = s.ds; f.holyEmpowerActive = s.he;
    f.dashing = s.dash; f.dashDir = s.dd;
    f.charging = s.ch; f.chargingAttack = s.ca; f.chargingSkill1 = s.cs;
    f.fireArrowBuff = s.fb; f.trackingBuff = s.tb;
    f.arrows = (s.ar != null) ? s.ar : f.arrows;
    f.grounded = (s.gr != null) ? s.gr : f.grounded;
    f.hp = Math.max(0, Math.min(f.maxHp, f.hp));
    // --- 新增 ↓ ---
    f.isCastingUlt = s.isCastingUlt || false;
    f.ultActive = s.ua || false;   // 大招激活（供全屏动画同步）
    // --- 新增 ↑ ---
    const sk1 = f.getSkill('skill1'); if (sk1) sk1.cd = s.sk1;
    const sk2 = f.getSkill('skill2'); if (sk2) sk2.cd = s.sk2;
    const ult = f.getSkill('ult'); if (ult) ult.cd = s.ult;
    f.statuses = [];
    if (s.st) for (let st of s.st) { f.addStatus(st.id); }
}

    function applyStateSnapshot(snap) {
        if (!snap || !snap.hp || !snap.gp) return;
        // 客机：hp=主机(敌)，gp=客机自己(我)
        applyFighterState(player, snap.gp);
        applyFighterState(enemy, snap.hp);
        
        world.particles = [];

        world.projectiles = [];
        if (snap.pr) for (let p of snap.pr) {
            const owner = (p.o === 'p') ? (isHost ? player : enemy) : (isHost ? enemy : player);
            let img = IMG.projectile_arrow;
            if (p.t === 'mage_fire') img = IMG.projectile_fire;
            else if (p.t === 'mage_light') img = IMG.projectile_light;
            else if (p.t === 'mage_ice') img = IMG.projectile_ice;
            else if (p.t === 'arrow' && p.f) img = IMG.projectile_arrow_fire;
            world.projectiles.push({
                x:p.x, y:p.y, vx:p.vx, vy:p.vy, w:p.w, h:p.h,
                type:p.t, color:p.c, damage:p.dmg,
                owner:owner, reflected:p.rf||false, img:img,
                isFire:p.f||false, tracking:p.tr||false,
                trackingTarget:(p.tr ? enemy : null),
                life:p.l, burn:(p.t==='mage_fire')
            });
        }

        // 掉落物
        world.pickups = [];
        if (snap.pk) for (let pk of snap.pk) {
            const def = PICKUP_DEFS[pk.t];
            world.pickups.push({
                x:pk.x, y:pk.y, w:24, h:24, type:pk.t, active:pk.a,
                color:def?def.color:'#fff', glow:0,
                update() { this.glow += 0.05; },
                draw(ctx) {
                    const pulse = 1 + 0.1 * Math.sin(this.glow);
                    ctx.save(); ctx.translate(this.x, this.y); ctx.scale(pulse, pulse);
                    ctx.fillStyle = this.color;
                    ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill();
                    ctx.restore();
                }
            });
        }

        // 火焰区域
        world.flameZones = [];
        if (snap.fz) for (let fz of snap.fz) {
            world.flameZones.push({ x:fz.x, y:fz.y, w:fz.w, h:fz.h, life:fz.l, timer:0,
                damage:2, owner:enemy, tickInterval:60 });
        }

        // 游戏结束
        if (snap.go && !gameOver) {
            gameOver = true;
            gameRunning = false;
            if (snap.w === 'host') showResult('💀 战败', '对手获得了胜利!');
            else if (snap.w === 'guest') showResult('🏆 胜利!', '你击败了对手!');
            // 客机收到结算 → 回确认给主机
            sendPvPMsg({ type: 'result_ack' });
        }

        updateHUD(); updateSkillButtons();
    }

    // ---------- 环形缓冲消费（客机每帧调用）----------
    function pvpConsumeRingBuf() {
        if (pvpRingBuf.length === 0) return; // 空缓冲 → yield

        if (pvpRingBuf.length === 1) {
            // 只有一帧 → 直接渲染
            applyStateSnapshot(pvpRingBuf[0].snap);
            return;
        }

        // 2帧 → cur..next 之间做插值
        const cur = pvpRingBuf[0].snap;
        const next = pvpRingBuf[1].snap;

        if (pvpInterpT >= 1.0) {
            // 已经插到头 → 等待新帧到达
            applyStateSnapshot(next);
            return;
        }

        // 插值渲染当前t
        applyStateSnapshotLerp(cur, next, pvpInterpT);

        // t步进：一共PVP_SEND_INTERVAL帧的间隙，分成更多步
        const step = 1.0 / PVP_SEND_INTERVAL;
        pvpInterpT += step;
        if (pvpInterpT >= 1.0) {
            // 插到头 → 移除旧帧，保留next作为新的cur
            pvpRingBuf.shift();
            pvpInterpT = 1.0; // 保持顶头，等新帧来重置
        }
    }

    function applyStateSnapshotLerp(cur, next, t) {
        if (!cur || !next || !cur.hp || !cur.gp || !next.hp || !next.gp) {
            applyStateSnapshot(cur || next);
            return;
        }
        // fighter 坐标/速度做插值，其余用 next（较新的）
        applyFighterLerp(player, cur.gp, next.gp, t);
        applyFighterLerp(enemy, cur.hp, next.hp, t);
        player.hp = next.gp.hp;
        enemy.hp = next.hp.hp;
        player.energy = next.gp.eng;
        enemy.energy = next.hp.eng;

        // 投射物/掉落/火焰用最新帧
        applyRestFromSnap(next);

        // 游戏结束
        if (next.go && !gameOver) {
            gameOver = true; gameRunning = false;
            if (next.w === 'host') showResult('💀 战败', '对手获得了胜利!');
            else if (next.w === 'guest') showResult('🏆 胜利!', '你击败了对手!');
            sendPvPMsg({ type: 'result_ack' });
        }
        updateHUD(); updateSkillButtons();
    }

    function applyFighterLerp(f, a, b, t) {
    f.x = a.x + (b.x - a.x) * t;
    f.y = a.y + (b.y - a.y) * t;
    f.vx = a.vx + (b.vx - a.vx) * t;
    f.vy = a.vy + (b.vy - a.vy) * t;
    f.facing = b.f; f.state = b.s;
    f.damageFlash = b.d; f.blocking = b.bl; f.shieldActive = b.sh;
    f.divineShieldActive = b.ds; f.holyEmpowerActive = b.he;
    f.dashing = b.dash; f.dashDir = b.dd;
    f.charging = b.ch; f.chargingAttack = b.ca; f.chargingSkill1 = b.cs;
    f.fireArrowBuff = b.fb; f.trackingBuff = b.tb;
    f.arrows = (b.ar != null) ? b.ar : f.arrows;
    f.grounded = (b.gr != null) ? b.gr : f.grounded;
    f.hp = Math.max(0, Math.min(f.maxHp, b.hp));
    // --- 新增 ↓ ---
    f.isCastingUlt = b.isCastingUlt || false;
    // --- 新增 ↑ ---
    const sk1 = f.getSkill('skill1'); if (sk1) sk1.cd = b.sk1;
    const sk2 = f.getSkill('skill2'); if (sk2) sk2.cd = b.sk2;
    const ult = f.getSkill('ult'); if (ult) ult.cd = b.ult;
    f.statuses = [];
    if (b.st) for (let st of b.st) { f.addStatus(st.id); }
}

    function applyRestFromSnap(snap) {
        world.particles = [];
        world.projectiles = [];
        if (snap.pr) for (let p of snap.pr) {
            const owner = (p.o === 'p') ? (isHost ? player : enemy) : (isHost ? enemy : player);
            let img = IMG.projectile_arrow;
            if (p.t === 'mage_fire') img = IMG.projectile_fire;
            else if (p.t === 'mage_light') img = IMG.projectile_light;
            else if (p.t === 'mage_ice') img = IMG.projectile_ice;
            else if (p.t === 'arrow' && p.f) img = IMG.projectile_arrow_fire;
            world.projectiles.push({ x:p.x, y:p.y, vx:p.vx, vy:p.vy, w:p.w, h:p.h, type:p.t, color:p.c, damage:p.dmg, owner, reflected:p.rf||false, img, isFire:p.f||false, tracking:p.tr||false, trackingTarget:(p.tr ? enemy : null), life:p.l, burn:(p.t==='mage_fire') });
        }
        world.pickups = [];
        if (snap.pk) for (let pk of snap.pk) {
            const def = PICKUP_DEFS[pk.t];
            world.pickups.push({ x:pk.x, y:pk.y, w:24, h:24, type:pk.t, active:pk.a, color:def?def.color:'#fff', glow:0, update(){this.glow+=0.05;}, draw(ctx){const pl=1+0.1*Math.sin(this.glow); ctx.save(); ctx.translate(this.x,this.y); ctx.scale(pl,pl); ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill(); ctx.restore();} });
        }
        world.flameZones = [];
        if (snap.fz) for (let fz of snap.fz) { world.flameZones.push({ x:fz.x, y:fz.y, w:fz.w, h:fz.h, life:fz.l, timer:0, damage:2, owner:enemy, tickInterval:60 }); }
    }
    function sendPvPInput() {
        if (!pvpConnected || !dataChannel || dataChannel.readyState !== 'open') return;
        try { dataChannel.send(JSON.stringify({ type: 'input', keys: keys })); } catch(e) {}
    }

    let pvpGameOverAcked = false;
    let pvpSendTimer = 0;
    function sendPvPState() {
        if (!isHost || !pvpGameStarted) return;
        if (gameOver) {
            if (pvpGameOverAcked) return;
            sendPvPMsg(makeStateSnapshot());
            return;
        }
        pvpSendTimer++;
        if (pvpSendTimer < PVP_SEND_INTERVAL) return;  // 每N帧发一次
        pvpSendTimer = 0;
        sendPvPMsg(makeStateSnapshot());
    }

    function resetPvP() {
        // 清理 retained 消息
        if (mqttClient && mqttClient.connected && pvpRoomCode) {
            try { mqttClient.publish('flameblade/' + pvpRoomCode + '/offer', '', { retain: true }); } catch(e) {}
        }
        if (peerConnection) { try { peerConnection.close(); } catch(e) {} }
        if (mqttClient) { try { mqttClient.end(true); } catch(e) {} }
        peerConnection = null; dataChannel = null; mqttClient = null;
        pvpConnected = false; pvpIceReady = false; pvpRoomCode = null;
        pvpGameStarted = false; pvpMyCharId = null; pvpYourCharId = null;
        pvpRingBuf = []; pvpInterpT = 0; pvpSendTimer = 0; pvpGameOverAcked = false;
        remoteKeys = { left:false, right:false, up:false, attack:false, skill1:false, skill2:false, ult:false };
        gameMode = 'pve'; isHost = false;
    }

