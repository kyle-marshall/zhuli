import * as Colors from "https://deno.land/std@0.97.0/fmt/colors.ts";
import { gatherObject } from "./input.ts";
import { TaskNode } from "./types.d.ts";
import { isNullOrEmpty } from "./util.ts";
import { globals } from "./zhuli.ts";

const originalLog = console.log;
const originalWriteSync = Deno.stdout.writeSync.bind(Deno.stdout);

const setConsoleLogDepth = (depth: number) => {
    let pad = "";
    let d = depth;
    while (d--) pad += "|";
    const padBytes = new TextEncoder().encode(pad);
    console.log = function(){
        originalWriteSync(padBytes);
        originalLog(...arguments)
    };
};

const setWriteSyncDepth = (depth: number) => {
    let pad = "";
    let d = depth;
    while (d--) pad += "|";
    const padBytes = new TextEncoder().encode(pad);
    const newWrite = function(p: Uint8Array){
        const pp = new Uint8Array([...padBytes, ...p]);
        return originalWriteSync(pp);
    };
    Deno.stdout.writeSync = newWrite;
};

const setOutputDepth = (depth: number) => {
    setConsoleLogDepth(depth);
    setWriteSyncDepth(depth);
};

export async function doTask(task: TaskNode) {
    if (task.parent == null && isNullOrEmpty(task.label)) {
        task.label = "main";
    }

    const label = Colors.yellow(`[${task.label}]`);
    const desc = Colors.bold(Colors.brightBlue(task.description ?? ""));
    console.log(`┌${label} ${desc}`);
    globals.depth += 1;
    setOutputDepth(globals.depth);

    if (task.inputMeta != null) {
        task.input = await gatherObject(task.inputMeta, task.args ?? [], task.input ?? {});
    }
    if (task.fn != null) {
        await task.fn();
    }
    if (task.tasks != null) {
        const n = task.tasks.length;
        console.log();
        const howManyTasksString = `${Colors.bold(`${n}`)} subtask${n === 1 ? "" : "s"}`;
        console.log("┌"+Colors.magenta(`[executing ${howManyTasksString}]`));
        globals.depth += 1;
        setOutputDepth(globals.depth);
        for(let i = 0; i < n; i++) {
            const t = task.tasks[i];
            t.label = `${task.label}:${i+1}`;
            t.parent = task;
            await doTask(t);
        }
        globals.depth -= 1;
        setOutputDepth(globals.depth);
        console.log("└"+Colors.magenta(`[completed ${howManyTasksString}]`));
    }
    globals.depth -= 1;
    setOutputDepth(globals.depth);
    console.log(`└${label} completed`);
}
