import { confirm, password } from "@inquirer/prompts";
import { userConfig } from "../../utils/config.js";
import chalk from "chalk";
import { z } from "zod";
import { symbols } from "../../utils/symbols.js";

export async function init() {
  // Prompt the user for their GitHub token
  const githubToken = userConfig.githubToken.get();
  let keepExistingToken = false;
  // user has already set a token, we can re-use the existing one
  if (githubToken) {
    console.log("");
    keepExistingToken = await confirm({
      message:
        "Your Github token has already been set, do you want to keep using that token?",
      default: true,
    });
  }

  if (!keepExistingToken) {
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
}
