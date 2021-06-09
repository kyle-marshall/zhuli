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

function tseval (code: string): Promise<any> {
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
  const cwdName = path.basename(cwd);

  const context = {
    cwdName,
    templateDirPath,
    presetName,
  };

  let pluginContext = null;
  if (await exists(contextPath)) {
        const code = `
        export { context } from "file://${contextPath}";
    `;
    const mod = await tseval(code);
    pluginContext = mod.context;
  }

  var _;
  const js = "_ = " + await readTemplate(configPath, context);
  Object.assign(window, pluginContext);
  var config: TaskNode | null = eval(js);

  const main = (config as unknown as TaskNode);
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
