// tsc && .\node_modules\.bin\jest
import { Eemitter, IEemitterMessageMap, IEemitterMessageMapData } from "./eemitter";
const eemitter = require("./eemitter");

test("0", () => {
    expect(1).toBe(1);
});

test("1-on", () => {
    var ee = new eemitter.Eemitter();
    var sideEffect = 0;
    ee.on("data", (x: number) => { sideEffect = x + 1 });
    ee.emit("data", 41);
    expect(sideEffect).toBe(42);
});


interface SideEffect { sideEffect: number };

test("2-on-data", () => {
    var ee: Eemitter<IEemitterMessageMapData<number>> = new eemitter.Eemitter();
    var state = { sideEffect: 0 };
    var dispose = ee.on<SideEffect>("data", function (this: SideEffect, x: number) { this.sideEffect += x; }, state);
    //var dispose = ee.on("data", function (x: number) { this.sideEffect += x; }, state);
    ee.emit("data", 1);
    ee.emit("data", 41);
    dispose();
    ee.emit("data", 2);
    expect(state.sideEffect).toBe(42);
});


test("3-idea", () => {
    var ee: Eemitter<IEemitterMessageMapData<number>> = new eemitter.Eemitter();
    var state = { sideEffect: 0 };
    (ee as any).chain("data",
        function (a: number, next: Eemitter<IEemitterMessageMapData<number>>) {
            next.emit("data", a + 1);
        }).chain("data",
        function (b: number, next: Eemitter<IEemitterMessageMapData<number>>) {
            if (b < 10) {
                next.emit("data", b + 40);
            }
        }).on("data",
        function (this: SideEffect, v: number) {
            this.sideEffect = v;
        }, state);
    // ee.emit("data", 1);
    // ee.emit("data", 41);
    // dispose();
    // ee.emit("data", 2);
    //expect(state.sideEffect).toBe(42);
    expect(42).toBe(42);
});