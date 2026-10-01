function parseCssPx(value: string): number | null {
  if (!value || value === 'auto' || value === 'none') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function boxForPdfImage(img: HTMLImageElement): { maxW: number; maxH: number } {
  const style = getComputedStyle(img);
  const label = `${img.className} ${img.alt}`.toLowerCase();
  let maxW = parseCssPx(style.maxWidth) ?? parseCssPx(style.width) ?? 220;
  let maxH = parseCssPx(style.maxHeight) ?? parseCssPx(style.height) ?? 80;
  if (label.includes('logo')) {
    maxW = Math.min(maxW, 280);
    maxH = Math.min(maxH, 120);
  } else if (label.includes('sign') || label.includes('stamp')) {
    maxW = Math.min(maxW, 210);
    maxH = Math.min(maxH, 110);
  } else {
    maxW = Math.min(maxW, 280);
    maxH = Math.min(maxH, 120);
  }
  return { maxW, maxH };
}

/** Drop scanner dust and the blank page around a stamp or a wide logo. */
function contentCrop(img: HTMLImageElement): { sx: number; sy: number; sw: number; sh: number } {
  const full = { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
  if (img.naturalWidth * img.naturalHeight > 14_000_000) return full;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return full;
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rowHits = new Uint32Array(height);
  const colHits = new Uint32Array(width);
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) {
        rowHits[y] += 1;
        colHits[x] += 1;
      }
    }
  }
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 2) {
    if (rowHits[y] < 4) continue;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let x = 0; x < width; x += 2) {
    if (colHits[x] < 4) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  if (maxX <= minX || maxY <= minY) return full;
  const pad = 16;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  return {
    sx,
    sy,
    sw: Math.min(width - 1, maxX + pad) - sx,
    sh: Math.min(height - 1, maxY + pad) - sy,
  };
}

/**
 * html2canvas draws an <img> at its file size when CSS width is auto.
 * The logo is 5184px wide and the stamp is a full-page scan, which pushes
 * the quotation and invoice onto extra blank pages. Replace each image with
 * a bitmap that already matches the header or signature box.
 */
function rasterizePdfImages(root: HTMLElement): void {
  root.querySelectorAll('img').forEach((img) => {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return;
    const { maxW, maxH } = boxForPdfImage(img);
    const crop = contentCrop(img);
    const scale = Math.min(maxW / crop.sw, maxH / crop.sh, 1);
    const w = Math.max(1, Math.round(crop.sw * scale));
    const h = Math.max(1, Math.round(crop.sh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    img.src = canvas.toDataURL('image/png');
    img.setAttribute('width', String(w));
    img.setAttribute('height', String(h));
    img.style.width = `${w}px`;
    img.style.height = `${h}px`;
    img.style.maxWidth = `${w}px`;
    img.style.maxHeight = `${h}px`;
    img.style.minWidth = '0px';
    img.style.minHeight = '0px';
    img.style.objectFit = 'fill';
    img.style.display = 'block';
  });
}

/** Wait for images inside a DOM subtree before html2pdf capture (avoids blank stamps). */
export async function waitForImagesInElement(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        }),
    ),
  );
}

/** Load images, then lock them to the size the PDF header and stamp expect. */
export async function preparePdfImages(root: HTMLElement): Promise<void> {
  await waitForImagesInElement(root);
  rasterizePdfImages(root);
  await waitForImagesInElement(root);
}
