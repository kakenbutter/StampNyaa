import {
  Sortable,
  type SortableSortedEvent,
  type SortableStopEvent,
  type DragStartEvent,
} from '@shopify/draggable';

interface StickerPackConfig {
  title: string;
  mainIcon?: string;
  stickers: StickerData[];
  author?: string;
  authorURL?: string;
  storeURL?: string;
  noIcon?: boolean;
}

export class StickerRenderer {
  sorting = false;
  mouseX = 0;
  mouseY = 0;
  stickerPacksMap: Record<string, StickerPackData> = {};
  stickerPacksOrder: string[] = [];
  stickerContainer: HTMLElement;
  stickerPackListDiv: HTMLElement;

  constructor() {
    document.addEventListener('mousemove', (e: MouseEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
    this.stickerContainer = document.getElementById('sticker-list')!;
    this.stickerPackListDiv = document.getElementById('sticker-pack-list')!;
  }

  async populateStickerPacks(): Promise<void> {
    const data = await window.api.ready();
    this.stickerPacksMap = data.stickerPacksMap;
    this.stickerPacksOrder = data.stickerPacksOrder;

    this.updateMostUsed();

    const favorites = await window.api.getFavorites();
    const favoritesDiv = this.makeAndSetUpStickerPack('favorites', {
      title: '<i class="fa-solid fa-star"></i> Favorites',
      stickers: favorites.map(({ PackID, StickerID }) => {
        const stickerPack = this.stickerPacksMap[PackID];
        const sticker = stickerPack.stickers.find((s) => s.stickerID === StickerID);
        return sticker!;
      }),
      noIcon: true,
    });
    if (favoritesDiv) {
      this.stickerContainer.appendChild(favoritesDiv);
      this.setUpDraggableFavorites(favoritesDiv);
    }
    await this.updateFavoritesEmpty();

    const icons = ['most-used', 'favorites'];
    for (const icon of icons) {
      const iconDiv = document.getElementById(`${icon}-icon`);
      iconDiv?.addEventListener('click', () => {
        const stickerPackDiv = document.getElementById(`sticker-pack-container-${icon}`);
        if (icon === 'most-used') this.stickerContainer.scrollTop = 0;
        else stickerPackDiv!.scrollIntoView({ behavior: 'instant' });
        document.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
      });
    }

    for (const stickerPackID of this.stickerPacksOrder) {
      const stickerPack = this.stickerPacksMap[stickerPackID];
      const stickerPackDiv = this.makeAndSetUpStickerPack(stickerPackID, stickerPack);
      if (stickerPackDiv) {
        this.stickerContainer.appendChild(stickerPackDiv);
      }
    }

    this.stickerContainer.addEventListener('scroll', (e) => {
      const stickerContainerRect = this.stickerContainer.getBoundingClientRect();
      if (
        this.mouseX >= stickerContainerRect.left &&
        this.mouseX <= stickerContainerRect.right &&
        this.mouseY >= stickerContainerRect.top &&
        this.mouseY <= stickerContainerRect.bottom
      ) {
        const topElementOffset = this.stickerPackListDiv.offsetTop;
        const scrollPos = (e.currentTarget as HTMLElement).scrollTop + topElementOffset;
        const stickerPackDivs = document.getElementsByClassName('sticker-pack');
        for (let i = 0; i < stickerPackDivs.length; i++) {
          const stickerPackDiv = stickerPackDivs[i] as HTMLElement;
          const packID = stickerPackDiv.dataset.packID;
          const stickerPackIconDiv = document.querySelector(
            `.sticker-pack-icon-wrapper[data-pack-i-d="${packID}"]`
          ) as HTMLElement | null;
          if (!stickerPackIconDiv) continue;
          const stickerPackDivTop = stickerPackDiv.offsetTop;
          const stickerPackDivBottom = stickerPackDivTop + stickerPackDiv.offsetHeight;
          if (scrollPos >= stickerPackDivTop && scrollPos <= stickerPackDivBottom) {
            stickerPackIconDiv.scrollIntoView({ behavior: 'instant' });
            stickerPackIconDiv.classList.add('active');
          } else {
            stickerPackIconDiv.classList.remove('active');
          }
        }
      }
    });

    this.setUpDraggableIcons();
  }

  setUpDraggableIcons(): void {
    const sortable = new Sortable(this.stickerPackListDiv, {
      draggable: '.sticker-pack-icon-wrapper',
    });

    sortable.on('drag:start', (event: DragStartEvent) => {
      const original = event.originalEvent as MouseEvent | PointerEvent;
      if (!original.shiftKey) event.cancel();
    });

    sortable.on('sortable:start', () => {
      this.sorting = true;
    });

    sortable.on('sortable:sorted', (event: SortableSortedEvent) => {
      event.dragEvent.source.classList.add('active');
    });

    sortable.on('sortable:stop', (event: SortableStopEvent) => {
      this.sorting = false;
      const rearrangedStickerPack = event.dragEvent.source;
      const rearrangedStickerPackID = rearrangedStickerPack.dataset.packID!;
      const rearrangedStickerPackContainer = document.getElementById(
        `sticker-pack-container-${rearrangedStickerPackID}`
      )!;

      this.stickerContainer.removeChild(rearrangedStickerPackContainer);
      this.stickerPacksOrder = this.stickerPacksOrder.filter(
        (id) => id !== rearrangedStickerPackID
      );
      this.stickerPacksOrder.splice(event.newIndex, 0, rearrangedStickerPackID);

      if (event.newIndex !== this.stickerPacksOrder.length - 1) {
        this.stickerContainer.insertBefore(
          rearrangedStickerPackContainer,
          document.getElementById(
            'sticker-pack-container-' + this.stickerPacksOrder[event.newIndex + 1]
          )!
        );
      } else {
        this.stickerContainer.appendChild(rearrangedStickerPackContainer);
      }

      window.api.setStickerPackOrder(this.stickerPacksOrder);
    });
  }

  setUpDraggableFavorites(favoritesPackDiv: HTMLElement): void {
    const sortable = new Sortable(favoritesPackDiv, {
      draggable: '.sticker',
    });

    sortable.on('drag:start', (event: DragStartEvent) => {
      const original = event.originalEvent as MouseEvent | PointerEvent;
      if (!original.shiftKey) event.cancel();
    });
    sortable.on('sortable:sorted', () => {});
    sortable.on('sortable:stop', () => {
      setTimeout(() => {
        this.updateFavorites();
      }, 100);
    });
  }

  makeAndSetUpStickerPack(
    stickerPackID: string,
    stickerPack: StickerPackConfig
  ): HTMLDivElement | undefined {
    const {
      title,
      mainIcon,
      stickers,
      author = '',
      authorURL = '',
      storeURL = '',
      noIcon = false,
    } = stickerPack;

    if (!noIcon) {
      if (!document.getElementById(`sticker-pack-icon-${stickerPackID}`)) {
        const stickerIconDiv = document.createElement('div');
        stickerIconDiv.classList.add('sticker-pack-icon-wrapper');
        stickerIconDiv.dataset.packID = stickerPackID;
        stickerIconDiv.id = `sticker-pack-icon-${stickerPackID}`;

        const stickerIconImg = document.createElement('img');
        stickerIconImg.src = mainIcon ?? '';
        stickerIconDiv.appendChild(stickerIconImg);
        this.stickerPackListDiv.appendChild(stickerIconDiv);

        stickerIconDiv.addEventListener('click', (e) => {
          const stickerPackDiv = document.getElementById(`sticker-pack-container-${stickerPackID}`);
          stickerPackDiv!.scrollIntoView({ behavior: 'instant' });
          document.querySelectorAll('.active').forEach((el) => el.classList.remove('active'));
          (e.currentTarget as HTMLElement).classList.add('active');
        });
      }
    }

    let stickerPackDiv = document.getElementById(
      `sticker-pack-container-${stickerPackID}`
    ) as HTMLDivElement;
    if (!stickerPackDiv) {
      stickerPackDiv = document.createElement('div');
      stickerPackDiv.classList.add('sticker-pack');
      stickerPackDiv.dataset.packID = stickerPackID;
      stickerPackDiv.id = `sticker-pack-container-${stickerPackID}`;
    } else stickerPackDiv.innerHTML = '';
    const stickerPackHeader = createElementFromHTML(`
<div class="sticker-pack-header">
<a class="sticker-pack-title" ${storeURL ? `href="${storeURL}"` : ''} target="_blank">${title}</a>
${author ? `<a class="sticker-pack-author" ${authorURL ? `href="${authorURL}"` : ''} target="_blank">${author}</a>` : ''}
</div>
`) as HTMLElement;
    stickerPackDiv.appendChild(stickerPackHeader);
    for (const sticker of stickers) stickerPackDiv.appendChild(this.createSticker(sticker));
    return stickerPackDiv;
  }

  updateMostUsed(scrollToView = false): void {
    let mostUsedDiv = document.getElementById('sticker-pack-container-most-used');
    if (!mostUsedDiv) {
      mostUsedDiv = document.createElement('div');
      mostUsedDiv.classList.add('sticker-pack');
      mostUsedDiv.id = 'sticker-pack-container-most-used';
      try {
        this.stickerContainer.insertBefore(
          mostUsedDiv,
          document.getElementById('sticker-pack-container-favorites')!
        );
      } catch {
        this.stickerContainer.appendChild(mostUsedDiv);
      }
    }

    window.api
      .getMostUsed()
      .then(async (mostUsed) => {
        const mostUsedDiv = this.makeAndSetUpStickerPack('most-used', {
          title: '<i class="fa-solid fa-clock-rotate-left"></i> Most Used',
          stickers: mostUsed.map(({ PackID, StickerID }) => {
            const stickerPack = this.stickerPacksMap[PackID];
            const sticker = stickerPack.stickers.find((s) => s.stickerID === StickerID);
            return sticker!;
          }),
          noIcon: true,
        });
        const headerDiv = mostUsedDiv.querySelector('.sticker-pack-header');
        if (headerDiv) {
          headerDiv.appendChild(createElementFromHTML(`<a class="most-used-clear">clear</a>`));
          headerDiv
            .querySelector('.most-used-clear')
            .addEventListener('click', () =>
              window.api.clearMostUsed().then(() => this.updateMostUsed(true))
            );
        }
        if (scrollToView) this.stickerContainer.scrollTop = 0; // mostUsedDiv.scrollIntoView({ behavior: 'instant' });
      })
      .finally(async () => await this.updateMostUsedEmpty());
  }

  async updateMostUsedEmpty(): Promise<void> {
    const mostUsedDiv = document.getElementById('sticker-pack-container-most-used');
    if (mostUsedDiv.getElementsByClassName('sticker').length === 0)
      mostUsedDiv.appendChild(
        createElementFromHTML(
          `<span class="section-empty">Nothing here yet...</span>`
        ) as HTMLElement
      );
    else if (mostUsedDiv.querySelector('.section-empty'))
      mostUsedDiv.querySelector('.section-empty').remove();
  }

  createSticker(sticker: StickerData): HTMLDivElement {
    const stickerID = sticker.stickerID;
    const stickerDiv = document.createElement('div');
    stickerDiv.classList.add('sticker');
    stickerDiv.dataset.stickerID = stickerID;
    stickerDiv.dataset.type = sticker.type;
    stickerDiv.dataset.filepath = sticker.filepath;
    stickerDiv.dataset.packID = sticker.stickerPackID;

    const stickerImg = document.createElement('img');
    stickerImg.src = sticker.filepath;

    stickerDiv.appendChild(stickerImg);

    if (sticker.type !== 'static') {
      stickerDiv.classList.add('special');
      stickerDiv.dataset.specialPath = sticker.specialPath!;
      stickerDiv.addEventListener('mouseover', async (e) => {
        const { specialPath } = (e.currentTarget as HTMLElement).dataset;
        (e.currentTarget as HTMLElement).firstElementChild!.setAttribute('src', specialPath!);
      });
      stickerDiv.addEventListener('mouseout', async (e) => {
        const { filepath } = (e.currentTarget as HTMLElement).dataset;
        (e.currentTarget as HTMLElement).firstElementChild!.setAttribute('src', filepath!);
      });
    }

    stickerDiv.addEventListener('click', async (e) => {
      const { type, filepath, specialPath } = (e.currentTarget as HTMLElement).dataset;
      let stickerPath = filepath!;
      if (type !== 'static') {
        stickerPath = specialPath!;
      }
      window.api
        .sendSticker(stickerPath, {
          stickerID: sticker.stickerID,
          stickerPackID: sticker.stickerPackID,
          title: this.stickerPacksMap[sticker.stickerPackID].title,
          author: this.stickerPacksMap[sticker.stickerPackID].author,
        })
        .then(() => {
          this.updateMostUsed();
        });
    });

    stickerDiv.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      const { packID, stickerID } = (e.currentTarget as HTMLElement).dataset;
      this.toggleFavorite(packID!, stickerID!);
    });

    return stickerDiv;
  }

  toggleFavorite(PackID: string, ID: string): void {
    const favoritesPackDiv = document.getElementById('sticker-pack-container-favorites')!;
    const stickerDiv = favoritesPackDiv.querySelector(
      `.sticker[data-pack-i-d="${PackID}"][data-sticker-i-d="${ID}"]`
    ) as HTMLElement | null;
    if (stickerDiv) {
      stickerDiv.remove();
      this.popupRemoveFavoriteFeedback();
    } else {
      const stickerPackDiv = this.createSticker(
        this.stickerPacksMap[PackID].stickers.find((sticker) => sticker.stickerID === ID)!
      );
      favoritesPackDiv.appendChild(stickerPackDiv);
      this.popupAddFavoriteFeedback();
    }
    this.updateFavorites();
  }

  animateFeedbackModal(modal: HTMLElement): void {
    modal.classList.add('active');
    setTimeout(() => {
      modal.classList.remove('active');
      modal.classList.add('inactive');
      setTimeout(() => {
        modal.classList.remove('inactive');
      }, 500);
    }, 500);
  }

  popupAddFavoriteFeedback(): void {
    const addFavoriteFeedbackModal = document.querySelector(
      '#add-favorite-feedback'
    ) as HTMLElement;
    this.animateFeedbackModal(addFavoriteFeedbackModal);
  }

  popupRemoveFavoriteFeedback(): void {
    const deleteFavoriteFeedbackModal = document.querySelector(
      '#remove-favorite-feedback'
    ) as HTMLElement;
    this.animateFeedbackModal(deleteFavoriteFeedbackModal);
  }

  updateFavorites(): void {
    const favoritedStickers = [
      ...document.getElementById('sticker-pack-container-favorites')!.querySelectorAll('.sticker'),
    ] as HTMLElement[];
    window.api.setFavorites(
      favoritedStickers.map((stickerDiv) => ({
        PackID: stickerDiv.dataset.packID!,
        StickerID: stickerDiv.dataset.stickerID!,
      }))
    );
    this.updateFavoritesEmpty().then();
  }

  async updateFavoritesEmpty(): Promise<void> {
    const favoritesDiv = document.getElementById('sticker-pack-container-favorites');
    if (favoritesDiv.getElementsByClassName('sticker').length === 0)
      favoritesDiv.appendChild(
        createElementFromHTML(
          `<span class="section-empty">Right-click a sticker to favorite it!</span>`
        ) as HTMLElement
      );
    else if (favoritesDiv.querySelector('.section-empty'))
      favoritesDiv.querySelector('.section-empty').remove();
  }

  async refreshStickerPacks(): Promise<void> {
    await this.populateStickerPacks();
  }
}

function createElementFromHTML(htmlString: string): ChildNode {
  const div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild!;
}
