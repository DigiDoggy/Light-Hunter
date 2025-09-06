class Timer {
    constructor({io,roomId,onTimerEnd,updateEveryMs=259}) {
        this.io=io;
        this.roomId=roomId;
        this.onTimerEnd= onTimerEnd;
        this.updateEveryMs=updateEveryMs;

        this.interval = null;
        this.deadlineMs = null;
        this.pauseLeft = null;
    }

    start(durationMs){
        this.deadlineMs=Date.now() + durationMs;
        this.startUpdate();
        this.emitUpdate();
    }

    pause(){
        if(!this.deadlineMs) return;

        this.pauseLeft= this.deadlineMs-Date.now();
        this.stopUpdate();
    }

    resume(){
        if(this.pauseLeft==null) return;
        this.deadlineMs= Date.now() + this.pauseLeft;
        this.pauseLeft=null;
        this.startUpdate();
        this.emitUpdate();
    }

    adjust(picupTimeBonus){
        if(!this.deadlineMs)return;

        const now = Date.now();
        let remaining = this.deadlineMs-now;

        remaining+=picupTimeBonus;
        remaining=Math.max(0,remaining);

        if (remaining==0){
            return this.finish('timeUp')
        }

        this.deadlineMs=now + remaining;

        this.io.to(this.roomId).emit('timer:adjust',{
            picupTimeBonus,
            newRemainingMs:remaining
        });


    }


    startUpdate() {
        this.stopUpdate();
        this.interval= setInterval(()=>
        this.update(), this.updateEveryMs);
    }

    stopUpdate() {
        if (this.interval) clearInterval(this.interval);
        this.interval=null;
    }

    update() {
        const remaining = this.remaining();
        if(remaining<=0){
            return this.finish('timeUp')
        }
        this.emitUpdate(remaining);
    }

    emitUpdate(remaining=this.remaining()) {
        this.io.to(this.roomId).emit('timer:update', {
            serverNow: Date.now(),
            remainingMs: remaining
        })
    }

    remaining(){
        if(!this.deadlineMs)return 0;

        const now = Date.now();

        const remaining= this.deadlineMs-now;

        if(remaining>0) {
            return remaining;
        }else{
            return 0;
        }
    }

    finish(reason) {
        this.stopUpdate();
        this.deadlineMs=null;
        this.pauseLeft=null;

        // this.io.to(this.roomId).emit('game:ended', {reason});

        this.onTimerEnd?.(reason);
    }
}

export default Timer;


