import PizZip from "pizzip";

export type TemplateValues = Record<string, string>;

const EMPTY_FIELD = "_____";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replacePlaceholder(xml: string, placeholder: string, value: string) {
  if (xml.includes(placeholder)) {
    return xml.split(placeholder).join(value);
  }
  const pattern = placeholder
    .split("")
    .map((char) => escapeRegExp(char))
    .join("(?:<[^>]+>)*");
  return xml.replace(new RegExp(pattern, "g"), value);
}

function shortFio(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) return `${parts[1]![0]}.${parts[2]![0]}. ${parts[0]}`;
  if (parts.length === 2) return `${parts[1]![0]}. ${parts[0]}`;
  return fullName.trim();
}

/** Заполняет .docx-шаблон плейсхолдерами {{KEY}}. */
export function fillDocx(buffer: ArrayBuffer | Uint8Array, values: TemplateValues): Blob {
  const zip = new PizZip(buffer);
  const filled: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    filled[key] = escapeXml((value ?? "").trim() || EMPTY_FIELD);
  }
  if (values.FIO?.trim() && !values.FIO_SHORT?.trim()) {
    filled.FIO_SHORT = escapeXml(shortFio(values.FIO));
  } else if (!filled.FIO_SHORT) {
    filled.FIO_SHORT = EMPTY_FIELD;
  }

  const blank = escapeXml(EMPTY_FIELD);
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith("word/") || !name.endsWith(".xml")) continue;
    const file = zip.file(name);
    if (!file) continue;
    let xml = file.asText();
    for (const [key, value] of Object.entries(filled)) {
      xml = replacePlaceholder(xml, `{{${key}}}`, value);
    }
    xml = xml.replace(/\{\{[^{}]+\}\}/g, blank);
    zip.file(name, xml);
  }

  return zip.generate({ type: "blob" });
}

/** Склеивает несколько простых .docx (без картинок/колонтитулов) в один. */
export function mergeDocx(blobs: Blob[]): Promise<Blob> {
  if (blobs.length <= 1) return Promise.resolve(blobs[0]!);
  return (async () => {
    const buffers = await Promise.all(blobs.map((b) => b.arrayBuffer()));
    const zips = buffers.map((buf) => new PizZip(buf));
    const dest = zips[0]!;
    const bodies: string[] = [];
    let sectPr = "<w:sectPr/>";

    for (const zip of zips) {
      const xml = zip.file("word/document.xml")?.asText();
      if (!xml) throw new Error("Некорректный Word-файл");
      const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*)<\/w:body>/);
      if (!bodyMatch) throw new Error("Некорректный Word-файл");
      let inner = bodyMatch[1]!;
      const sect = inner.match(/<w:sectPr[\s\S]*<\/w:sectPr>/);
      if (sect) {
        sectPr = sect[0];
        inner = inner.replace(sect[0], "");
      }
      bodies.push(inner);
    }

    const joined = bodies.join(
      '<w:p><w:r><w:br w:type="page"/></w:r></w:p>',
    );
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${joined}${sectPr}</w:body>
</w:document>`;
    dest.file("word/document.xml", docXml);
    return dest.generate({ type: "blob" });
  })();
}

export function safeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "документ";
}

export function bytesToBase64(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}
