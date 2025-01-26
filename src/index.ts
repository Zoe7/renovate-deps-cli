#! /usr/bin/env node
import { Command } from "commander";
import { userConfig } from "./utils/config.js";
import { init } from "./commands/init/init.js";
import { listRepositories } from "./commands/listRepositories/listRepositories.js";
import { cleanup } from "./commands/cleanup/cleanup.js";

const program = new Command();

program
  .name("renovate-deps-cli")
  .description("CLI for renovate-deps")
  .version("1.0.0");

program
  .command("init")
  .action(init)
  .description(
    "Set up the CLI and all the configuration it is going to need to work."
  );

program
  .command("list-repos")
  .action(listRepositories)
  .description(
    "List all the repositories accessible by the CLI based on your configuration"
  );

program
  .command("cleanup")
  .action(cleanup)
  .description(
    "Cleanup the persisted configuration used by the CLI from your machine"
  );

// TODO: remove this temp command for me to debug stuff
program
  .command("checkConfig")
  .action(() => {
    console.log(`githubToken: ${userConfig.githubToken.get()}`);
  })
  .description("Run the CLI");

program.parse(process.argv);

// wrap all user prompts in this
// try {
//   let nextDemo = await askNextDemo();
//   while (nextDemo !== 'exit') {
//     await demos[nextDemo]();
//     nextDemo = await askNextDemo();
//   }
// } catch (error) {
//   if (error instanceof Error && error.name === 'ExitPromptError') {
//     // noop; silence this error
//   } else {
//     throw error;
//   }
// }
