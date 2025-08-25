import {Howl, Howler} from "howler";

const PATH = "src/assets/sounds/";
const footsteps = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];

const sounds = {
    "menuMusic": new Howl({
        src: [PATH + "hauntedcastle.mp3"],
        loop: true,
    }),
    "gameMusic": new Howl({
        src: [PATH + "Memoraphile - Spooky Dungeon.mp3"],
        loop: true,
    }),
    "buttonClick1": new Howl({src: [PATH + "buttonClick1.wav"]}),
    "buttonClick2": new Howl({src: [PATH + "buttonClick2.wav"]}),
    "switchState": new Howl({src: [PATH + "switchState.wav"]}),
}

// Footsteps
for (let i = 0; i < footsteps.length; i++) {
    sounds[`fs${i}`] = new Howl({src: [PATH + `footsteps/${i}.ogg`]});
}

class AudioManager {
    constructor() {
        Howler.volume(0.5);
    }

    playMenuMusic() {
        sounds.menuMusic.play();
    }

    playSound(name) {
        const sound = sounds[name];
        if (!sound) {
            console.error("No sound: ", name);
            return;
        }
        sound.play();
    }

    playFootstep() {
        this.playSound(`fs${footsteps[Math.floor(Math.random() * footsteps.length)]}`);
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
}

const audio = new AudioManager();
export default audio;