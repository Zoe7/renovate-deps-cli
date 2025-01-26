#! /usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import { clearConfig, userConfig } from "./config.js";
import { Octokit } from "@octokit/rest";
import { z } from "zod";
import { symbols } from "./symbols.js";
import { password, confirm } from "@inquirer/prompts";

const program = new Command();

program
  .name("renovate-deps-cli")
  .description("CLI for renovate-deps")
  .version("1.0.0");

program
  .command("init")
  .action(async () => {
    // Prompt the user for their GitHub token
    const githubToken = userConfig.githubToken.get();
    let shouldPromptGithubToken = true;
    // user has already set a token, we can re-use the existing one
    if (githubToken) {
      console.log("");
      shouldPromptGithubToken = await confirm({
        message:
          "Your Github token has already been set, do you want to replace it with a new one?",
        default: false,
      });
    }

    if (shouldPromptGithubToken) {
      console.log("");
      console.log(
        chalk.white(
          "To let the CLI pull data from your repositories and authenticate with GitHub, it will need a",
          chalk.bold("Personal Access Token"),
          "(classic)."
        )
      );
      console.log(
        chalk.white(
          "Learn more about GitHub tokens and how to create one here:",
          chalk.underline(
            "https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token"
          )
        )
      );
      console.log(
        chalk.white(
          "\nPlease ensure the token has the following scope enabled:\n" +
            "- repo (to access your repositories)\n"
        )
      );

      const promptedGithubToken = await password({
        message: "Enter your GitHub token:",
        mask: "*",
        validate: (input) => {
          if (z.string().min(10).safeParse(input).success) {
            return true;
          } else {
            return "Please enter a valid GitHub token.";
          }
        },
      });
      userConfig.githubToken.set(promptedGithubToken);
    }

    console.log("");
    console.log(
      chalk.green(symbols.success, "Setup complete, you can now use the CLI.")
    );
  })
  .description(
    "Set up the CLI and all the configuration it is going to need to work."
  );

program
  .command("list-repos")
  .action(async () => {
    const octokit = new Octokit({
      auth: userConfig.githubToken.get(),
    });

    const repos = await octokit.repos
      .listForAuthenticatedUser({
        visibility: "all",
        organization: "Zoe7",
      })
      .then((response) =>
        response.data.filter((repo) => repo.archived === false)
      );

    console.log("");
    console.log(
      chalk.white(
        `Found ${repos.length} repository${
          repos.length > 1 ? "s" : ""
        } accessible by the CLI using your current configuration.`
      )
    );

    console.log("");
    for (const repo of repos) {
      console.log(chalk.white(`- ${repo.full_name}`));
    }
  })
  .description(
    "List all the repositories accessible by the CLI based on your configuration"
  );

program
  .command("checkConfig")
  .action(() => {
    console.log(`githubToken: ${userConfig.githubToken.get()}`);
  })
  .description("Run the CLI");

program
  .command("cleanup")
  .action(() => {
    clearConfig();
    console.log(
      chalk.white(chalk.green(symbols.success), "Configuration cleaned up")
    );
  })
  .description(
    "Cleanup the persisted configuration used by the CLI from your machine"
  );

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
