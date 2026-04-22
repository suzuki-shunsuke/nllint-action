import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as github from "@actions/github";
import * as commit from "@suzuki-shunsuke/commit-ts";
import * as nllint from "./nllint";

const COMMIT_MESSAGE = "style(nllint): format code";

const parseFiles = (raw: string): string[] =>
  raw.split(/\s+/u).filter((s) => s.length > 0);

const listGitFiles = async (): Promise<string[]> => {
  const out = await exec.getExecOutput("git", ["ls-files"], { silent: true });
  return out.stdout
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

export const main = async (): Promise<void> => {
  const fixMode = core.getBooleanInput("fix");
  const trimSpace = core.getBooleanInput("trim_space");
  const trimTrailingSpace = core.getBooleanInput("trim_trailing_space");
  const failOnPush = core.getBooleanInput("fail_on_push");

  const filesRaw = core.getInput("files");
  const files = filesRaw ? parseFiles(filesRaw) : await listGitFiles();
  if (files.length === 0) {
    core.info("No files to lint");
    return;
  }

  core.info(
    `nllint: ${fixMode ? "fix" : "check"} mode, trimSpace=${trimSpace}, trimTrailingSpace=${trimTrailingSpace}, files=${files.length}`,
  );

  const result = await nllint.fix({
    fix: fixMode,
    trimSpace: trimSpace,
    trimTrailingSpace: trimTrailingSpace,
    files: files,
  });

  for (const f of result.failed) {
    core.error(`${f.file}: ${f.error.message}`, { file: f.file });
  }

  if (!fixMode) {
    if (result.failed.length > 0) {
      core.setFailed(`${result.failed.length} file(s) need fixes`);
    }
    return;
  }

  if (result.failed.length > 0) {
    core.setFailed(`${result.failed.length} file(s) failed to fix`);
    return;
  }

  if (result.fixed.length === 0) {
    core.info("No changes");
    return;
  }

  const token = core.getInput("github_token");
  if (!token) {
    core.setFailed("github_token is required in fix mode");
    return;
  }

  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
  if (!branch) {
    core.setFailed(
      "Cannot determine branch: GITHUB_HEAD_REF and GITHUB_REF_NAME are both empty",
    );
    return;
  }

  const { owner, repo } = github.context.repo;
  const octokit = github.getOctokit(token);

  core.warning(
    "Pushing a commit for auto code format with nllint https://github.com/suzuki-shunsuke/nllint",
  );

  const res = await commit.createCommit(octokit, {
    owner: owner,
    repo: repo,
    branch: branch,
    message: COMMIT_MESSAGE,
    files: result.fixed,
    deleteIfNotExist: true,
    logger: {
      info: core.info,
    },
  });

  const sha = res?.commit.sha;
  if (!sha) {
    core.info("No commit was pushed");
    return;
  }
  if (failOnPush) {
    core.setFailed(`a commit was pushed: ${sha}`);
    return;
  }
  core.notice(`a commit was pushed: ${sha}`);
};
