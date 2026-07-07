import { app } from 'electron';
import axios from 'axios';
import type ElectronStore from 'electron-store';

const version = app.getVersion();
const platform = process.platform;

async function checkUpdate(config: ElectronStore<Record<string, unknown>>): Promise<string | null> {
  if (platform === 'win32') {
    return null;
  }

  const lastCheckUpdateTime = config.get('lastCheckUpdateTime', new Date(0).valueOf()) as number;
  console.log(
    `Last check update time: ${new Date(lastCheckUpdateTime).toLocaleString()} which was ${(
      (Date.now() - lastCheckUpdateTime) /
      1000 /
      60
    ).toFixed(1)} minutes ago.`
  );

  if (Date.now() - lastCheckUpdateTime < 5 * 60 * 1000) {
    return null;
  }

  config.set('lastCheckUpdateTime', Date.now().valueOf());
  const url = 'https://api.github.com/repos/MarvNC/StampNyaa/releases/latest';
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'StampNyaa Update Check',
    },
  });
  const latestVersion = (data.tag_name as string).split('v')[1];
  console.log(`Latest version: ${latestVersion}`);
  if (compareVersionString(latestVersion, version)) {
    console.log('Update available');
    return latestVersion;
  }
  console.log('No update available');
  return null;
}

function compareVersionString(v1: string, v2: string): boolean {
  const v1Parts = v1.split('.');
  const v2Parts = v2.split('.');

  for (let i = 0; i < v1Parts.length; i++) {
    if (v1Parts[i] > v2Parts[i]) {
      return true;
    } else if (v1Parts[i] < v2Parts[i]) {
      return false;
    }
  }

  return false;
}

export default checkUpdate;
