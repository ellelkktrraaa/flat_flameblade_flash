    class Skill {
        constructor({ key, name, cooldown, energyCost, canUse, execute }) {
            this.key = key;
            this.name = name;
            this.cooldown = cooldown;
            this.energyCost = energyCost || 0;
            this.cd = 0;
            this._canUse = canUse || (() => true);
            this._execute = execute || (() => ({ success: false }));
        }
        canUse(owner) {
            if (this.cd > 0) return false;
            if (owner.energy < this.energyCost) return false;
            if (owner.attacking && owner.charId !== 'archer') return false;
            if (owner.chargingAttack) return false;
            return this._canUse(owner);
        }
        tryUse(owner) {
            if (!this.canUse(owner)) return { success: false };
            owner.energy -= this.energyCost;
            // 注意：冷却在 tryUse 中设置，但圣骑士技能1 会在 execute 中重置为0，由 releasePaladinCharge 控制
            this.cd = this.cooldown;
            const result = this._execute(owner);
            return result && typeof result === 'object' ? result : { success: true };
        }
        update() { if (this.cd > 0) this.cd--; }
    }

    const CHAR_SKILL_FACTORIES = {};

    function createSkills(charId) {
        return CHAR_SKILL_FACTORIES[charId] ? CHAR_SKILL_FACTORIES[charId]() : [];
    }
