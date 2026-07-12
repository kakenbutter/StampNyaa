import { app, clipboard } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Key, keyboard } from '@nut-tree-fork/nut-js';
import sharp from 'sharp';

let clipboardEx: typeof import('electron-clipboard-ex') | undefined;

if (process.platform !== 'linux') {
  clipboardEx = require('electron-clipboard-ex');
}

function getAllStickerPacks(stickerPacksDir: string): Record<string, StickerPackData> {
  const stickerPacksMap: Record<string, any> = {};

  if (!fs.existsSync(stickerPacksDir)) {
    fs.mkdirSync(stickerPacksDir);
  }
  const stickerPacks = fs.readdirSync(stickerPacksDir);
  for (const pack of stickerPacks) {
    if (!fs.lstatSync(path.join(stickerPacksDir, pack)).isDirectory()) {
      continue;
    }
    if (!fs.existsSync(path.join(stickerPacksDir, pack, 'info.json'))) {
      fs.writeFileSync(path.join(stickerPacksDir, pack, 'info.json'), '{}');
    }
    const stickerPackData = JSON.parse(
      fs.readFileSync(path.join(stickerPacksDir, pack, 'info.json'), 'utf8')
    );

    if (!stickerPackData.title) {
      stickerPackData.title = pack;
    }
    if (!stickerPackData.author) {
      stickerPackData.author = 'Unknown';
    }

    stickerPackData.id = pack;

    stickerPackData.mainIcon = path.join(stickerPacksDir, pack, 'main.png');

    const stickers = fs
      .readdirSync(path.join(stickerPacksDir, pack))
      .filter((file) => file !== 'info.json' && file !== 'main.png');

    stickerPackData.stickers = {};

    const specialStickers: string[] = [];
    for (const sticker of stickers) {
      if (sticker.endsWith('_animation.gif') || sticker.endsWith('_popup.gif')) {
        specialStickers.push(sticker);
      } else {
        const stickerID = path.parse(sticker).name;
        const filepath = path.join(stickerPacksDir, pack, sticker);
        const type = 'static';
        stickerPackData.stickers[stickerID] = { filepath, type, stickerPackID: pack };
      }
    }
    for (const sticker of specialStickers) {
      const stickerID = sticker.split('_')[0];

      stickerPackData.stickers[stickerID].specialPath = path.join(stickerPacksDir, pack, sticker);

      stickerPackData.stickers[stickerID].type = path.parse(sticker).name.split('_')[1];
    }

    stickerPackData.stickers = Object.entries(stickerPackData.stickers).map(
      ([stickerID, sticker]: [string, any]) => {
        return { stickerID, ...sticker };
      }
    );
    stickerPacksMap[pack] = stickerPackData;
  }
  return stickerPacksMap;
}

async function pasteStickerFromPath(
  stickerPath: string,
  window: Electron.BrowserWindow,
  {
    closeWindowAfterSend = true,
    resizeWidth: resize,
    author = '',
    stickerPackID = '',
  }: {
    closeWindowAfterSend?: boolean;
    resizeWidth?: number;
    author?: string;
    stickerPackID?: string;
  } = {}
): Promise<void> {
  if (!fs.existsSync(stickerPath)) {
    throw new Error('Invalid file path');
  }

  const tempStickerFolder = path.join(app.getPath('appData'), 'temp');

  if (!fs.existsSync(tempStickerFolder)) {
    fs.mkdirSync(tempStickerFolder);
  }

  author = stripIllegalCharacters(author);
  stickerPackID = stripIllegalCharacters(stickerPackID);
  const tempStickerPath = path.join(
    tempStickerFolder,
    stickerPath.endsWith('.gif')
      ? `StampNyaa_${stickerPackID}_${author}.gif`
      : `StampNyaa_${stickerPackID}_${author}.png`
  );

  const { width, height } = await sharp(stickerPath).metadata();

  if (resize && resize < Math.max(width, height)) {
    try {
      if (stickerPath.endsWith('.gif')) {
        await sharp(stickerPath, { animated: true })
          .resize({
            width: resize,
            height: resize,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .gif()
          .toFile(tempStickerPath);
      } else {
        await sharp(stickerPath)
          .resize({
            width: resize,
            height: resize,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toFile(tempStickerPath);
      }
    } catch (_error) {
      console.log('Unsupported image format, could not resize');
      fs.copyFileSync(stickerPath, tempStickerPath);
    }
  } else {
    fs.copyFileSync(stickerPath, tempStickerPath);
  }

  if (process.platform !== 'linux') {
    clipboardEx!.writeFilePaths([tempStickerPath]);
  } else {
    clipboard.writeImage(tempStickerPath as unknown as Electron.NativeImage);
  }
  console.log(`Wrote sticker to clipboard from path ${tempStickerPath}`);

  if (closeWindowAfterSend) {
    if (process.platform === 'darwin') {
      app.hide();
      await new Promise((resolve) => setTimeout(resolve, 100));
    } else window.minimize();
  } else {
    window.setAlwaysOnTop(true);
    window.setFocusable(false);
  }

  await keyboard.type(process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl, Key.V);

  if (!closeWindowAfterSend) {
    window.setFocusable(true);
    window.setAlwaysOnTop(false);
  }
}

function stripIllegalCharacters(string: string): string {
  return string.replace(/[/\\?%*:|"<>]/g, '');
}

export { pasteStickerFromPath, getAllStickerPacks };
