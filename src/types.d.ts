interface Api {
  closeWindow: () => void;
  ready: () => Promise<{
    stickerPacksMap: Record<string, StickerPackData>;
    stickerPacksOrder: string[];
    hotkey: string;
  }>;
  sendSticker: (stickerPath: string, settings: StickerSettings) => Promise<void>;
  downloadStickerPack: (url: string) => void;
  setStickerPackOrder: (order: string[]) => void;
  getHotkey: () => Promise<string>;
  setHotkey: (hotkey: string) => void;
  disableHotkey: () => void;
  enableHotkey: () => void;
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => void;
  getRunOnStartup: () => Promise<boolean>;
  setRunOnStartup: (runOnStartup: boolean) => void;
  getResizeWidth: () => Promise<number>;
  setResizeWidth: (width: number) => void;
  getUpdates: () => Promise<string | null>;
  getVersion: () => Promise<string>;
  setFavorites: (favorites: { PackID: string; StickerID: string }[]) => void;
  getFavorites: () => Promise<{ PackID: string; StickerID: string; position: number }[]>;
  getMostUsed: () => Promise<{ PackID: string; StickerID: string; count: number }[]>;
  clearMostUsed: () => Promise<void>;
}

interface StickerSettings {
  stickerID: string;
  stickerPackID: string;
  title: string;
  author: string;
}

interface StickerPackData {
  title: string;
  mainIcon: string;
  stickers: StickerData[];
  author: string;
  authorURL: string;
  storeURL: string;
  id: string;
}

interface StickerData {
  stickerID: string;
  filepath: string;
  type: string;
  specialPath?: string;
  stickerPackID: string;
}

interface Window {
  api: Api;
}

declare module 'update-electron-app' {
  const updateElectronApp: () => void;
  export default updateElectronApp;
}

declare module 'electron-squirrel-startup' {
  const squirrelStartup: boolean;
  export default squirrelStartup;
}
