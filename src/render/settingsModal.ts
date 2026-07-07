export async function setUpThemeSelect(): Promise<void> {
  let theme = await window.api.getTheme();

  function setTheme(theme: string): void {
    const colors = [
      'primary-color',
      'background-color',
      'white-color',
      'red-color',
      'green-color',
      'yellow-color',
      'gray-color',
      'text-color',
    ];
    const root = document.documentElement;
    for (const color of colors) {
      root.style.setProperty(`--${color}`, `var(--${theme}-${color})`);
    }
  }

  setTheme(theme);
  const themeSelect = document.getElementById('theme-select')!;
  const themes = [...themeSelect.children] as HTMLElement[];
  for (const themeSelector of themes) {
    const elementTheme = themeSelector.dataset.theme!;
    if (elementTheme === theme) {
      themeSelector.classList.add('active');
    }
    themeSelector.style.backgroundColor = `var(--${elementTheme}-background-color)`;

    themeSelector.addEventListener('click', () => {
      for (const ts of themes) {
        ts.classList.remove('active');
      }
      themeSelector.classList.add('active');
      theme = elementTheme;
      setTheme(theme);
      window.api.setTheme(theme);
    });
  }
}

export async function setUpSettingsModal(): Promise<void> {
  const settingsModalBackground = document.getElementById('settings-background') as HTMLElement;
  const settingsButton = document.getElementById('settings-button')!;

  settingsButton.addEventListener('click', () => {
    settingsModalBackground.style.display = 'block';
  });

  settingsModalBackground.addEventListener('click', (e) => {
    if (e.target === settingsModalBackground) {
      settingsModalBackground.style.display = 'none';
    }
  });

  const hotkeyInputContainer = document.getElementById('hotkey-input-container')!;
  const hotkeyInput = document.getElementById('hotkey-input') as HTMLInputElement;
  const pressedkeys = new Set<string>();
  let hotkeyString = await window.api.getHotkey();
  hotkeyInput.value = hotkeyString;
  let newHotkey = '';

  function keyToUpper(key: string): string {
    if (key.length === 1) {
      key = key.toUpperCase();
    }
    return key;
  }

  hotkeyInput.addEventListener('keydown', (e) => {
    const key = keyToUpper(e.key);
    if (key == 'Meta') {
      return;
    }

    window.api.disableHotkey();
    e.preventDefault();
    hotkeyInputContainer.classList.add('active');
    if (key === 'Escape') {
      hotkeyInput.value = hotkeyString;
      pressedkeys.clear();
      return;
    } else {
      pressedkeys.add(key);
      newHotkey = [...pressedkeys].join('+');
      hotkeyInput.value = newHotkey;
    }
  });

  hotkeyInput.addEventListener('keyup', (e) => {
    const key = keyToUpper(e.key);
    e.preventDefault();
    pressedkeys.delete(key);
    if (pressedkeys.size === 0) {
      hotkeyInputContainer.classList.remove('active');
      hotkeyString = newHotkey;
      window.api.setHotkey(hotkeyString);
      window.api.enableHotkey();
    }
  });

  const runOnStartup = document.getElementById('run-on-startup')!;
  const runOnStartupCheck = document.getElementById('run-on-startup-check') as HTMLElement;
  const runOnStartupEnabled = await window.api.getRunOnStartup();
  runOnStartupCheck.style.display = runOnStartupEnabled ? 'block' : 'none';
  runOnStartup.addEventListener('click', () => {
    if (runOnStartupCheck.style.display === 'none') {
      runOnStartupCheck.style.display = 'block';
      window.api.setRunOnStartup(true);
    } else {
      runOnStartupCheck.style.display = 'none';
      window.api.setRunOnStartup(false);
    }
  });

  const widthInput = document.getElementById('fit-to-width-input') as HTMLInputElement;
  let resizeWidth = await window.api.getResizeWidth();
  widthInput.value = String(resizeWidth);
  widthInput.addEventListener('change', () => {
    const inputWidth = parseInt(widthInput.value);
    if (isNaN(inputWidth) || inputWidth <= 0) {
      widthInput.value = String(resizeWidth);
      return;
    }
    resizeWidth = inputWidth;
    window.api.setResizeWidth(resizeWidth);
  });
  widthInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      widthInput.blur();
    }
  });

  const version = await window.api.getVersion();
  document.getElementById('versionString')!.textContent = version;
}
