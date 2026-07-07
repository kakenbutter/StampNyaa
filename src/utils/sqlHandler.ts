import sqlite3Module from 'sqlite3';

const sqlite3 = sqlite3Module.verbose();

interface FavoriteRow {
  PackID: string;
  StickerID: string;
  position: number;
}

interface StickerUseRow {
  PackID: string;
  StickerID: string;
  count: number;
}

const sqlHandler = {
  db: null as any,

  init(path: string): void {
    this.db = new sqlite3.Database(path, (err: Error | null) => {
      if (err) {
        console.error(err.message);
      }
      console.log('Connected to the stickers database.');
    });

    this.db.run(
      `CREATE TABLE IF NOT EXISTS favorites (
        PackID TEXT NOT NULL,
        StickerID TEXT NOT NULL,
        position INTEGER NOT NULL,
        PRIMARY KEY (packID, StickerID)
      )`
    );

    this.db.run(
      `CREATE TABLE IF NOT EXISTS stickerUses (
        PackID TEXT NOT NULL,
        StickerID TEXT NOT NULL,
        count INTEGER NOT NULL,
        PRIMARY KEY (packID, StickerID)
      )`
    );
  },

  getFavorites(): Promise<FavoriteRow[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM favorites ORDER BY position',
        (err: Error | null, rows: FavoriteRow[]) => {
          if (err) {
            reject(err);
          }
          resolve(rows);
        }
      );
    });
  },

  setFavorites(favorites: { PackID: string; StickerID: string }[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const favMap: Record<string, number> = favorites.reduce(
        (
          acc: Record<string, number>,
          curr: { PackID: string; StickerID: string },
          index: number
        ) => {
          acc[curr.PackID + ';' + curr.StickerID] = index;
          return acc;
        },
        {}
      );
      this.db.serialize(() => {
        this.db.all('SELECT * FROM favorites', (err: Error | null, rows: FavoriteRow[]) => {
          if (err) {
            reject(err);
          }
          rows.forEach((row) => {
            const key = row.PackID + ';' + row.StickerID;
            if (favMap[key] === undefined) {
              this.db.run('DELETE FROM favorites WHERE PackID = ? AND StickerID = ?', [
                row.PackID,
                row.StickerID,
              ]);
            } else {
              this.db.run('UPDATE favorites SET position = ? WHERE PackID = ? AND StickerID = ?', [
                favMap[key],
                row.PackID,
                row.StickerID,
              ]);
              delete favMap[key];
            }
          });
          Object.keys(favMap).forEach((key) => {
            const [PackID, StickerID] = key.split(';');
            this.db.run('INSERT INTO favorites (PackID, StickerID, position) VALUES (?, ?, ?)', [
              PackID,
              StickerID,
              favMap[key],
            ]);
          });
        });
        resolve();
      });
    });
  },

  getMostUsed(count: number): Promise<StickerUseRow[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM stickerUses ORDER BY count DESC LIMIT ${count}`,
        (err: Error | null, rows: StickerUseRow[]) => {
          if (err) {
            reject(err);
          }
          resolve(rows);
        }
      );
    });
  },

  useSticker(sticker: { PackID: string; StickerID: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO stickerUses (PackID, StickerID, count) VALUES (?, ?, 1)
        ON CONFLICT(PackID, StickerID) DO UPDATE SET count = count + 1`,
        [sticker.PackID, sticker.StickerID],
        (err: Error | null) => {
          if (err) {
            reject(err);
          }
          resolve();
        }
      );
    });
  },
};

export default sqlHandler;
