import axios, { AxiosResponse } from 'axios';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import { finished } from 'node:stream/promises';
import * as path from 'path';
import { sharpFromApng } from 'sharp-apng';
import sharp from '@janhapke/sharp-electron';
import { revert } from 'cgbi-to-png';

const cdnURL = 'https://stickershop.line-scdn.net';
const mainImageURL = (packID: string) =>
  `${cdnURL}/stickershop/v1/product/${packID}/LINEStorePC/main.png?v=1`;
const stickerURL = (stickerId: string) =>
  `${cdnURL}/stickershop/v1/sticker/${stickerId}/IOS/sticker@2x.png`;
const fallbackStickerURL = (stickerId: string) =>
  `${cdnURL}/stickershop/v1/sticker/${stickerId}/android/sticker.png`;
const animatedStickerURL = (stickerId: string) =>
  `${cdnURL}/stickershop/v1/sticker/${stickerId}/iPhone/sticker_animation@2x.png`;
const fallbackAnimatedStickerURL = (stickerId: string) =>
  `${cdnURL}/stickershop/v1/sticker/${stickerId}/android/sticker_animation.png`;
const popupStickerURL = (stickerId: string) =>
  `${cdnURL}/stickershop/v1/sticker/${stickerId}/IOS/sticker_popup.png`;
const fallbackPopupStickerURL = (stickerId: string) =>
  `${cdnURL}/stickershop/v1/sticker/${stickerId}/android/sticker_popup.png`;

const packIDRegex = /stickershop\/product\/(\d+)/;

interface StickerJSON {
  id: string;
  type: string;
}

async function downloadPack(
  storeURL: string,
  port: MessagePort,
  directory: string
): Promise<{ title: string; author: string; authorURL: string } | undefined> {
  let response: AxiosResponse<any, any, object>;
  try {
    response = await axios.get(storeURL);
  } catch (_error) {
    port.postMessage({
      type: 'download-sticker-pack',
      error: 'Error getting store page',
    });
    return;
  }
  const dom = new JSDOM(response.data);
  const document = dom.window.document;

  const packID = storeURL.match(packIDRegex)![1];
  const packDir = path.join(directory, '/', packID);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir);
  }

  const mainImage = path.join(packDir, 'main.png');
  if (!fs.existsSync(mainImage)) {
    const imgResponse = await axios({
      method: 'get',
      url: mainImageURL(packID),
      responseType: 'stream',
    });
    imgResponse.data.pipe(fs.createWriteStream(mainImage));
  }

  const title = document.title.split(' - ')[0];
  console.log(`Got store page for ${title}...`);

  const authorAnchor = document.querySelector('a[data-test="sticker-author"]') as HTMLAnchorElement;
  const author = authorAnchor.textContent!;
  const authorURL = new URL(storeURL).origin + authorAnchor.href;

  const stickerLiList = [...document.querySelectorAll('.mdCMN09Li')] as HTMLElement[];

  console.log(`Downloading ${stickerLiList.length} stickers from ${storeURL}...`);
  port.postMessage({
    type: 'download-sticker-pack',
    title,
    author,
    stickerCount: stickerLiList.length,
    progress: 0,
  });

  const stickerList: StickerJSON[] = [];
  for (const stickerLi of stickerLiList) {
    const stickerJSON = JSON.parse(stickerLi.dataset.preview!) as StickerJSON;
    stickerList.push(stickerJSON);
  }

  for (let i = 0; i < stickerList.length; i++) {
    const sticker = stickerList[i];
    const staticUrl = stickerURL(sticker.id);
    await downloadImage(staticUrl, packDir, `${sticker.id}.png`);
    const isValid = await processImage(path.join(packDir, `${sticker.id}.png`));
    if (!isValid) {
      await downloadImage(fallbackStickerURL(sticker.id), packDir, `${sticker.id}.png`);
      await processImage(path.join(packDir, `${sticker.id}.png`));
    }

    if (sticker.type === 'animation' || sticker.type === 'popup') {
      let downloadURL =
        sticker.type === 'animation' ? animatedStickerURL(sticker.id) : popupStickerURL(sticker.id);
      await downloadImage(downloadURL, packDir, `${sticker.id}_${sticker.type}.png`);
      const converted = await processImage(
        path.join(packDir, `${sticker.id}_${sticker.type}.png`),
        true
      );
      if (!converted) {
        fs.rm(path.join(packDir, `${sticker.id}_${sticker.type}.gif`), (err) => console.log(err));
        downloadURL =
          sticker.type === 'animation'
            ? fallbackAnimatedStickerURL(sticker.id)
            : fallbackPopupStickerURL(sticker.id);
        await downloadImage(downloadURL, packDir, `${sticker.id}_${sticker.type}.png`);
        await processImage(path.join(packDir, `${sticker.id}_${sticker.type}.png`), true);
      }
      fs.rm(path.join(packDir, `${sticker.id}_${sticker.type}.png`), (err) => console.log(err));
    }

    console.log(`Downloaded ${i + 1}/${stickerList.length} stickers`);
    port.postMessage({
      type: 'download-sticker-pack',
      title,
      author,
      stickerCount: stickerList.length,
      progress: i + 1,
    });
  }

  const info = {
    title,
    storeURL,
    author,
    authorURL,
  };
  fs.writeFileSync(path.join(packDir, 'info.json'), JSON.stringify(info));

  console.log(`Finished downloading ${title}!`);
  port.postMessage({
    type: 'download-sticker-pack',
    title,
    author,
    stickerCount: stickerList.length,
    progress: stickerList.length,
  });

  return {
    title,
    author,
    authorURL,
  };
}

async function downloadImage(url: string, dir: string, filename: string): Promise<boolean> {
  console.log(`Downloading ${url} to ${filename}...`);
  return new Promise((resolve, _reject) => {
    const filePath = path.join(dir, filename);
    const writer = fs.createWriteStream(filePath);
    axios.get(url, { responseType: 'stream' }).then((response) => {
      response.data.pipe(writer);
    });
    finished(writer).then(() => {
      console.log(`Wrote ${filename}`);
      resolve(true);
    });
  });
}

async function processImage(imagePath: string, animated = false): Promise<boolean> {
  try {
    if (animated) {
      const { image, width, height } = (await sharpFromApng(
        imagePath,
        {
          transparent: true,
        },
        true
      )) as unknown as { image: sharp.Sharp; width: number; height: number };
      const size = Math.max(width.valueOf(), height.valueOf());
      await image
        .resize({
          width: size,
          height: size,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .gif()
        .toFile(imagePath.replace('.png', '.gif'));
    } else {
      const buffer = fs.readFileSync(imagePath);
      const image = sharp(
        buffer.length >= 24 &&
          buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
          buffer.subarray(12, 16).toString('ascii') === 'CgBI'
          ? revert(buffer)
          : imagePath
      );
      const { width, height } = await image.metadata();
      const size = Math.max(width, height);
      fs.writeFileSync(
        imagePath,
        await image
          .resize({
            width: size,
            height: size,
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer()
      );
    }
    console.log('Image processed successfully.');
    return true;
  } catch (e) {
    console.error(e);
    console.log('Image could not be processed.');
    return false;
  }
}

export default downloadPack;
