import { Colors, Handlebars, path, exists } from "./deps.ts";
import { InputParams, TaskNode } from "./types.d.ts";
import { doTask } from "./task.ts";
import taskHelpers from "./task-helpers.ts";

Object.assign(window, taskHelpers);

const PROGRAM_NAME = "zhuli";
const APP_DATA_DIRECTORY_NAME = ".zhuli";
const TASK_FN = "task.hbr";
const CONTEXT_FN = "context.ts";
const PRESET_DIR_NAME = "presets";

const usage = `${PROGRAM_NAME} <preset-name>`;

const args = Deno.args;
if (args.length < 1) {
  console.log(usage);
  Deno.exit();
}

export const globals = {
  templateName: args[0],
  depth: 0,
};

const readTemplate = async (templatePath: string, context: unknown) => {
  const text = await Deno.readTextFile(templatePath);
  const template = Handlebars.compile(text);
  return template(context);
};

function tseval(code: string): Promise<unknown> {
  return import('data:application/javascript,' + encodeURIComponent(code));
}

async function zhuli(presetName: string, argsOrObj: string[] | InputParams) {
  const ZHULI_DIR = path.join(
    Deno.env.get("HOME") as string,
    APP_DATA_DIRECTORY_NAME,
  );

  const templateDirPath = path.join(ZHULI_DIR, PRESET_DIR_NAME, presetName);
  const configPath = path.join(templateDirPath, TASK_FN);
  const contextPath = path.join(templateDirPath, CONTEXT_FN);

  if (!await exists(configPath)) {
    const yikes = Colors.brightRed(`Template '${configPath}' does not exist!`);
    console.log(yikes);
    Deno.exit();
  }

  const cwd = Deno.cwd();
  // parameters used to fill in the task.hbr template
  const templateContext = {
    cwd,
    cwdName: path.basename(cwd),
    templateDirPath,
    presetName,
  };

  // some presets may specify a context file
  // if used, this file should export an object named context
  let presetContext: Record<string, unknown> | null = null;
  if (await exists(contextPath)) {
    const code = `
        export { context } from "file://${contextPath}";
    `;
    const mod = await tseval(code) as { context: Record<string, unknown>; };
    presetContext = mod.context as Record<string, unknown>;
  }
  Object.assign(window, presetContext);

  // eval dark magic, prefixing the object with "_=" makes eval happy,
  // and the entire statement returns an object since a js assignment expression
  // returns the assigned value, e.g. you can do things like: a = b = c = 4
  var _;
  const js = "_ = " + await readTemplate(configPath, templateContext);
  const main: TaskNode = eval(js);
  main.label = presetName;

  if (Array.isArray(argsOrObj)) {
    main.args = argsOrObj;
  } else {
    main.input = argsOrObj;
  }

  await doTask(main);
}

await zhuli(globals.templateName, Deno.args.slice(1));

console.log();
console.log(Colors.brightGreen("All done!"));
