import GameObject from "./GameObject.js";

export default class BonusBox extends GameObject {
    constructor(x, y, size = 28, bonusType, gameContainer) {
        super(x, y, size, size, "bonus", gameContainer);
        this.bonusType = bonusType;
        this.solid = false;
        this.element.classList.add(`bonus--${bonusType}`);
        this.element.style.zIndex = "20";
    }

    static defs = {
        speed: {
            duration: 10_000,
            apply(player) {
                if (player._baseSpeed == null) player._baseSpeed = player.speed;
                player.speed = player._baseSpeed + 50;
                player.element?.classList.add("buff-speed");
            },
            revert(player) {
                if (player._baseSpeed != null) player.speed = player._baseSpeed;
                player.element?.classList.remove("buff-speed");
            }
        },
        vision:{
            duration: 5_000,
            apply(player,game) {
                game.setDarkness?.(false);
            },
            revert(player, game){
                game.setDarkness?.(true);
            }
        }
    };

    activate(player, game) {
        const def = BonusBox.defs[this.bonusType];
        if (!def) return;

        player.effects ??= {};

        const prev = player.effects[this.bonusType];
        if (prev) {
            clearTimeout(prev.timer);
            prev.revert?.(player, game);
        }

        def.apply(player, game);
        const timer = setTimeout(() => {
            def.revert(player, game);
            delete player.effects[this.bonusType];
        }, def.duration);

        player.effects[this.bonusType] = { timer, revert: def.revert };
    }

}

