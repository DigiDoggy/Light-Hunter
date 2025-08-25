class Timer {
    constructor({io, roomId, toEnd, maxTime = 7 * 6000, updateTimeMS= 250}) {
        this.io= io;
        this.roomId=roomId;
        this.toEnd= toEnd;
        this.maxTime=maxTime;
        this.updateTimeMs=updateTimeMS

        this.interval=null;
        this.endAt=null;
        this.pausedLeft=null;
    }

    start(duration){
        const time =Math.min(duration,this.maxTime);

        this.endAt= Date.now()+ time;
        this.startTime();
        this.emitUpdateTime();
    }
    pause(){
        if(!this.endAt){
            return
        };
        this.pausedLeft= Math.max(0, this.endAt- Date.now())
        this.clearUpdateTime();
    }
    adjust(deltaMs){
        if(this.endAt){
            return;
        };

        const now = Date.now();
        let remaining = Math.max( 0, this.endAt-now);
        remaining+=deltaMs
        remaining= Math.max(0, Math.min(remaining, this.maxTime));
        this.endAt= now + remaining

        this.io.to(this.roomId).emit(`time:adjust`,{
            deltaMs,
            newRemainingMs:remaining
        });
    }

    startTime(){
        this.interval = setInterval(()=>
        this.update,this.updateTimeMs)
    }

    stopTime(){
        if (this.interval) clearInterval(this.interval);
        this.interval=null;
    }

    update(){
        const remaining = this.remaining();
        if (remaining<=0){
            return this.finish('time_up')
        }
        this.updateTimeMs(remaining);
    }
}