import * as path from "https://deno.land/std@0.97.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.97.0/fs/mod.ts";
import * as Colors from "https://deno.land/std@0.97.0/fmt/colors.ts";
import Handlebars from "https://cdn.skypack.dev/handlebars@4.7.7";
import { InputParams, TaskNode } from "./types.d.ts";
import { doTask } from "./task.ts";
import { walk as _walk } from "https://deno.land/std@0.97.0/fs/mod.ts";

var walk = _walk;

const PROGRAM_NAME = "zhuli";
const APP_DATA_DIRECTORY_NAME = ".zhuli";

const usage = `${PROGRAM_NAME} <template-name>`;

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

// deno-lint-ignore no-unused-vars
const forgeFile = async (templatePath: string, destinationPath: string, context: unknown) => {
  const templateText = await Deno.readTextFile(templatePath);
  const template = Handlebars.compile(templateText);
  const outText = template(context);
  return Deno.writeTextFile(destinationPath, outText);
}

// deno-lint-ignore no-unused-vars
const copyDirectoryContents = async (sourceDirPath: string, destDirPath = ".", ignoreRegex = /.hbr$/) => {
  const n = sourceDirPath.length;
  for await (const entry of walk(sourceDirPath)) {
    if (entry.path.length <= n) continue;
    if (ignoreRegex.test(path.basename(entry.path))) {
      continue;
    }
    const info = await Deno.lstat(entry.path);
    const destPath = path.join(destDirPath, entry.path.substring(n));
    try {
      if (info.isDirectory) {
        await Deno.mkdir(destPath);
      } else {
        Deno.copyFile(entry.path, destPath);
      }
    } catch (err) {
      const message = Colors.brightRed(`${err}`);
      console.log(Colors.red(`Could not create '${destPath}': ${message}`));
    }
  }
};

// deno-lint-ignore no-unused-vars
const exec = async (cmdTokens: string[]) => {
  const p = Deno.run({ cmd: cmdTokens });
  await p.status();
};

async function zhuli(templateName: string, argsOrObj: string[] | InputParams) {
  const ZHULI_DIR = path.join(Deno.env.get("HOME") as string, APP_DATA_DIRECTORY_NAME);
  const TEMPLATES_DIR = path.join(ZHULI_DIR, "templates");
  const templateDirPath = path.join(TEMPLATES_DIR, templateName);
  const configPath = path.join(templateDirPath, "config.hbr");

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
    templateName,
  };

  const configRaw = await readTemplate(configPath, context);

  var config: TaskNode | null = null;
  eval("config = " + configRaw);
  const main = (config as unknown as TaskNode);
  main.label = templateName;

  if (Array.isArray(argsOrObj)) {
    main.args = argsOrObj;
  }
  else {
    main.input = argsOrObj;
  }

  await doTask(main);
}

await zhuli(globals.templateName, Deno.args.slice(1));

console.log();
console.log(Colors.brightGreen("All done!"));
