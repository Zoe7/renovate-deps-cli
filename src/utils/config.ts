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
    delete: () => config.delete("githubToken"),
  },
  defaultOwner: {
    get: () => {
      const org = config.get("defaultOwner");
      return z.string().optional().parse(org);
    },
    set: (org: string) => config.set("defaultOwner", org),
    delete: () => config.delete("defaultOwner"),
  },
  defaultRenovateGithubAuthor: {
    get: () => {
      const author = config.get("defaultRenovateAuthor");
      return z.string().parse(author);
    },
    set: (author: string) => config.set("defaultRenovateAuthor", author),
    delete: () => config.delete("defaultRenovateAuthor"),
  },
  repoGroup: {
    get: (groupName: string) => {
      const group = config.get(`repoGroups.${groupName}`);
      return z
        .array(
          z.object({
            owner: z.string(),
            name: z.string(),
            url: z.string(),
          })
        )
        .optional()
        .parse(group);
    },
    getAll: () => {
      const groups = config.get("repoGroups");
      const parsedGroups = z
        .record(
          z.array(
            z.object({
              owner: z.string(),
              name: z.string(),
              url: z.string(),
            })
          )
        )
        .optional()
        .parse(groups);

      if (!parsedGroups) {
        return [];
      }

      return Object.entries(parsedGroups).map(([groupName, repos]) => ({
        groupName,
        repos,
      }));
    },
    set: (
      groupName: string,
      group: Array<{ owner: string; name: string; url: string }>
    ) => {
      config.set(`repoGroups.${groupName}`, group);
    },
    delete: (groupName: string) => config.delete(`repoGroups.${groupName}`),
  },
};

export const clearConfig = () => config.clear();
