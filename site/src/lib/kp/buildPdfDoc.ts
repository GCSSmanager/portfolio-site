import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatDate, formatDays, formatPrice, formatWorkDays, lines } from '@/lib/kp/format'
import type { KpFormState } from '@/lib/kp/types'

type BuildPdfOptions = {
  form: KpFormState
  logo: string | null
}

export function buildKpPdfDoc({ form, logo }: BuildPdfOptions): TDocumentDefinitions {
  const ink = '#1b3022'
  const cream = '#f5f2ea'
  const mute = '#4d5c52'
  const rule = '#c8cfc4'

  const client = form.client.trim()
  const title = form.title.trim()
  const lead = form.lead.trim()
  const stages = form.stages.filter((s) => s.name || s.scope || s.days || s.price)
  const total = stages.reduce((sum, stage) => sum + stage.price, 0)
  const totalDays = stages.reduce((sum, stage) => sum + stage.days, 0)
  const terms = lines(form.terms)
  const notes = lines(form.notes)

  const last = stages.length + 1
  const tableBody = [
    [
      { text: 'ЭТАП', color: cream, bold: true, fontSize: 8, lineHeight: 1 },
      { text: 'СОСТАВ', color: cream, bold: true, fontSize: 8, lineHeight: 1 },
      { text: 'ДНИ', color: cream, bold: true, fontSize: 8, lineHeight: 1 },
      { text: 'ЦЕНА', color: cream, bold: true, fontSize: 8, alignment: 'right', lineHeight: 1 },
    ],
    ...stages.map((stage, index) => [
      {
        text: stage.name ? `${index + 1}. ${stage.name}` : `Этап ${index + 1}`,
        bold: true,
        lineHeight: 1.15,
      },
      { text: stage.scope || '—', lineHeight: 1.15 },
      { text: formatDays(stage.days), lineHeight: 1.15 },
      { text: stage.price ? formatPrice(stage.price) : '—', alignment: 'right' as const, lineHeight: 1.15 },
    ]),
    [
      { text: 'Итого', colSpan: 2, bold: true, fontSize: 10, lineHeight: 1 },
      { text: '' },
      { text: formatWorkDays(totalDays), bold: true, fontSize: 10, lineHeight: 1 },
      { text: formatPrice(total), bold: true, fontSize: 10, alignment: 'right' as const, lineHeight: 1 },
    ],
  ] as Content[][]

  const content: Content[] = [
    {
      columns: [
        logo ? { image: logo, width: 28 } : { width: 28, text: '' },
        { width: 10, text: '' },
        {
          width: '*',
          stack: [
            { text: 'ГКСС', fontSize: 16, bold: true, color: ink },
            { text: 'Гибкие корпоративные системы и сервисы', fontSize: 8, color: mute },
          ],
        },
        {
          width: 'auto',
          alignment: 'right',
          stack: [
            { text: 'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ', fontSize: 8, color: mute },
            { text: formatDate(form.dateIso), fontSize: 9, color: mute },
            ...(client ? [{ text: `Заказчик: ${client}`, fontSize: 9, color: mute }] : []),
          ],
        },
      ],
      margin: [0, 0, 0, 8] as [number, number, number, number],
    },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.4, lineColor: ink }],
      margin: [0, 0, 0, 12] as [number, number, number, number],
    },
    ...(title
      ? [{ text: title, fontSize: 18, bold: true, color: ink, margin: [0, 0, 0, 8] as [number, number, number, number] }]
      : []),
    ...(lead
      ? [{ text: lead, fontSize: 10, color: mute, margin: [0, 0, 0, 8] as [number, number, number, number] }]
      : []),
    ...(terms.length
      ? [
          {
            table: {
              body: [
                terms.map((term) => ({
                  text: term,
                  fontSize: 8,
                  bold: true,
                  fillColor: cream,
                  alignment: 'center',
                  margin: [8, 6, 8, 6],
                  lineHeight: 1,
                })),
              ],
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 12] as [number, number, number, number],
          } as Content,
        ]
      : []),
    {
      table: {
        headerRows: 1,
        widths: [120, '*', 78, 70],
        body: tableBody,
      },
      layout: {
        fillColor: (row: number) => {
          if (row === 0) return ink
          if (row === last) return cream
          return null
        },
        vLineWidth: () => 0,
        hLineWidth: (i: number) => (i === 0 || i === 1 || i >= last ? 0 : 0.4),
        hLineColor: () => rule,
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 8,
        paddingBottom: () => 8,
      },
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
    ...notes.map((note) => ({
      text: note,
      fontSize: 8,
      color: mute,
      margin: [0, 0, 0, 3] as [number, number, number, number],
    })),
  ]

  return {
    pageSize: 'A4',
    pageMargins: [40, 36, 40, 36],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: ink, lineHeight: 1.25 },
    content,
  }
}
