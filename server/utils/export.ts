import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';
import path from 'path';
import { createWriteStream } from 'fs';

const execFileAsync = promisify(execFile);

export async function createDesktopPackage(tempDir: string, gameHTML: string): Promise<void> {
  await fs.mkdir(tempDir, { recursive: true });

  // Write the game HTML to a file
  await fs.writeFile(path.join(tempDir, 'index.html'), gameHTML);

  // Copy electron main file
  await fs.copyFile(
    path.join(process.cwd(), 'server', 'electron.ts'),
    path.join(tempDir, 'main.js')
  );

  // Create package.json for the electron app
  const packageJson = {
    name: "pong-game",
    version: "1.0.0",
    main: "main.js",
    scripts: {
      start: "electron ."
    }
  };

  await fs.writeFile(
    path.join(tempDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
}

export async function createZipArchive(tempDir: string): Promise<string> {
  const zipPath = path.join(tempDir, 'pong-game.zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = createWriteStream(zipPath);

  return new Promise((resolve, reject) => {
    output.on('close', () => resolve(zipPath));
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(tempDir, false);
    archive.finalize();
  });
}

export async function cleanupTempDir(tempDir: string): Promise<void> {
  await fs.rm(tempDir, { recursive: true });
}

export function getWebDeploymentUrl(): string {
  return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
}