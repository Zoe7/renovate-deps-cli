import { expect, test } from "vitest";
import { extractUpdateInfo } from "./listDependencies.js";

test("Update Node.js to v22", () => {
  const body = `- [ ] <!-- approve-branch=renovate/docker-dev-artifactory.workday.com-peakon-node-22.x -->chore(deps): [PEAKON-2396] Update Node.js to v22`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "Node.js",
    fromVersion: null,
    toVersion: "v22",
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Update dependency eslint from 8.57.1 to 9.19.0", () => {
  const body = `- [ ] <!-- approve-branch=renovate/major-eslint-monorepo -->chore(deps): [PEAKON-2396] Update dependency eslint from 8.57.1 to 9.19.0`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "eslint",
    fromVersion: "8.57.1",
    toVersion: "9.19.0",
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Update dependency js-yaml from 3.14.1 to 4.1.0", () => {
  const body = `- [ ] <!-- approve-branch=renovate/js-yaml-4.x -->chore(deps): [PEAKON-2396] Update dependency js-yaml from 3.14.1 to 4.1.0`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "js-yaml",
    fromVersion: "3.14.1",
    toVersion: "4.1.0",
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Update dependency react-redux from 9.1.2 to 9.2.0", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/react-redux-9.x -->[chore(deps): [PEAKON-2396] Update dependency react-redux from 9.1.2 to 9.2.0](../pull/16761)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "react-redux",
    fromVersion: "9.1.2",
    toVersion: "9.2.0",
    updateType: null,
    pullRequest: "16761",
    packages: [],
  });
});

test("Update graphqlcodegenerator monorepo (major)", () => {
  const body = `- [ ] <!-- approve-branch=renovate/major-graphqlcodegenerator-monorepo -->chore(deps): [PEAKON-2396] Update graphqlcodegenerator monorepo (major) (\`@graphql-codegen/cli\`, \`@graphql-codegen/client-preset\`, \`@graphql-codegen/typescript\`)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "graphqlcodegenerator",
    fromVersion: null,
    toVersion: null,
    updateType: "major",
    pullRequest: null,
    packages: [
      "@graphql-codegen/cli",
      "@graphql-codegen/client-preset",
      "@graphql-codegen/typescript",
    ],
  });
});

test("Update react monorepo (major)", () => {
  const body = `- [ ] <!-- approve-branch=renovate/major-react-monorepo -->chore(deps): [PEAKON-2396] Update react monorepo (major) (\`@types/react\`, \`@types/react-dom\`, \`react\`, \`react-dom\`)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "react",
    fromVersion: null,
    toVersion: null,
    updateType: "major",
    pullRequest: null,
    packages: ["@types/react", "@types/react-dom", "react", "react-dom"],
  });
});

test("Update react-router monorepo from 5.3.4 to 7.1.3 (major)", () => {
  const body = `- [ ] <!-- approve-branch=renovate/major-react-router-monorepo -->chore(deps): [PEAKON-2396] Update react-router monorepo from 5.3.4 to 7.1.3 (major) (\`react-router\`, \`react-router-dom\`)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "react-router",
    fromVersion: "5.3.4",
    toVersion: "7.1.3",
    updateType: "major",
    pullRequest: null,
    packages: ["react-router", "react-router-dom"],
  });
});

test("Update stylelint (major)", () => {
  const body = `- [ ] <!-- approve-branch=renovate/major-stylelint -->chore(deps): [PEAKON-2396] Update stylelint (major) (\`stylelint\`, \`stylelint-config-recommended\`, \`stylelint-config-standard\`)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "stylelint",
    fromVersion: null,
    toVersion: null,
    updateType: "major",
    pullRequest: null,
    packages: [
      "stylelint",
      "stylelint-config-recommended",
      "stylelint-config-standard",
    ],
  });
});

test("Update module gopkg.in/DataDog/dd-trace-go.v1 from v1.70.1 to v1.71.0", () => {
  const body = `- [ ] <!-- recreate-branch=renovate/gopkg.in-datadog-dd-trace-go.v1-1.x -->[chore(deps): [PEAKON-2396] Update module gopkg.in/DataDog/dd-trace-go.v1 from v1.70.1 to v1.71.0](../pull/54)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "gopkg.in/DataDog/dd-trace-go.v1",
    fromVersion: "v1.70.1",
    toVersion: "v1.71.0",
    updateType: null,
    pullRequest: "54",
    packages: [],
  });
});

test("Update buildkite plugin docker-compose to v5", () => {
  const body = `- [ ] <!-- approve-branch=renovate/docker-compose-5.x -->chore(deps): [PEAKON-2396] Update buildkite plugin docker-compose to v5`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "docker-compose",
    fromVersion: null,
    toVersion: "v5",
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Update actions/checkout action from v3 to v4", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/docker-dockerfile-1.x -->[chore(deps): [PEAKON-2396] Update actions/checkout action from v3 to v4](../pull/81)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "actions/checkout",
    fromVersion: "v3",
    toVersion: "v4",
    updateType: null,
    pullRequest: "81",
    packages: [],
  });
});

test("Update buildkite plugin peakon/monorepo-diff to v2", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/docker-dockerfile-1.x -->[chore(deps): [PEAKON-2396] Update buildkite plugin peakon/monorepo-diff to v2](../pull/84)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "peakon/monorepo-diff",
    fromVersion: null,
    toVersion: "v2",
    updateType: null,
    pullRequest: "84",
    packages: [],
  });
});

test("Update dependency importlib-resources from 1.5.0 to 6.5.2", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/docker-dockerfile-1.x -->chore(deps): [PEAKON-2396] Update dependency importlib-resources from 1.5.0 to 6.5.2`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "importlib-resources",
    fromVersion: "1.5.0",
    toVersion: "6.5.2",
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Update react monorepo (minor)", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/react-monorepo -->[chore(deps): [PEAKON-2396] Update react monorepo (minor)](../pull/16426) (\`@types/react\`, \`@types/react-dom\`, \`react\`, \`react-dom\`)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "react",
    fromVersion: null,
    toVersion: null,
    updateType: "minor",
    pullRequest: "16426",
    packages: ["@types/react", "@types/react-dom", "react", "react-dom"],
  });
});

test("Update dependency @peakon/components from 46.0.0 to 47.1.1", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/peakon-components-47.x -->[chore(deps): [PEAKON-2396] Update dependency @peakon/components from 46.0.0 to 47.1.1](../pull/16465)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "@peakon/components",
    fromVersion: "46.0.0",
    toVersion: "47.1.1",
    updateType: null,
    pullRequest: "16465",
    packages: [],
  });
});

test("Update dependency eslint-config-prettier from 9.1.0 to 10.0.1", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/eslint-config-prettier-10.x -->[chore(deps): [PEAKON-2396] Update dependency eslint-config-prettier from 9.1.0 to 10.0.1](../pull/17032)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "eslint-config-prettier",
    fromVersion: "9.1.0",
    toVersion: "10.0.1",
    updateType: null,
    pullRequest: "17032",
    packages: [],
  });
});

test("Update tanstack-query monorepo (major)", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/major-tanstack-query-monorepo -->[chore(deps): [PEAKON-2396] Update tanstack-query monorepo (major)](../pull/16142) (\`@tanstack/eslint-plugin-query\`, \`@tanstack/react-query\`, \`@tanstack/react-query-devtools\`)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "tanstack-query",
    fromVersion: null,
    toVersion: null,
    updateType: "major",
    pullRequest: "16142",
    packages: [
      "@tanstack/eslint-plugin-query",
      "@tanstack/react-query",
      "@tanstack/react-query-devtools",
    ],
  });
});

test("Update testing-library monorepo (major)", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/major-testing-library-monorepo -->[chore(deps): [PEAKON-2396] Update testing-library monorepo (major)](../pull/16973) (\`@testing-library/jest-dom\`, \`@testing-library/react\`)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "testing-library",
    fromVersion: null,
    toVersion: null,
    updateType: "major",
    pullRequest: "16973",
    packages: ["@testing-library/jest-dom", "@testing-library/react"],
  });
});

test("Update dependency superagent (major)", () => {
  const body = `- [ ] <!-- approve-branch=renovate/superagent -->chore(deps): [PEAKON-2396] Update dependency superagent (major)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "superagent",
    fromVersion: null,
    toVersion: null,
    updateType: "major",
    pullRequest: null,
    packages: [],
  });
});

test("Update dependency jsdom to 2.0.0", () => {
  const body = `- [ ] <!-- approve-branch=renovate/jsdom -->chore(deps): [PEAKON-2396] Update dependency jsdom to 2.0.0`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "jsdom",
    fromVersion: null,
    toVersion: "2.0.0",
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Update dependency numpy from 1.0.0", () => {
  const body = `- [ ] <!-- approve-branch=renovate/numpy -->chore(deps): [PEAKON-2396] Update dependency numpy from 1.0.0`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "numpy",
    fromVersion: "1.0.0",
    toVersion: null,
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Update dependency stylelint with packages", () => {
  const body = `- [ ] <!-- approve-branch=renovate/stylelint -->chore(deps): [PEAKON-2396] Update dependency stylelint from 1.0.0 to 2.0.0 (\`stylelint-config-recommended\`, \`stylelint-config-standard\`)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "stylelint",
    fromVersion: "1.0.0",
    toVersion: "2.0.0",
    updateType: null,
    pullRequest: null,
    packages: ["stylelint-config-recommended", "stylelint-config-standard"],
  });
});

test("Update buildkite plugin docker-compose to v5", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/docker-dockerfile-1.x -->chore(deps): [PEAKON-2396] Update buildkite plugin docker-compose to v5`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "docker-compose",
    fromVersion: null,
    toVersion: "v5",
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Update dependency gnu_node_ami to ami-002a25a3d5a3d5a3d", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/docker-dockerfile-1.x -->chore(deps): [PEAKON-2396] Update dependency gnu_node_ami to ami-002a25a3d5a3d5a3d`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "gnu_node_ami",
    fromVersion: null,
    toVersion: "ami-002a25a3d5a3d5a3d",
    updateType: null,
    pullRequest: null,
    packages: [],
  });
});

test("Body with multiple updates", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/docker-dockerfile-1.x -->[chore(deps): [PEAKON-2396] Update buildkite plugin docker-compose to v5](../pull/81)
  - [ ] <!-- rebase-branch=renovate/docker-dockerfile-1.x -->[chore(deps): [PEAKON-2396] Update actions/checkout action from v3 to v4](../pull/81)
  hello
  - [ ] <!-- rebase-branch=renovate/docker-dockerfile-1.x -->[chore(deps): [PEAKON-2396] Update buildkite plugin peakon/monorepo-diff to v2](../pull/84)
  something else
  `;

  const result = extractUpdateInfo(body);

  expect(result[0]).toMatchObject({
    dependency: "docker-compose",
    fromVersion: null,
    toVersion: "v5",
    updateType: null,
    pullRequest: "81",
    packages: [],
  });
  expect(result[1]).toMatchObject({
    dependency: "actions/checkout",
    fromVersion: "v3",
    toVersion: "v4",
    updateType: null,
    pullRequest: "81",
    packages: [],
  });
  expect(result[2]).toMatchObject({
    dependency: "peakon/monorepo-diff",
    fromVersion: null,
    toVersion: "v2",
    updateType: null,
    pullRequest: "84",
    packages: [],
  });
});

test("Lock file maintenance", () => {
  const body = `- [ ] <!-- other-branch=renovate/lock-file-maintenance -->chore(deps): [PEAKON-2396] Lock file maintenance`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toBeUndefined();
});

test("Lock file maintenance with PR", () => {
  const body = `- [ ] <!-- rebase-branch=renovate/lock-file-maintenance -->[chore(deps): [PEAKON-2396] Lock file maintenance](../pull/14641)`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toBeUndefined();
});

test("Rebase all open PRs at once", () => {
  const body = `- [ ] <!-- rebase-all-open-prs -->**Click on this checkbox to rebase all open PRs at once**`;
  const result = extractUpdateInfo(body);

  expect(result[0]).toBeUndefined();
});
