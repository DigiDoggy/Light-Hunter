import {Howl, Howler} from "howler";

const PATH = "src/assets/sounds/";
const footsteps = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];
const maxDistance = 600;
const spatialAttrs = {
    distanceModel: "linear",
    refDistance: 80,
    maxDistance: maxDistance,
    rolloffFactor: 1.0,
    panningModel: "HRTF",
    coneInnerAngle: 360,
    coneOuterAngle: 360,
    coneOuterGain: 0
};

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
    "bonus": new Howl({src: [PATH + "bonus.wav"]}),
}

// Footsteps
for (let i = 0; i < footsteps.length; i++) {
    sounds[`fs${i}`] = new Howl({src: [PATH + `footsteps/${i}.ogg`]});
}

class AudioManager {
    constructor() {
        if (!localStorage.getItem("volume")) {
            localStorage.setItem("volume", 100);
        }
        this.setVolume(localStorage.getItem("volume"));
    }

    playMenuMusic() {
        sounds.menuMusic.play();
    }

    playSound(name, pos) {
        const sound = sounds[name];
        if (!sound) {
            console.error("No sound: ", name);
            return;
        }
        if (pos) {
            const id = sound.play();
            sound.pannerAttr(spatialAttrs, id);
            sound.pos(pos.x, pos.y, -0.1, id);
            return;
        }
        sound.play();
    }

    playFootstep(isLocal, pos) {
        const sound = `fs${footsteps[Math.floor(Math.random() * footsteps.length)]}`;
        if (isLocal) this.playSound(sound);
        else this.playSound(sound, pos);
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

    updatePosition(x, y) {
        Howler.pos(x, y, 0)
    }

    setVolume(vol) {
        if (!vol) return;
        if (typeof vol === "string") vol = Number(vol) / 100;
        Howler.volume(vol);
    }

    stopAllSounds() {
        Howler.stop();
    }
}

const audio = new AudioManager();
export default audio;