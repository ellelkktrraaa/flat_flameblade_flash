    function update(){
        if(!gameRunning||gameOver) return;
        if(hitStop>0){ hitStop--; return; }
        frame++;

        updatePlayerInput(world);
        updateDash(world);
        updateTornadoes(world);
        updateProjectiles(world);
        updateFlameZones(world);
        updateSlow(world);
        updatePickupsAndEnd(world);
    }
