/**
 * Componente reutilizable de subida de imagen por Drag & Drop o selector de archivo.
 */

function handleImageFile(file, previewImg, hiddenInput) {
  if (!file.type.startsWith('image/')) {
    alert('Por favor seleccione una imagen válida');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    if (previewImg) {
      previewImg.src = dataUrl;
      previewImg.style.display = 'block';
    }
    if (hiddenInput) {
      hiddenInput.value = dataUrl;
    }
  };
  reader.readAsDataURL(file);
}

export function setupDropzone(boxId, fileInputId, previewImgId, hiddenInputId) {
  const box = document.getElementById(boxId);
  const fileInput = document.getElementById(fileInputId);
  const preview = document.getElementById(previewImgId);
  const hiddenInput = document.getElementById(hiddenInputId);

  if (!box || !fileInput) return;

  box.addEventListener('click', () => fileInput.click());

  box.addEventListener('dragover', (e) => {
    e.preventDefault();
    box.classList.add('drag-over');
  });

  box.addEventListener('dragleave', () => box.classList.remove('drag-over'));

  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0], preview, hiddenInput);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0], preview, hiddenInput);
    }
  });
}
