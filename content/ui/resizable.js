function makeResizable(popup) {
  const handle = document.createElement('div');
  handle.className = 'wbm-resize-handle';
  popup.appendChild(handle);

  let startX, startY, startWidth, startHeight;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;
    startWidth = popup.offsetWidth;
    startHeight = popup.offsetHeight; 

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  function onMouseMove(e) {
    const deltaX = startX - e.clientX; 
    const deltaY = e.clientY - startY; 

    const newWidth = Math.min(Math.max(startWidth + deltaX, 280), 600);
    const newHeight = Math.min(Math.max(startHeight + deltaY, 150), window.innerHeight * 0.8);

    popup.style.width = `${newWidth}px`;
    popup.style.height = `${newHeight}px`;
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
}
