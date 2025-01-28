import Conf from "conf";
import z from "zod";

const config = new Conf({ projectName: "renovate-deps-cli" });

export const userConfig = {
  githubToken: {
    get: () => {
      const token = config.get("githubToken");
      return z.string().optional().parse(token);
    },
    set: (token: string) => config.set("githubToken", token),
  },
  defaultOrg: {
    get: () => {
      const org = config.get("defaultOrg");
      return z.string().optional().parse(org);
    },
    set: (org: string) => config.set("defaultOrg", org),
  },
  defaultRenovateGithubAuthor: {
    get: () => {
      const author = config.get("defaultRenovateAuthor");
      return z.string().parse(author);
    },
    set: (author: string) => config.set("defaultRenovateAuthor", author),
  },
};

export const clearConfig = () => config.clear();
