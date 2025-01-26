import { Octokit } from "@octokit/rest";
import { userConfig } from "../../utils/config.js";
import chalk from "chalk";

export async function listRepositories() {
  const octokit = new Octokit({
    auth: userConfig.githubToken.get(),
  });

  const repos = await octokit.repos
    .listForAuthenticatedUser({
      visibility: "all",
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
}
