export async function setUpUpdateModal(): Promise<void> {
  const updateModalBackground = document.getElementById('update-background') as HTMLElement;
  const updateText = document.getElementById('update-text')!;

  async function checkUpdates(): Promise<void> {
    const needsUpdateVersion = await window.api.getUpdates();
    console.log(`Needs update: ${needsUpdateVersion}`);
    if (needsUpdateVersion) {
      updateModalBackground.style.display = 'block';
      updateText.textContent = `New Update ${needsUpdateVersion} Available!`;
      const updateButton = document.getElementById('update-button')!;
      updateButton.addEventListener('click', () => {
        updateModalBackground.style.display = 'none';
      });
    }
  }

  await checkUpdates();
  setInterval(checkUpdates, 24 * 60 * 60 * 1000);
}
