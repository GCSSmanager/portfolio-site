/** Общий пайплайн HTML → JPEG → PDF для печати расписаний. */

export const SCHEDULE_PDF_PAGE_WIDTH = 1123;
export const SCHEDULE_PDF_PAGE_HEIGHT = 794;
export const SCHEDULE_PDF_WIDTH = 841.89;
export const SCHEDULE_PDF_HEIGHT = 595.28;

function dataUrlToBytes(dataUrl: string) {
  const binary = atob(dataUrl.split(",")[1] ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Не удалось отрисовать страницу PDF"));
    image.src = src;
  });
}

export async function htmlToJpegBytes(
  html: string,
  width = SCHEDULE_PDF_PAGE_WIDTH,
  height = SCHEDULE_PDF_PAGE_HEIGHT,
) {
  const scale = 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Не удалось подготовить PDF");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    bytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.94)),
    width: canvas.width,
    height: canvas.height,
  };
}

export function makePdfBlob(images: { bytes: Uint8Array; width: number; height: number }[]) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const pageWidth = SCHEDULE_PDF_WIDTH;
  const pageHeight = SCHEDULE_PDF_HEIGHT;

  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? encoder.encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (id: number, body: string | Uint8Array, prefix = "", suffix = "") => {
    offsets[id] = length;
    push(`${id} 0 obj\n${prefix}`);
    push(body);
    push(`${suffix}\nendobj\n`);
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(
    2,
    `<< /Type /Pages /Kids [${images.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${images.length} >>`,
  );

  images.forEach((image, index) => {
    const pageObj = 3 + index * 3;
    const imageObj = pageObj + 1;
    const contentObj = pageObj + 2;
    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im1 Do\nQ`;
    obj(
      pageObj,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`,
    );
    obj(
      imageObj,
      image.bytes,
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
      "\nendstream",
    );
    obj(contentObj, content, `<< /Length ${encoder.encode(content).length} >>\nstream\n`, "\nendstream");
  });

  const xrefOffset = length;
  push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < offsets.length; i += 1) {
    push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(
    chunks.map((chunk) => chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer),
    { type: "application/pdf" },
  );
}

export async function buildPdfFromHtmlPages(htmlPages: string[]) {
  if (!htmlPages.length) throw new Error("Нет страниц для PDF");
  const images = await Promise.all(htmlPages.map((html) => htmlToJpegBytes(html)));
  return makePdfBlob(images);
}

export function isMobilePdfClient() {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Открыть вкладку синхронно в обработчике клика (до await),
 * иначе popup-blocker режет window.open после генерации PDF.
 */
export function openPdfPreviewWindow(): Window | null {
  const preview = window.open("about:blank", "_blank");
  if (!preview) return null;
  try {
    preview.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>PDF…</title></head>` +
        `<body style="margin:0;font:14px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#555;padding:24px">` +
        `Готовим PDF…</body></html>`,
    );
    preview.document.close();
  } catch {
    // ignore restricted document access
  }
  return preview;
}

function navigateWindowToPdf(win: Window, url: string) {
  try {
    win.location.replace(url);
    win.focus();
    return true;
  } catch {
    try {
      win.location.href = url;
      win.focus();
      return true;
    } catch {
      return false;
    }
  }
}

function triggerPdfDownload(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Показать PDF. Передайте окно из `openPdfPreviewWindow()` (синхронно по клику).
 * Десктоп и телефон: вкладка с PDF. Share — только запасной путь на мобилке, если вкладку заблокировали.
 */
export async function openPdfBlob(blob: Blob, filename: string, previewWindow?: Window | null) {
  const url = URL.createObjectURL(blob);
  const revokeLater = () => setTimeout(() => URL.revokeObjectURL(url), 120_000);

  if (previewWindow && !previewWindow.closed && navigateWindowToPdf(previewWindow, url)) {
    revokeLater();
    return;
  }

  // Попытка открыть сразу (может сработать, если вызов ещё в жесте — обычно нет после await)
  const opened = window.open(url, "_blank");
  if (opened) {
    revokeLater();
    return;
  }

  const isMobile = isMobilePdfClient();
  if (isMobile) {
    const file = new File([blob], filename, { type: "application/pdf" });
    const canShare =
      typeof navigator.canShare === "function" &&
      typeof navigator.share === "function" &&
      navigator.canShare({ files: [file] });
    if (canShare) {
      try {
        await navigator.share({ files: [file], title: filename });
        URL.revokeObjectURL(url);
        return;
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          URL.revokeObjectURL(url);
          return;
        }
      }
    }
  }

  triggerPdfDownload(url, filename);

  if (isMobile) {
    // iOS/Android: download часто молчит — открываем в текущей вкладке
    window.location.assign(url);
    return;
  }

  revokeLater();
}

export function closePdfPreviewWindow(previewWindow?: Window | null) {
  if (!previewWindow || previewWindow.closed) return;
  try {
    previewWindow.close();
  } catch {
    // ignore
  }
}
