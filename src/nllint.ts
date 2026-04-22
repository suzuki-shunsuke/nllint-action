import { readFile, stat, writeFile } from "node:fs/promises";
import * as core from "@actions/core";

export type Options = {
  fix?: boolean;
  trimSpace?: boolean;
  trimTrailingSpace?: boolean;
  ignoreNotFound?: boolean;
  files: string[];
};

export type Result = {
  fixed: string[];
  failed: { file: string; error: Error }[];
};

const handleFileContent = (
  opts: Options,
  content: string,
  filePath: string,
): string => {
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const newL = lines[i].replaceAll("　", " ");
    if (newL !== lines[i]) {
      core.warning(`${filePath}: full-width spaces are found (line ${i + 1})`, {
        file: filePath,
        startLine: i + 1,
      });
    }
    lines[i] = newL;
  }

  if (opts.trimTrailingSpace) {
    for (let i = 0; i < lines.length; i++) {
      const newL = lines[i].replace(/\s+$/u, "");
      if (newL !== lines[i]) {
        core.warning(
          `${filePath}: trailing white spaces in a line are found (line ${i + 1})`,
          { file: filePath, startLine: i + 1 },
        );
      }
      lines[i] = newL;
    }
  }

  if (lines[lines.length - 1] !== "") {
    core.warning(`${filePath}: a newline at the end of file is missing`, {
      file: filePath,
    });
    lines.push("");
  }

  const joined = lines.join("\n");
  const newContent = opts.trimSpace ? joined.trim() + "\n" : joined;

  if (content === newContent) {
    return "";
  }
  if (!opts.fix) {
    throw new Error("a file should be fixed");
  }
  return newContent;
};

const handleFile = async (
  opts: Options,
  filePath: string,
): Promise<boolean> => {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (err) {
    if (
      opts.ignoreNotFound &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      core.warning(`${filePath}: ignore a file because it doesn't exist`);
      return false;
    }
    throw new Error(`open a file: ${(err as Error).message}`, { cause: err });
  }

  const newContent = handleFileContent(opts, content, filePath);
  if (newContent === "") {
    return false;
  }

  const st = await stat(filePath);
  await writeFile(filePath, newContent, { mode: st.mode });
  core.info(filePath);
  return true;
};

export const fix = async (opts: Options): Promise<Result> => {
  const result: Result = { fixed: [], failed: [] };
  for (const file of opts.files) {
    try {
      if (await handleFile(opts, file)) {
        result.fixed.push(file);
      }
    } catch (err) {
      result.failed.push({ file, error: err as Error });
    }
  }
  return result;
};
