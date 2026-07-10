    function updateSlow(world){
        // ===== 状态减速 =====
        for (let f of world.entities) {
            if (f.hp <= 0) continue;
            const factor = f.getSlowedFactor();
            if (factor < 1 && !f.hasStatus('frozen') && !f.dashing) {
                f.vx *= (1 - (1 - factor) * 0.5);
            }
        }

    }
