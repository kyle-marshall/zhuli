import { Colors, Handlebars, path, walk } from "./deps.ts";

const forgeFile = async (
    templatePath: string,
    destinationPath: string,
    context: unknown,
) => {
    const templateText = await Deno.readTextFile(templatePath);
    const template = Handlebars.compile(templateText);
    const outText = template(context);
    return Deno.writeTextFile(destinationPath, outText);
};

const copyDirectoryContents = async (
    sourceDirPath: string,
    destDirPath = ".",
    ignoreRegex = /.hbr$/,
) => {
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

const exec = async (cmdTokens: string[]) => {
    const p = Deno.run({ cmd: cmdTokens });
    await p.status();
};

export default {
    copyDirectoryContents,
    exec,
    forgeFile,
}