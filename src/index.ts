import { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray, shell, screen } from 'electron';
import * as path from 'path';
import * as stickerHandler from './utils/stickerHandler';
import Store from 'electron-store';
import downloadPack from './utils/lineDownloader';
import checkUpdate from './utils/checkUpdate';
import sqlHandler from './utils/sqlHandler';
import squirrelStartup from 'electron-squirrel-startup';

const args = process.argv.slice(1);
if (!args.includes('--squirrel-firstrun')) {
  if (process.platform === 'win32') {
    console.log('Checking for updates...');
    const updateElectronApp = require('update-electron-app');
    updateElectronApp();
  }
}

let window: Electron.BrowserWindow;

const store = new Store({
  defaults: {
    stickersPath: path.join(app.getPath('pictures'), 'Stickers'),
  },
});
const config = new Store({
  cwd: store.get('stickersPath') as string,
  defaults: {
    stickerPacksOrder: [] as string[],
    theme: 'blue',
    hotkey: 'CommandOrControl+Shift+A',
    runOnStartup: true,
    resizeWidth: 160,
  },
});
sqlHandler.init(path.join(store.get('stickersPath') as string, 'stickers.db'));

if (squirrelStartup) {
  app.quit();
}

const createWindow = async () => {
  window = new BrowserWindow({
    icon: path.join(__dirname, '../assets/icon.ico'),
    width: 930,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    transparent: true,
    frame: false,
    minWidth: 624,
    minHeight: 450,
    skipTaskbar: true,
  });

  await window.loadFile(path.join(__dirname, '../src/index.html'));

  window.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    shell.openExternal(url);
    return { action: 'deny' as const };
  });

  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  app.on('browser-window-blur', () => {
    setTimeout(() => {
      if (!app.isActive()) window!.hide();
    }, 50);
  });
};

app.setActivationPolicy('accessory');

app.on('ready', async () => {
  await createWindow();

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  const appIcon = new Tray(path.join(__dirname, '../assets/icon-16x16.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: function () {
        toggleWindow();
      },
    },
    {
      label: 'Quit',
      click: function () {
        app.quit();
      },
    },
  ]);

  appIcon.setContextMenu(contextMenu);
  appIcon.on('click', () => {
    toggleWindow();
  });

  registerHotkey(config.get('hotkey') as string);
  setRunOnStartup(config.get('runOnStartup') as boolean);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  window.show();
});

if ((store as any).has('stickerPacksOrder')) {
  config.set('stickerPacksOrder', (store as any).get('stickerPacksOrder'));
  (store as any).delete('stickerPacksOrder');
}

function toggleWindow(): void {
  try {
    if (window.isFocused()) {
      window.hide();
    } else {
      const currentScreen = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      const isWindowOnCurrentScreen =
        currentScreen.bounds.x <= window.getPosition()[0] &&
        window.getPosition()[0] <= currentScreen.bounds.x + currentScreen.bounds.width &&
        currentScreen.bounds.y <= window.getPosition()[1] &&
        window.getPosition()[1] <= currentScreen.bounds.y + currentScreen.bounds.height;
      if (!isWindowOnCurrentScreen) {
        const windowSize = window.getSize();
        let moveToX = currentScreen.bounds.x + currentScreen.bounds.width / 2 - windowSize[0] / 2;
        let moveToY = currentScreen.bounds.y + currentScreen.bounds.height / 2 - windowSize[1] / 2;
        moveToX = Math.floor(moveToX);
        moveToY = Math.floor(moveToY);
        window.setPosition(moveToX, moveToY);
      }
      window.show();
    }
  } catch {
    createWindow();
  }
}

function registerHotkey(hotkey: string): void {
  try {
    globalShortcut.register(hotkey, () => {
      toggleWindow();
    });
  } catch (_error) {
    config.reset('hotkey');
  }
}

ipcMain.on('close-window', () => {
  window.hide();
});

ipcMain.handle('ready', () => {
  const stickerPacksMap = stickerHandler.getAllStickerPacks(store.get('stickersPath') as string);
  let stickerPacksOrder = [...new Set(config.get('stickerPacksOrder') as string[])].filter(
    (pack) => pack in stickerPacksMap
  );
  const newStickerPacks = Object.keys(stickerPacksMap).filter(
    (pack) => !stickerPacksOrder.includes(pack)
  );
  if (newStickerPacks.length > 0) {
    stickerPacksOrder = stickerPacksOrder.concat(newStickerPacks);
  }
  config.set('stickerPacksOrder', stickerPacksOrder);
  return {
    stickerPacksMap: stickerPacksMap,
    stickerPacksOrder: config.get('stickerPacksOrder'),
    hotkey: config.get('hotkey'),
  };
});

ipcMain.handle(
  'send-sticker',
  async (_event: Electron.IpcMainEvent, stickerPath: string, settings: any) => {
    settings.resizeWidth = config.get('resizeWidth');
    await stickerHandler.pasteStickerFromPath(stickerPath, window, settings);
    await sqlHandler.useSticker({ PackID: settings.stickerPackID, StickerID: settings.stickerID });
  }
);

ipcMain.on('download-sticker-pack', async (event: Electron.IpcMainEvent, url: string) => {
  const port = event.ports[0] as unknown as MessagePort;
  await downloadPack(url, port, store.get('stickersPath') as string);
});

ipcMain.on(
  'set-sticker-pack-order',
  (_event: Electron.IpcMainEvent, stickerPackOrder: string[]) => {
    config.set('stickerPacksOrder', stickerPackOrder);
  }
);

ipcMain.handle('get-theme', () => {
  return config.get('theme');
});

ipcMain.on('set-theme', (_event: Electron.IpcMainEvent, theme: string) => {
  config.set('theme', theme);
});

ipcMain.handle('get-hotkey', () => {
  return config.get('hotkey');
});

ipcMain.on('set-hotkey', (_event: Electron.IpcMainEvent, hotkey: string) => {
  config.set('hotkey', hotkey);
});

ipcMain.on('disable-hotkey', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('enable-hotkey', () => {
  registerHotkey(config.get('hotkey') as string);
});

function setRunOnStartup(runOnStartup: boolean): void {
  const appFolder = path.dirname(process.execPath);
  const updateExe = path.resolve(appFolder, '..', 'Update.exe');
  const exeName = path.basename(process.execPath);

  app.setLoginItemSettings({
    openAtLogin: runOnStartup,
    path: updateExe,
    args: ['--processStart', `"${exeName}"`, '--process-start-args', '"--hidden"'],
  });
}

ipcMain.handle('get-run-on-startup', () => {
  return config.get('runOnStartup');
});

ipcMain.on('set-run-on-startup', (_event: Electron.IpcMainEvent, runOnStartup: boolean) => {
  setRunOnStartup(runOnStartup);
  config.set('runOnStartup', runOnStartup);
});

ipcMain.handle('get-resize-width', () => {
  return config.get('resizeWidth');
});

ipcMain.on('set-resize-width', (_event: Electron.IpcMainEvent, width: number) => {
  config.set('resizeWidth', width);
});

ipcMain.handle('get-updates', async () => {
  return await checkUpdate(config as any);
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.on('set-favorites', async (_event: Electron.IpcMainEvent, favorites: unknown) => {
  await sqlHandler.setFavorites(favorites as { PackID: string; StickerID: string }[]);
});

ipcMain.handle('get-favorites', () => {
  return sqlHandler.getFavorites();
});

ipcMain.handle('get-most-used', () => {
  return sqlHandler.getMostUsed(15);
});

ipcMain.handle('clear-most-used', () => {
  return sqlHandler.clearMostUsed();
});
