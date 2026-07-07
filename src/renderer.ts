import { setUpAddStickerModal } from './render/addStickerModal';
import { setUpMenuBarButtons } from './render/menuBar';
import { setUpThemeSelect, setUpSettingsModal } from './render/settingsModal';
import { StickerRenderer } from './render/stickerRenderer';
import { setUpUpdateModal } from './render/updateModal';

const stickerRenderer = new StickerRenderer();

window.addEventListener('DOMContentLoaded', async () => {
  setUpAddStickerModal(stickerRenderer);
  setUpMenuBarButtons();
  setUpThemeSelect();
  stickerRenderer.populateStickerPacks();
  setUpSettingsModal();
  setUpUpdateModal();
});
