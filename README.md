# zhuli is a top-notch assistant

zhuli

If you saw the Legend of Korra, you may remember the charismatic Varrick and his very capable assistant, Zhu Li. At the time, my American ears heard Julie, but anyways, that's the namesake of this tool.

---

What is this this tool?

Well, it's pretty flexible. It, or she, can set up projects for you, do a series of tasks based on some inputs, that sort of thing.

`zhuli` is a command line tool which will dynamically load and execute your custom "presets". All you have to do is create a directory with one file in it and then zhuli can do a new thing. Zhuli, do the thing!

Code scaffolding was the original intent of this project, but the possibilities are a lot more general.

Here's how it works.
- `zhuli <preset-name>` will look for files within the directory `~.zhuli/presets/<preset-name>`
- the one required file in your preset directory is `task.hbr`, which defines your task tree. This funny file should contain a simple javascript object which is compatible with the following interface. The file isn't valid JS by itself, since this object is sort of floating without being assigned to anything, but don't let that trouble you.
This is the "shape" of that object:
```typescript
// all properties are optional
export interface TaskNode {
    args?: string[]; // ignore this, used internally
    parent?: TaskNode | null; // tasks can access their parent (perhaps to get input passed to the parent task)
    label?: string; // ignore, used internally for console output
    description?: string; // set this to something that describes what the task does
    inputMeta?: ObjectMeta; // this is how you specify what user input is required
    input?: InputParams; // not created by you, zhuli collects info and puts it here
    tasks?: TaskNode[]; // child tasks
    fn?: () => Promise<void>; // the task's "action", can access this.input property prepared by zhuli.
}
```
Here's an example of a very simple `task.hbr` file:
```js
{
    description: "generate nanoid",
    inputMeta: {
        properties: [
            { name: "howMany", display: "How Many?", type: "number", default: 1 },
            { name: "length", display: "Length?", type: "number", default: 21 }
        ]
    },
    fn: async function() {
        const { howMany, length } = this.input;
        for(let i=0; i<howMany; i++){
            console.log(nanoid(length));
        }
    }
}
```
That task was made to test using a 3rd party library (nanoid) from within the task tree. More info in the appendix.

Anyways, that's all zhuli needs to do the thing.

Here's what zhuli can do when you have defined this task tree within a preset directory named `nanoid`:

```shell
km@km-AERO-15-KC:~/dev/deno/zhuli$ zhuli nanoid
┌[nanoid] generate nanoid
|How Many? (1): 5
|Length? (21): 
|{ howMany: 5, length: 21 }
|IlTCswsjP6IYXA5YKfGoU
|auKX_BtmW-VAWYvgo43Hk
|bvVCUz7Kix3DnFEar22en
|HyV34UAD8TK4TPAiAwXAt
|jCojlXjOqgSrmi75o0253
└[nanoid] completed

All done!
km@km-AERO-15-KC:~/dev/deno/zhuli$ 
```

Okay, this particular preset isnt very useful. Let's see one more example of how zhuli can also scaffold a project.

This time, in reverse order.

The output:

```shell
km@km-AERO-15-KC:~/dev$ mkdir taco-generator
km@km-AERO-15-KC:~/dev$ cd taco-generator/
km@km-AERO-15-KC:~/dev/taco-generator$ zhuli node-ts
┌[node-ts] Create a new node+TypeScript project 📝
|Project Name (taco-generator): 
|{ projectName: "taco-generator" }
|
|┌[executing 4 subtasks]
||┌[node-ts:1] Create package file
||└[node-ts:1] completed
||┌[node-ts:2] 
|||┌[basic-tsconfig] Create tsconfig file
|||└[basic-tsconfig] completed
||└[node-ts:2] completed
||┌[node-ts:3] Install node packages
npm notice created a lockfile as package-lock.json. You should commit this file.
npm WARN optional SKIPPING OPTIONAL DEPENDENCY: fsevents@^2.3.2 (node_modules/jest-haste-map/node_modules/fsevents):
npm WARN notsup SKIPPING OPTIONAL DEPENDENCY: Unsupported platform for fsevents@2.3.2: wanted {"os":"darwin","arch":"any"} (current: {"os":"linux","arch":"x64"})
npm WARN taco-generator@0.0.1 No description
npm WARN taco-generator@0.0.1 No repository field.

+ ts-jest@27.0.3
+ @types/jest@26.0.23
+ jest@27.0.4
+ typescript@4.3.2
added 423 packages from 297 contributors and audited 424 packages in 11.054s

24 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

||└[node-ts:3] completed
||┌[node-ts:4] Create source files
||└[node-ts:4] completed
|└[completed 4 subtasks]
└[node-ts] completed

All done!
km@km-AERO-15-KC:~/dev/taco-generator$ 
```

Ah yes, how nice. Thanks, zhuli.

The "tree" part of "task tree" has now revealed itself. In fact, the main task has no `fn` property, it collects some input but other than that, the child tasks do all the work.

Here's the task tree:

```js
{
    description: "Create a new node+TypeScript project 📝",
    inputMeta: {
        properties: [
            {
                name: "projectName",
                display: "Project Name",
                default: "{{cwdName}}"
            }
        ]
    },
    tasks: [
        {
            description: "Create package file",
            fn: async function() {
                const templatePath = path.join("{{templateDirPath}}", "package.json.hbr");
                await forgeFile(templatePath, "package.json", this.parent.input);
            }
        },
        {
            fn: async function() {
                await zhuli("basic-tsconfig", {strict: true});
            }
        },
        {
            description: "Install node packages",
            fn: async function() {
                const cmdTokens = "npm install -D jest typescript ts-jest @types/jest".split(" ");
                await exec(cmdTokens);
            }
        },
        {
            description: "Create source files",
            fn: async function() {
                await copyDirectoryContents(path.join("{{templateDirPath}}", "bones"));
            }
        }
    ]
}

```
As you can see, there is much more going on here, but each task is only a line or two of code. You can get more information on the various convenience functions I used here in the appendix below. 

Side note for context: the directory for this preset has a few static project files in it in an arbitrarily named "bones" folder, and also a template file called package.json.hbr which is a template for a node package json file.

---

One thing you may notice is the `{{cwdName}}` and `{{templateDirPath}}`.

As the `.hbr` file extension hinted, your task tree definition file is indeed a handlebars template, and a few parameters will be passed to it by zhuli herself so that the template knows what directory it is being invoked in, for example. 

---

You probably also noticed that subtask 2 calls... zhuli?! That's right. In fact zhuli the program is the command line interface for zhuli the function, and zhuli the function can call herself! And when she calls herself this way she is even more useful because you can supply some of the input data for the top level task in the preset you are calling, so the user won't have to. That's what the deal is with the second argument you see above in the zhuli call.

Aside: you can also skip user input from the CLI by calling zhuli like this, for example: `zhuli nanoid --howMany 10 --length 21`

---
Appendix

This tool uses the deno javascript runtime, so go grab it if you are interested. Install from the shell is a one-liner and deno is just a single executable of a relatively small size!
https://deno.land/
<br>

After you have deno installed, you can install zhuli by running the ./install.sh script from this repo. You may need to rename it to .ps1 on windows, but please note I've never tested zhuli on windows. This will not create your ~.zhuli directory for you. You have to create that directory and ~.zhuli/presets yourself. Someday zhuli might help you out there, but not today.

<br>
Disclaimer: you give zhuli the ability to do a lot of stuff when you install it. You have the power to mess up your file system and more. NEVER run other people's presets without carefull inspecting the code, including any modules that code may import. Ideally you should only write your own tasks.

<br>
<br>

functions exposed to the global scope for your zhuli tasks:
- exec(tokens: string[]): lets you execute arbitrary commands (i.e. invoke other programs)
- copyDirectoryContents(sourceDirPath, destDirPath="."): useful for project scaffolding
- forgeFile(templatePath, destPath, data): create a file from a template file and some data to fill it in with
- `path`, `exists`, `walk`, `Colors` are all in global scope (imported from deno standard libraries)
- the `Deno` object is also available
<br>

exposing your own functions to the global scope:
- you can do this by defining a `context.ts` file in your preset directory. 
- You should have one named export called `context` within your `context.ts` file
- any properties of `context` will be available in the global scope for your task tree functions
