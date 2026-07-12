const fs = require('fs');
const path = require('path');

module.exports = {
  packagerConfig: {
    asar: false,
    executableName: 'stampnyaa',
    icon: './assets/icon',
    extendInfo: {
      LSUIElement: true,
    },
    ignore: (path) => {
      const libnutMatch = path.match(/node_modules\/@nut-tree-fork\/libnut-([^/]+)/);
      if (libnutMatch) {
        const platform = libnutMatch[1];
        const keep =
          process.platform === 'darwin'
            ? 'darwin'
            : process.platform === 'win32'
              ? 'win32'
              : 'linux-x64';
        return platform !== keep;
      }
      return /\/node_modules\/\.bin\//.test(path);
    },
  },
  rebuildConfig: {
    ignoreModules: ['electron-clipboard-ex'],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        setupIcon: './assets/icon.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      executableName: 'stampnyaa',
      config: {
        options: {
          icon: './assets/icon.png',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'kakenbutter',
          name: 'StampNyaa',
        },
        draft: true,
      },
    },
  ],
  hooks: {
    // Fix sqlite links out of the package https://www.update.rocks/blog/fixing-the-python3/
    packageAfterPrune: async (forgeConfig, buildPath, electronVersion, platform, _arch) => {
      try {
        if (platform === 'darwin' || platform === 'linux') {
          console.log('We need to remove the problematic link file on macOS/Linux');
          console.log(`Build path ${buildPath}`);
          fs.unlinkSync(path.join(buildPath, 'node_modules/sqlite3/build/node_gyp_bins/python3'));
        }
      } catch {
        console.log('python3 not found');
      }
    },
  },
};
