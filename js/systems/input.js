    function updatePlayerInput(world){
        // ===== 玩家输入（各角色逻辑已解耦到 characters/*.js 的 handleInput 钩子）=====
        if(player.hp>0 && !player.hasStatus('frozen')){
            const config = CHAR_CONFIGS[player.charId];
            if (config && config.hooks && config.hooks.handleInput) {
                // 钩子返回 false 表示本帧应提前结束（如蓄力能量不足），跳过后续物理/AI
                if (config.hooks.handleInput(player, world) === false) return;
            }
        }

        // PvP / PvE 分支
        if (gameMode === 'pvp') {
            if (isHost) {
                // 主机：用客机输入驱动敌人 → 运行完整模拟
                if (enemy.hp > 0) processPvPRemoteInput();
            } else {
                // 客机：发按键 → 环形缓冲消费一帧渲染
                sendPvPInput();
                pvpConsumeRingBuf();
                // 相机跟随自己
                let tCamX = player.x - W/2;
                tCamX = clamp(tCamX, 0, MAP_W-W);
                world.camera.x += (tCamX - world.camera.x) * 0.1;
                return;
            }
        } else if (enemy.hp > 0) {
            updateAI();
        }

        // ---- 角色钩子：遍历所有角色执行 per-frame 逻辑 ----
        for (let f of world.entities) {
            if (f.hp <= 0) continue;
            const config = CHAR_CONFIGS[f.charId];
            if (config.hooks && config.hooks.onUpdate) config.hooks.onUpdate(world);
        }

        // ---- 时间停止处理 ----
        let timeStopped = false;
        for (let f of world.entities) {
            if (f.timeStop) { timeStopped = true; break; }
        }

        // ---- 应用物理（时间停止时跳过） ----
        if (!timeStopped) {
            player.applyPhysics();
            enemy.applyPhysics();
        } else {
            // 时间停止：只更新计时器，不移动
            // 但需要更新状态计时
        }

    }
