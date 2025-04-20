import { z } from "zod";

export type UpdateInfo = {
  dependency: string | null;
  fromVersion: string | null;
  toVersion: string | null;
  updateType: "major" | "minor" | "patch" | null;
  pullRequest: string | null;
  packages: string[];
};

const extractPullRequest = (text: string) => {
  const regex =
    /\[(?<prefix>.+)]\(\.\.\/pull\/(?<pullRequest>\d+)\)(?<postfix>.*)/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        pullRequest: z.string().optional(),
        prefix: z.string(),
        postfix: z.string(),
      })
      .parse(match.groups);

    return {
      pullRequest: groups.pullRequest ?? null,
      remainingText: `${groups.prefix}${groups.postfix}`,
    };
  }

  return { pullRequest: null, remainingText: text };
};

const extractUpdateType = (text: string) => {
  const regex =
    /(?<prefix>.+)\((?<updateType>minor|major|patch)\)(?<postfix>.*)/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        updateType: z.enum(["minor", "major", "patch"]),
        prefix: z.string(),
        postfix: z.string(),
      })
      .parse(match.groups);

    return {
      updateType: groups.updateType,
      remainingText: `${groups.prefix}${groups.postfix}`,
    };
  }

  return { updateType: null, remainingText: text };
};

const extractPackages = (text: string) => {
  const regex = /^(?<prefix>.+)(\((?<packages>`[^`]+`(?:, `[^`]+`)*)\))$/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        packages: z.string(),
        prefix: z.string(),
      })
      .parse(match.groups);

    return {
      packages:
        groups.packages
          .split(", ")
          .map((pkg) => pkg.replace(/`/g, "").trim()) ?? [],
      remainingText: groups.prefix,
    };
  }

  return { packages: [], remainingText: text };
};

const extractDependency = (text: string) => {
  const regex =
    /Update (buildkite plugin |dependency |module |)(?<name>\S+)(monorepo|)/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        name: z.string(),
      })
      .parse(match.groups);
    return {
      dependency: groups.name.trim(),
      remainingText: "",
    };
  }

  return { dependency: null, remainingText: text };
};

const extractVersions = (text: string) => {
  const regex =
    /^(?<prefix>.+?)(?:from (?<fromVersion>\S+))? ?(?:to (?<toVersion>\S+))?\s*$/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        fromVersion: z.string().optional(),
        toVersion: z.string().optional(),
        prefix: z.string(),
      })
      .parse(match.groups);

    return {
      fromVersion: groups.fromVersion ?? null,
      toVersion: groups.toVersion ?? null,
      remainingText: groups.prefix,
    };
  }

  return { fromVersion: null, toVersion: null, remainingText: text };
};

const detectUpdateType = (fromVersion: string, toVersion: string) => {
  const parseVersion = (version: string) =>
    version.replace(/^v/, "").split(".").map(Number);

  const [fromMajor, fromMinor, fromPatch] = parseVersion(fromVersion);
  const [toMajor, toMinor, toPatch] = parseVersion(toVersion);

  if (
    fromMajor === undefined ||
    isNaN(fromMajor) ||
    fromMinor === undefined ||
    isNaN(fromMinor) ||
    fromPatch === undefined ||
    isNaN(fromPatch) ||
    toMajor === undefined ||
    isNaN(toMajor) ||
    toMinor === undefined ||
    isNaN(toMinor) ||
    toPatch === undefined ||
    isNaN(toPatch)
  ) {
    return null;
  }

  if (toMajor > fromMajor) {
    return "major";
  } else if (toMinor > fromMinor) {
    return "minor";
  } else if (toPatch > fromPatch) {
    return "patch";
  }

  return null;
};

export const extractUpdateInfo = (text: string) => {
  const pendingUpdates: UpdateInfo[] = [];

  for (const match of text.matchAll(/-->(?<_line>[^\n]+Update[^\n]+)/g)) {
    const line = match.groups?.["_line"];
    if (!line) {
      continue;
    }

    const pullRequestInfo = extractPullRequest(line);
    const updateTypeInfo = extractUpdateType(pullRequestInfo.remainingText);
    const packagesInfo = extractPackages(updateTypeInfo.remainingText);
    const versionsInfo = extractVersions(packagesInfo.remainingText);
    const dependencyInfo = extractDependency(versionsInfo.remainingText);

    const { fromVersion, toVersion } = versionsInfo;

    const detectedUpdateType =
      fromVersion && toVersion
        ? detectUpdateType(fromVersion, toVersion)
        : null;

    pendingUpdates.push({
      dependency: dependencyInfo.dependency,
      fromVersion: versionsInfo.fromVersion,
      toVersion: versionsInfo.toVersion,
      updateType: updateTypeInfo.updateType ?? detectedUpdateType,
      pullRequest: pullRequestInfo.pullRequest,
      packages: packagesInfo.packages,
    });
  }

  return pendingUpdates;
};
