export function setUpMenuBarButtons(): void {
  const closeButton = document.getElementById('close-button')!;
  closeButton.addEventListener('click', () => {
    window.api.closeWindow();
  });
}
