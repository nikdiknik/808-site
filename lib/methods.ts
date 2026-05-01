import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readMethodsText(): Promise<string> {
  const rawPath = process.env.METHODS_TSV_PATH || "data/methods.tsv";
  const methodsPath = path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
  const buffer = await readFile(methodsPath);
  const text = buffer.toString("utf8").trim();

  if (!text) {
    throw new Error("METHODS_EMPTY");
  }

  return text.replaceAll("\t", " | ").slice(0, 18000);
}
