# zhuli is a top-notch assistant

## As your new assistant, zhuli will help you create your own boilerplates with a good deal of flexibility.

Each template is defined as a task tree. Every task node can gather user input, and do whatever you code it to do (using javascript). Templates can be executed from command line by running `zhuli <template-name> [--somePropertyName someValue --anotherPropertyName anotherValue ...]`.
Zhuli will only ask you for required properties which you did not specify in the command (or from an input object if invoking zhuli from another template via the zhuli function).

The most useful utilities for your templates are created into helper functions which are accessible to your tasks and even more functionality is available through the Deno object. 

Your templates can be for single files or for complex nested structures with some files in the structure being templates and some not. But wait, there's more! You can do whatever you want in your task tree including run scripts / programs with Deno.run(...). Of course, you have to opt in for the appropriate permissions when installing.

---

So why did I make a project template tool? Aren't there like 150 out there now? Well, it was a fun little project I wanted to make after playing with the Handlebars library. I really enjoy making a tool I can use to poof other projects into existance.

Anyways, Zhuli is still changing a lot right now. When she is more stable I will release this to the world with good documentation!

Here's an simple example of me using zhuli to create a new node project with typescript (please note the output has many pretty colors you can't see here). The script only asked me for one input parameter, and I pressed enter to chose the default value for it.


```shell
km@REDACTED:~/dev$ mkdir my-great-project
km@REDACTED:~/dev$ cd my-great-project/
km@REDACTED:~/dev/my-great-project$ zhuli node-ts
┌[node-ts] Create a new node+TypeScript project 📝
|Project Name (my-great-project): 
|{ projectName: "my-great-project" }
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
npm WARN dev@0.0.1 No description
npm WARN dev@0.0.1 No repository field.

+ jest@27.0.4
+ @types/jest@26.0.23
+ ts-jest@27.0.2
+ typescript@4.3.2
added 423 packages from 297 contributors and audited 424 packages in 12.584s

24 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities

||└[node-ts:3] completed
||┌[node-ts:4] Create source files
||└[node-ts:4] completed
|└[completed 4 subtasks]
└[node-ts] completed
```

So what does the template for `node-ts` look like? Here it is! This defines a task tree. The main object is a task and that main task doesn't do anything exciting except specify some required inputs (it has defined no `fn` function). It's child tasks (objects in the tasks array) do all the work. The 2nd child task (the one that calls the zhuli function) is an example of a task that tells zhuli to execute another template.

```js
{
    description: "Create a new node+TypeScript project 📝",
    inputMeta: {
        properties: [
            {
                name: "projectName",
                display: "Project Name",
                // cwdName is info provided to this template by zhuli (templateDirPath, too)
                default: "{{cwdName}}"
            }
        ]
    },
    tasks: [
        {
            description: "Create package file",
            fn: async function() {
                // forging a file means using Handlebars to fill a template with some data,
                // and then copying the result to a file
                const templatePath = path.join("{{templateDirPath}}", "package.json.hbr");
                await forgeFile(templatePath, "package.json", this.parent.input);
            }
        },
        {
            fn: async function() {
                // basic-tsconfig template would ask the user if they wanted strict mode,
                // but I specified true here to skip the prompt
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
                // 2nd parameter of copyDirectoryContents is 
                // the destination directory which defaults to "."
                await copyDirectoryContents(path.join("{{templateDirPath}}", "bones"));
            }
        }
    ]
}
```