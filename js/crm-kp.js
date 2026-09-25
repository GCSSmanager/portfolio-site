const form = document.querySelector("[data-kp-form]");
const rowsEl = document.querySelector("[data-kp-rows]");
const addBtn = document.querySelector("[data-kp-add]");
const printBtn = document.querySelector("[data-kp-print]");
const dateInput = document.querySelector("[data-kp-date-input]");

const preview = {
  date: document.querySelector("[data-kp-date]"),
  client: document.querySelector("[data-kp-client]"),
  title: document.querySelector("[data-kp-title]"),
  lead: document.querySelector("[data-kp-lead]"),
  terms: document.querySelector("[data-kp-terms]"),
  body: document.querySelector("[data-kp-body]"),
  totalTime: document.querySelector("[data-kp-total-time]"),
  totalPrice: document.querySelector("[data-kp-total-price]"),
  notes: document.querySelector("[data-kp-notes]"),
  daysSum: document.querySelector("[data-kp-days-sum]"),
};

function field(name, root = form) {
  return root.querySelector(`[data-f="${name}"]`);
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function parsePrice(value) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function formatPrice(n) {
  return `${n.toLocaleString("ru-RU")}\u00a0₽`;
}

function daysWord(n) {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return "дней";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дня";
  return "дней";
}

function formatDays(n) {
  return n ? `${n} ${daysWord(n)}` : "—";
}

function formatWorkDays(n) {
  if (!n) return "—";
  const word = daysWord(n);
  if (word === "день") return `${n} рабочий день`;
  if (word === "дня") return `${n} рабочих дня`;
  return `${n} рабочих дней`;
}

function lines(text) {
  return String(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function el(tag, text) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  return node;
}

function rowTemplate() {
  const stage = document.createElement("article");
  stage.className = "kp-stage";
  stage.innerHTML = `
    <textarea class="kp-field__ctrl" data-f="scope" rows="2" placeholder="Состав"></textarea>
    <div class="kp-stage__row">
      <input class="kp-field__ctrl" data-f="name" placeholder="Этап">
      <input class="kp-field__ctrl kp-field__ctrl--days" data-f="days" inputmode="numeric" placeholder="Дни" aria-label="Дни">
      <input class="kp-field__ctrl kp-field__ctrl--price" data-f="price" inputmode="numeric" placeholder="Цена" aria-label="Цена">
      <button class="kp-row-del" type="button" data-kp-remove aria-label="Удалить этап">×</button>
    </div>
  `;
  return stage;
}

function collectStages() {
  return [...rowsEl.querySelectorAll(".kp-stage")]
    .map((tr, i) => ({
      n: i + 1,
      name: field("name", tr).value.trim(),
      scope: field("scope", tr).value.trim(),
      days: parsePrice(field("days", tr).value),
      price: parsePrice(field("price", tr).value),
    }))
    .filter((stage) => stage.name || stage.scope || stage.days || stage.price);
}

function render() {
  const client = field("client").value.trim();
  const title = field("title").value.trim();
  const lead = field("lead").value.trim();
  const stages = collectStages();
  const total = stages.reduce((sum, stage) => sum + stage.price, 0);
  const totalDays = stages.reduce((sum, stage) => sum + stage.days, 0);
  const noteLines = lines(field("notes").value);

  preview.date.textContent = formatDate(dateInput.value);
  preview.client.hidden = !client;
  preview.client.textContent = client ? `Заказчик: ${client}` : "";
  preview.title.hidden = !title;
  preview.title.textContent = title;
  preview.lead.hidden = !lead;
  preview.lead.textContent = lead;

  preview.terms.replaceChildren(
    ...lines(field("terms").value).map((term) => el("li", term))
  );

  preview.body.replaceChildren(
    ...stages.map((stage) => {
      const tr = document.createElement("tr");
      tr.append(
        el("td", stage.name ? `${stage.n}. ${stage.name}` : `Этап ${stage.n}`),
        el("td", stage.scope),
        el("td", formatDays(stage.days)),
        el("td", stage.price ? formatPrice(stage.price) : "—")
      );
      return tr;
    })
  );

  preview.totalTime.textContent = formatWorkDays(totalDays);
  preview.totalPrice.textContent = formatPrice(total);
  if (preview.daysSum) preview.daysSum.textContent = formatWorkDays(totalDays);
  preview.notes.hidden = noteLines.length === 0;
  preview.notes.replaceChildren(...noteLines.map((line) => el("p", line)));
}

if (dateInput && !dateInput.value) {
  dateInput.value = todayISO();
}

form?.addEventListener("input", render);
form?.addEventListener("submit", (event) => event.preventDefault());

addBtn?.addEventListener("click", () => {
  rowsEl.append(rowTemplate());
  field("name", rowsEl.lastElementChild)?.focus();
  render();
});

rowsEl?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-kp-remove]");
  if (!btn) return;

  const rows = [...rowsEl.querySelectorAll(".kp-stage")];
  if (rows.length === 1) {
    rows[0].querySelectorAll("[data-f]").forEach((input) => {
      input.value = "";
    });
  } else {
    btn.closest(".kp-stage").remove();
  }
  render();
});

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const found = document.querySelector(`script[src="${src}"]`);
    if (found) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(src));
    document.head.append(script);
  });
}

function buildPdfDoc() {
  const ink = "#1b3022";
  const cream = "#f5f2ea";
  const mute = "#4d5c52";
  const rule = "#c8cfc4";
  const client = field("client").value.trim();
  const title = field("title").value.trim();
  const lead = field("lead").value.trim();
  const stages = collectStages();
  const total = stages.reduce((sum, stage) => sum + stage.price, 0);
  const totalDays = stages.reduce((sum, stage) => sum + stage.days, 0);
  const terms = lines(field("terms").value);
  const notes = lines(field("notes").value);
  const logo = window.KP_IMAGES && window.KP_IMAGES.logo;

  const last = stages.length + 1;
  const tableBody = [
    [
      { text: "ЭТАП", color: cream, bold: true, fontSize: 8, lineHeight: 1 },
      { text: "СОСТАВ", color: cream, bold: true, fontSize: 8, lineHeight: 1 },
      { text: "ДНИ", color: cream, bold: true, fontSize: 8, lineHeight: 1 },
      { text: "ЦЕНА", color: cream, bold: true, fontSize: 8, alignment: "right", lineHeight: 1 },
    ],
    ...stages.map((stage) => [
      { text: stage.name ? `${stage.n}. ${stage.name}` : `Этап ${stage.n}`, bold: true, lineHeight: 1.15 },
      { text: stage.scope || "—", lineHeight: 1.15 },
      { text: formatDays(stage.days), lineHeight: 1.15 },
      { text: stage.price ? formatPrice(stage.price) : "—", alignment: "right", lineHeight: 1.15 },
    ]),
    [
      { text: "Итого", colSpan: 2, bold: true, fontSize: 10, lineHeight: 1 },
      {},
      { text: formatWorkDays(totalDays), bold: true, fontSize: 10, lineHeight: 1 },
      { text: formatPrice(total), bold: true, fontSize: 10, alignment: "right", lineHeight: 1 },
    ],
  ];

  return {
    pageSize: "A4",
    pageMargins: [40, 36, 40, 36],
    defaultStyle: { font: "Roboto", fontSize: 9, color: ink, lineHeight: 1.25 },
    content: [
      {
        columns: [
          logo ? { image: logo, width: 28 } : { width: 28, text: "" },
          { width: 10, text: "" },
          {
            width: "*",
            stack: [
              { text: "ГКСС", fontSize: 16, bold: true, color: ink },
              { text: "Гибкие корпоративные системы и сервисы", fontSize: 8, color: mute },
            ],
          },
          {
            width: "auto",
            alignment: "right",
            stack: [
              { text: "КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ", fontSize: 8, color: mute },
              { text: formatDate(dateInput.value), fontSize: 9, color: mute },
              client ? { text: `Заказчик: ${client}`, fontSize: 9, color: mute } : null,
            ].filter(Boolean),
          },
        ],
        margin: [0, 0, 0, 8],
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.4, lineColor: ink }],
        margin: [0, 0, 0, 12],
      },
      title && { text: title, fontSize: 18, bold: true, color: ink, margin: [0, 0, 0, 8] },
      lead && { text: lead, fontSize: 10, color: mute, margin: [0, 0, 0, 8] },
      terms.length && {
        table: {
          body: [terms.map((term) => ({
            text: term,
            fontSize: 8,
            bold: true,
            fillColor: cream,
            alignment: "center",
            margin: [8, 6, 8, 6],
            lineHeight: 1,
          }))],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: [120, "*", 78, 70],
          body: tableBody,
        },
        layout: {
          fillColor: (row) => {
            if (row === 0) return ink;
            if (row === last) return cream;
            return null;
          },
          vLineWidth: () => 0,
          hLineWidth: (i) => (i === 0 || i === 1 || i >= last ? 0 : 0.4),
          hLineColor: () => rule,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 8,
          paddingBottom: () => 8,
        },
        margin: [0, 0, 0, 10],
      },
      ...notes.map((note) => ({
        text: note,
        fontSize: 8,
        color: mute,
        margin: [0, 0, 0, 3],
      })),
    ].filter(Boolean),
  };
}

printBtn?.addEventListener("click", async () => {
  try {
    await loadScript("../../js/vendor/pdfmake.min.js");
    await loadScript("../../js/vendor/vfs_fonts.js");
    await loadScript("../../js/kp-images.js");
  } catch {
    return;
  }

  const pdfMake = window.pdfMake;
  if (!pdfMake) return;

  const title = field("title").value.trim() || "КП";
  pdfMake.createPdf(buildPdfDoc()).getBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank");
    if (!opened) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}.pdf`;
      link.click();
    }
  });
});

render();
