    function showResult(title,sub){
        resultText.textContent=title;
        resultSub.textContent=sub;
        resultDiv.classList.add('show');
        gameRunning=false;
    }

    function initCharSelect() {
        charGrid.innerHTML = '';
        for (let key in CHAR_CONFIGS) {
            const config = CHAR_CONFIGS[key];
            const card = document.createElement('div');
            card.className = 'char-card' + (key === selectedCharId ? ' selected' : '');
            card.dataset.id = key;
            const img = document.createElement('img');
            img.src = config.images.idle.src || '';
            img.alt = config.name;
            const name = document.createElement('div');
            name.className = 'cname';
            name.textContent = config.name;
            const desc = document.createElement('div');
            desc.className = 'cdesc';
            desc.textContent = `HP:${config.hp} ${config.resourceLabel || '能量'}:${config.maxEnergy}`;
            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(desc);
            card.addEventListener('click', function(){
                document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));
                this.classList.add('selected');
                selectedCharId = this.dataset.id;
            });
            card.addEventListener('touchend', function(e){
                e.preventDefault();
                document.querySelectorAll('.char-card').forEach(c=>c.classList.remove('selected'));
                this.classList.add('selected');
                selectedCharId = this.dataset.id;
            });
            charGrid.appendChild(card);
        }
    }

    pokedexBtn.addEventListener('click', function(){
        populateDexList();
        pokedexOverlay.classList.add('show');
        hideDexDetail();
    });
    pokedexBtn.addEventListener('touchend', function(e){
        e.preventDefault();
        populateDexList();
        pokedexOverlay.classList.add('show');
        hideDexDetail();
    });
    pokedexCloseBtn.addEventListener('click', function(){
        pokedexOverlay.classList.remove('show');
    });
    pokedexCloseBtn.addEventListener('touchend', function(e){
        e.preventDefault();
        pokedexOverlay.classList.remove('show');
    });
    pokedexOverlay.addEventListener('click', function(e){
        if (e.target === this) pokedexOverlay.classList.remove('show');
    });
    document.querySelectorAll('.dex-card-item').forEach(item => {
        const charId = item.dataset.char;
        item.addEventListener('click', function(){ showDexDetail(charId); });
        item.addEventListener('touchend', function(e){ e.preventDefault(); showDexDetail(charId); });
    });
    dexBackBtn.addEventListener('click', hideDexDetail);
    dexBackBtn.addEventListener('touchend', function(e){ e.preventDefault(); hideDexDetail(); });

    function populateDexList() {
        dexList.innerHTML = '';
        for (let key in CHAR_CONFIGS) {
            const config = CHAR_CONFIGS[key];
            const dex = config.dex;
            if (!dex) continue;
            const card = document.createElement('div');
            card.className = 'dex-card-item';
            card.dataset.char = key;
            card.innerHTML = `<span class="dex-icon">${dex.icon}</span><div class="dex-name">${config.name}</div><div class="dex-hint">点击查看详情</div>`;
            card.addEventListener('click', function(){ showDexDetail(key); });
            card.addEventListener('touchend', function(e){ e.preventDefault(); showDexDetail(key); });
            dexList.appendChild(card);
        }
    }

    function startGame() {
        charSelect.style.display = 'none';
        if (gameMode === 'pvp') {
            pvpMyCharId = selectedCharId;
            sendPvPMsg({ type: 'ready', charId: selectedCharId });
            // 如果我是主机且对方已经先发了 ready → 立即开始
            if (isHost && pvpYourCharId) { tryStartPvPGame(); return; }
            // 否则等待对方
            setPvPStatus(isHost ? '已发送，等待对手选择角色...' : '已发送，等待主机开始...');
            return;
        }
const charIds = Object.keys(CHAR_CONFIGS);
const aiCharId = charIds[Math.floor(Math.random() * charIds.length)];
        initGame(selectedCharId, aiCharId);
    }

    function goToMenu() {
        resultDiv.classList.remove('show');
        menuOverlay.style.display = 'flex';
        menuMain.style.display = 'flex';
        menuDifficulty.style.display = 'none';
        menuPvp.style.display = 'none';
        charSelect.style.display = 'none';
        gameRunning = false;
        gameOver = false;
        resetPvP();
    }

    // ---- 主菜单按钮逻辑 ----
    document.querySelectorAll('.menu-btn').forEach(btn => {
        const action = btn.dataset.action;
        const handleMenuAction = (e) => {
            e.preventDefault();
            if (action === 'pve') {
                menuMain.style.display = 'none';
                menuDifficulty.style.display = 'flex';
            } else if (action === 'pvp') {
                menuMain.style.display = 'none';
                menuPvp.style.display = 'flex';
                // 重置 PvP 界面
                document.getElementById('pvpCreateArea').style.display = 'none';
                document.getElementById('pvpJoinArea').style.display = 'none';
                document.getElementById('pvpStatus').textContent = '';
                resetPvP();
            } else if (action === 'coming') {
                alert('功能开发中，敬请期待');
            }
        };
        btn.addEventListener('click', handleMenuAction);
        btn.addEventListener('touchend', handleMenuAction, {passive:false});
    });

    // 难度选择按钮（复用原有 difficulty 设置 + 角色选择）
    document.querySelectorAll('#menu-difficulty .difficulty-buttons button').forEach(btn => {
        const selectDifficulty = (e) => {
            e.preventDefault();
            difficulty = btn.dataset.diff;
            menuDifficulty.style.display = 'none';
            menuOverlay.style.display = 'none';
            charSelect.style.display = 'flex';
            initCharSelect();
        };
        btn.addEventListener('click', selectDifficulty);
        btn.addEventListener('touchend', selectDifficulty, {passive:false});
    });

    // 返回主菜单
    const backToMainMenu = (e) => {
        e.preventDefault();
        menuDifficulty.style.display = 'none';
        menuMain.style.display = 'flex';
    };
    difficultyBackBtn.addEventListener('click', backToMainMenu);
    difficultyBackBtn.addEventListener('touchend', backToMainMenu, {passive:false});

    // ---- PvP 大厅按钮 ----
    const pvpBackBtn = document.getElementById('pvpBackBtn');
    pvpBackBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetPvP();
        menuPvp.style.display = 'none';
        menuMain.style.display = 'flex';
    });
    pvpBackBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        resetPvP();
        menuPvp.style.display = 'none';
        menuMain.style.display = 'flex';
    }, {passive:false});

    document.getElementById('pvpCreateBtn').addEventListener('click', (e) => { e.preventDefault(); pvpCreateRoom(); });
    document.getElementById('pvpCreateBtn').addEventListener('touchend', (e) => { e.preventDefault(); pvpCreateRoom(); }, {passive:false});

    document.getElementById('pvpJoinBtn').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('pvpCreateArea').style.display = 'none';
        document.getElementById('pvpJoinArea').style.display = 'flex';
        setPvPStatus('');
    });
    document.getElementById('pvpJoinBtn').addEventListener('touchend', (e) => {
        e.preventDefault();
        document.getElementById('pvpCreateArea').style.display = 'none';
        document.getElementById('pvpJoinArea').style.display = 'flex';
        setPvPStatus('');
    }, {passive:false});

    document.getElementById('pvpCopyCodeBtn').addEventListener('click', (e) => { e.preventDefault(); copyRoomCode(); });
    document.getElementById('pvpCopyCodeBtn').addEventListener('touchend', (e) => { e.preventDefault(); copyRoomCode(); }, {passive:false});

    document.getElementById('pvpJoinConfirmBtn').addEventListener('click', (e) => { e.preventDefault(); pvpJoinRoom(); });
    document.getElementById('pvpJoinConfirmBtn').addEventListener('touchend', (e) => { e.preventDefault(); pvpJoinRoom(); }, {passive:false});

    // 房间码输入过滤：只允许数字，回车确认
    const roomCodeInput = document.getElementById('pvpRoomCodeInput');
    roomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
    });
    roomCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); pvpJoinRoom(); }
    });

    charStartBtn.addEventListener('click', startGame);
    charStartBtn.addEventListener('touchend', (e) => { e.preventDefault(); startGame(); });

    function handlePvPRestart() {
        if (!gameOver || gameMode !== 'pvp') { initRestart(); return; }
        if (isHost) {
            pvpGameOverAcked = true;
            initGame(pvpMyCharId, pvpYourCharId);
            sendPvPMsg({ type: 'start', hostChar: pvpMyCharId, guestChar: pvpYourCharId });
        } else {
            sendPvPMsg({ type: 'restart' });
        }
    }

    function initRestart() {
        const aiCharId = enemy.charId;
        initGame(selectedCharId, aiCharId);
    }

    restartBtn.addEventListener('click', function(){
        if (gameMode === 'pvp') { handlePvPRestart(); return; }
        initRestart();
    });
    restartBtn.addEventListener('touchend', function(e){
        e.preventDefault();
        if (gameMode === 'pvp') { handlePvPRestart(); return; }
        initRestart();
    });

    menuBtn.addEventListener('click', goToMenu);
    menuBtn.addEventListener('touchend', (e)=>{ e.preventDefault(); goToMenu(); });

    document.addEventListener('touchmove', (e)=>{ if(e.target.closest('#gameWrapper')) e.preventDefault(); }, {passive:false});

    gameRunning = false;
    menuMain.style.display = 'flex';
    menuDifficulty.style.display = 'none';
    menuPvp.style.display = 'none';
    menuOverlay.style.display = 'flex';
    charSelect.style.display = 'none';
    player = new Fighter(160, GROUND_Y-56, true, 'knight', createSkills('knight'));
    enemy = new Fighter(600, GROUND_Y-56, false, 'knight', createSkills('knight'));
    updateHUD();
    loop();

    // 角色钩子：初始化资源（在所有角色文件加载后执行）
    for (let key in CHAR_CONFIGS) {
        if (CHAR_CONFIGS[key].hooks && CHAR_CONFIGS[key].hooks.initResources) CHAR_CONFIGS[key].hooks.initResources();
    }
