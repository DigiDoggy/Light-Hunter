import {Howl, Howler} from "howler";

class AudioManager {
    constructor() {
        this.sounds = {};
        Howler.volume(0.5);
        this.init();
    }

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
    }
}

const audio = new AudioManager();
export default audio;