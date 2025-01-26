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
};

export const clearConfig = () => config.clear();
