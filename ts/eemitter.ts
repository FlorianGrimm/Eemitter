export type anything = any | null | undefined;
export type EemitterFunc<State=anything, TArg=anything> = (this: State, arg: TArg) => void;
export type DisposeFunc = () => void;
function unbind(lst: EemitterListenerState[], t: EemitterListenerState): DisposeFunc {
    return function () {
        const idx = lst.indexOf(t);
        if (idx >= 0) { lst.splice(idx, 1); }
    };
}

class Disposer {
    lst: EemitterListenerState[];
    processing: boolean;
    constructor() {
        this.lst = [];
        this.processing = false;
    }
    add(els: EemitterListenerState) {
        this.lst.push(els);
        if (!this.processing) {
            this.processing = true;
            window.setTimeout(() => { this.process(); }, 10);
        }
    }
    process() {
        const todo = this.lst; this.lst = []; this.processing = false;
        for (let idx = 0, len = todo.length; idx < len; idx++) {
            const els = todo[idx];
            if (els) {
                if (typeof (els.eemitter.events[els.eventName]) !== "undefined") {
                    const lstEvents = els.eemitter.events[els.eventName];
                    const idx = lstEvents.indexOf(els);
                    if (idx >= 0) { lstEvents.splice(idx, 1); }
                }
            }
        }
    }
}

export class EemitterListenerState<TState=anything, TArg=anything> {
    done: boolean;
    constructor(
        public that: TState | undefined,
        public once: boolean,
        public eemitter: Eemitter,
        public eventName: string
    ) {
        this.done = false;
    }

    process(arg: TArg) {
        if (!this.done) {
            if (this.once) { this.dispose(); }
        }
    }

    dispose() {
        if (!this.done) {
            this.done = true;
        }
        disposer.add(this);
    }

    getDisposeFunc(): DisposeFunc {
        return this.dispose.bind(this);
    }
};
export class EemitterListenerStateFn<TState=anything, TArg=anything> extends EemitterListenerState<TState, TArg>{    
    constructor(
        public fn: EemitterFunc<TState, TArg>,
        public that: TState | undefined,
        public once: boolean,
        public eemitter: Eemitter,
        public eventName: string
    ) {
        super(that, once, eemitter, eventName);        
    }
    process(arg: TArg) {
        if (!this.done) {
            if (this.once) { this.dispose(); }
            this.fn.call(this.that || this.eemitter, arg);
        }
    }
}

const disposer = new Disposer();
const noop = (function () { });

export type IEemitterMessageKey = "error" | "done";
export interface IEemitterMessageMap {
    "error": any;
    "done": any;
}

export type IEemitterMessageKeyData = "data" | IEemitterMessageKey;
export interface IEemitterMessageMapData<TData=any> extends IEemitterMessageMap {
    "data": TData;
}

export interface IEemitter<TMsg extends IEemitterMessageMap=any> {
    on<State=anything, EventName extends keyof TMsg=any>(eventName: EventName, fn: EemitterFunc<State, TMsg[EventName]>, that?: State): DisposeFunc;
    once<State=anything, EventName extends keyof TMsg=any>(eventName: EventName, fn:EemitterFunc<State, TMsg[EventName]>, that?: State): DisposeFunc;
}
export type Events<TMsg extends IEemitterMessageMap, EventName extends keyof TMsg> =
    {[eventName in EventName]: EemitterListenerState<anything, TMsg[eventName]>[]};

export class Eemitter<TMsg extends IEemitterMessageMap = any> {
    // events: { [eventName: string]: EemitterListenerState[] };
    events: Events<TMsg, keyof TMsg>;
    constructor() {
        this.events = {} as Events<TMsg, keyof TMsg>;
        //window.addEventListener
        /*
addEventListener<K extends keyof WindowEventMap>(type: K, listener: (this: Window, ev: WindowEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    interface WindowEventMap extends GlobalEventHandlersEventMap {
    "abort": UIEvent;
    "afterprint": Event;
    }          
         */
    }
    on<State=anything, EventName extends keyof TMsg=any>(eventName: EventName, fn: EemitterFunc<State, TMsg[EventName]>, that?: State): DisposeFunc {
        if (!eventName || !fn) { return noop; }
        const lstEvents = (typeof (this.events[eventName]) === "undefined") ? (this.events[eventName] = []) : this.events[eventName];
        const t = new EemitterListenerStateFn(fn, that, false, this, eventName);
        lstEvents.push(t);
        return t.getDisposeFunc();
    }

    once<State=anything, EventName extends keyof TMsg=any>(eventName: EventName, fn: EemitterFunc<State, TMsg[EventName]>, that?: State): DisposeFunc {
        if (!eventName || !fn) { return noop; }
        const lstEvents = (typeof (this.events[eventName]) === "undefined") ? (this.events[eventName] = []) : this.events[eventName];
        const t = new EemitterListenerStateFn(fn, that, true, this, eventName);
        lstEvents.push(t);
        return t.getDisposeFunc();
    }

    chain<State=anything, EventName extends keyof TMsg=any>(eventName: EventName, fn: ((this: State, arg: TMsg[EventName]) => void), that?: State): void {
        return
    }

    emit<EventName extends keyof TMsg=any>(eventName: EventName, arg: TMsg[EventName]): void {
        const lstEvents = this.events[eventName];
        if (!lstEvents || lstEvents.length === 0) { return; }
        const lst = lstEvents.slice();
        for (let idx = 0, len = lst.length; idx < len; idx++) {
            const t = lst[idx];
            t.process(arg);
        }
    }
}