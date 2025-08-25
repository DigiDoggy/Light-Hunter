import {Howl, Howler} from "howler";

class AudioManager {
    constructor() {
        this.sounds = {};
        Howler.volume(0.5);
        this.init();
    }

    footsteps = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];

    playMenuMusic() {
        this.sounds.menuMusic.play();
    }

    playSound(name) {
        const sound = this.sounds[name];
        if (!sound) {
            console.error("No sound: ", name);
            return;
        }
        sound.play();
    }

    playFootstep() {
        this.playSound(`fs${this.footsteps[Math.floor(Math.random() * this.footsteps.length)]}`);
    }

    playButtonClick(type) {
        switch (type) {
            case 2:
                this.playSound("buttonClick2");
                break;
            default:
                this.playSound("buttonClick1");
        }
    }

    setVolume() {
    }

    stopAllSounds() {
        Howler.stop();
    }

    init() {
        this.sounds = {
            "menuMusic": new Howl({
                src: ["src/assets/sounds/hauntedcastle.mp3"],
                loop: true,
            }),
            "gameMusic": new Howl({
                src: [`src/assets/sounds/Memoraphile - Spooky Dungeon.mp3`],
                loop: true,
            }),
            "buttonClick1": new Howl({src: ["src/assets/sounds/buttonClick1.wav"]}),
            "buttonClick2": new Howl({src: ["src/assets/sounds/buttonClick2.wav"]}),
            "switchState": new Howl({src: ["src/assets/sounds/switchState.wav"]}),
        };

        for (let i = 0; i < this.footsteps.length; i++) {
            this.sounds[`fs${i}`] = new Howl({src: [`src/assets/sounds/footsteps/${i}.ogg`]});
        }
    }
}

const audio = new AudioManager();
export default audio;