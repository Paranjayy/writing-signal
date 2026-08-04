import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";

const execFileAsync = promisify(execFile);

function nativeSourceDirectory(): string {
  return path.join(process.cwd(), "native");
}

function installedBinaryPath(): string {
  return path.join(homedir(), "Library", "Application Support", "WritingSignal", "bin", "writing-signal-tracker");
}

function launchAgentPath(): string {
  return path.join(homedir(), "Library", "LaunchAgents", "com.writingsignal.collector.plist");
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export type NativeSetupState = {
  developmentSourceAvailable: boolean;
  installed: boolean;
};

export async function getNativeSetupState(): Promise<NativeSetupState> {
  const source = nativeSourceDirectory();
  const [developmentSourceAvailable, binaryInstalled, agentInstalled] = await Promise.all([
    exists(path.join(source, "Package.swift")),
    exists(installedBinaryPath()),
    exists(launchAgentPath()),
  ]);
  return { developmentSourceAvailable, installed: binaryInstalled && agentInstalled };
}

async function buildNativeCollector(): Promise<string> {
  const source = nativeSourceDirectory();
  if (!(await exists(path.join(source, "Package.swift")))) {
    throw new Error("Native collector source is not available in this extension installation");
  }
  await execFileAsync("swift", ["build"], { cwd: source, maxBuffer: 2 * 1024 * 1024 });
  const binary = path.join(source, ".build", "debug", "writing-signal-tracker");
  if (!(await exists(binary))) throw new Error("Swift completed but the collector binary was not found");
  return binary;
}

export async function installNativeCollector(keyboardTracking: boolean): Promise<void> {
  const binary = await buildNativeCollector();
  await execFileAsync(binary, ["--install", ...(keyboardTracking ? ["--keyboard"] : [])], {
    cwd: nativeSourceDirectory(),
    maxBuffer: 2 * 1024 * 1024,
  });
}

export async function uninstallNativeCollector(): Promise<void> {
  const binary = installedBinaryPath();
  if (!(await exists(binary))) throw new Error("No installed collector was found");
  await execFileAsync(binary, ["--uninstall"], { maxBuffer: 2 * 1024 * 1024 });
}
