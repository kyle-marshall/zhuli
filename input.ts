import * as Colors from "https://deno.land/std@0.97.0/fmt/colors.ts";

import { InputParams, ObjectMeta, PropertyMeta } from "./types.d.ts";
import { isNullOrEmpty } from "./util.ts";

/** get a line of text from stdin, max length 1024 */
async function readString(): Promise<string> {
    const buf = new Uint8Array(1024);
    const n = await Deno.stdin.read(buf) as number;
    return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

/** 
 * converts string value into the appropriate type
 * supported types: boolean, number, string
 */
function parseProperty(rawValue: string, meta: PropertyMeta<unknown>): unknown {
    if (isNullOrEmpty(rawValue)) {
        return meta.default;
    }
    switch(meta.type) {
        case "boolean": {
            const c = rawValue.charAt(0).toLowerCase();
            return c === "t" || c === "y";
        }
        case "number":
            return parseFloat(rawValue);
        default:
        case "string":
            return rawValue;
    }
}

/**
 * creates an object having properties as defined by expectedProperties,
 * collecting the property values from stdin
 */
export async function objectFromInput(expectedProperties: PropertyMeta<unknown>[]): Promise<Record<string, unknown>> {
    const encoder = new TextEncoder();
    const obj: Record<string, unknown> = {};
    for(const propMeta of expectedProperties) {
        const defaultHint = isNullOrEmpty(propMeta.display) ? "" : Colors.yellow(` (${propMeta.default})`);
        const prompt = Colors.italic(`${propMeta.display}${defaultHint}: `);
        Deno.stdout.writeSync(encoder.encode(prompt));
        const rawValue = await readString();
        obj[propMeta.name] = parseProperty(rawValue, propMeta);
    }
    console.log(obj);
    return obj;
}

/** 
 * converts args into a [partial] object which may not contain all expectedProperties,
 * so returns both the [partial] object, and array of remaining [unsupplied] properties
 */
export function argsToObject(args: string[], expectedProperties: PropertyMeta<unknown>[]): { obj: Record<string, unknown>, remainingProperties: PropertyMeta<unknown>[] } {
    const pairCount = Math.floor(args.length / 2);
    
    const obj: Record<string, unknown> = {};
    const remainingProperties = expectedProperties.slice();

    for(let i=0; i<pairCount; i += 2) {
        const first = args[i];
        const second = args[i+1];
        if (!/^--[a-zA-Z]+/.test(first)) {
            continue;
        }
        const propIndex = remainingProperties.findIndex(p => p.name === first.substring(2));
        if (propIndex >= 0) {
            const [prop] = remainingProperties.splice(propIndex, 1);
            const v = parseProperty(second, prop);
            obj[prop.name] = v;
        }
    }
    return {
        obj,
        remainingProperties
    };
}

/** 
 * Combines argsToOption and objectFromInput functionality above to produce an object
 * with all properties required by the ObjectMeta properties.
 * You can start from a partially-filled-out object (optional third param).
 */
export async function gatherObject(meta: ObjectMeta, args: string[] = [], partial: InputParams = {}): Promise<InputParams> {
    const requiredProps = meta.properties.filter(p => !(p.name in partial));
    const { obj, remainingProperties } = argsToObject(args, requiredProps);
    if (remainingProperties.length > 0) {
        Object.assign(obj, await objectFromInput(remainingProperties));
    }
    return {...partial, ...obj};
}
