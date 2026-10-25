import { useCallback } from 'react'
import { WireOverlay } from '@/components/wires/WireOverlay'
import { useMeasuredWirePaths } from '@/hooks/useMeasuredWirePaths'
import {
  wireAcross,
  wireDownIntoTop,
  type WireBox,
} from '@/lib/wire-geometry'

const STEPS = [
  {
    id: 's1',
    art: '/assets/crm-process-s1.webp',
    name: 'Заявка',
    text: 'Первичная консультация: цели, отрасль и текущие ограничения в работе.',
  },
  {
    id: 's2',
    art: '/assets/crm-process-s2.webp',
    name: 'Оценка',
    text: 'Анализ процессов, сроков, рисков и перечня работ по проекту.',
  },
  {
    id: 's3',
    art: '/assets/crm-process-s3.webp',
    name: 'Коммерческое предложение',
    text: 'Стоимость, этапы и границы проекта: что входит в объём работ.',
  },
  {
    id: 's4',
    art: '/assets/crm-process-s4.webp',
    name: 'Разработка',
    text: 'Разработка и настройка CRM: роли, поля, интеграции и отчёты.',
  },
  {
    id: 's5',
    art: '/assets/crm-process-s5.webp',
    name: 'Тестирование',
    text: 'Приёмочное тестирование на демо-стенде и доработки по замечаниям.',
  },
  {
    id: 's6',
    art: '/assets/crm-process-s6.webp',
    name: 'Запуск',
    text: 'Ввод в эксплуатацию, обучение пользователей и сопровождение после запуска.',
  },
] as const

const PROCESS_IDS = ['s1', 's2', 's3', 's4', 's5', 's6'] as const
type ProcessId = (typeof PROCESS_IDS)[number]

function computeProcessPaths(boxes: Record<ProcessId, WireBox>) {
  const mobile = window.matchMedia('(max-width: 48rem)').matches
  const desktop = window.matchMedia('(min-width: 62rem)').matches

  if (mobile) {
    return [
      wireDownIntoTop(boxes.s1, boxes.s2),
      wireDownIntoTop(boxes.s2, boxes.s3),
      wireDownIntoTop(boxes.s3, boxes.s4),
      wireDownIntoTop(boxes.s4, boxes.s5),
      wireDownIntoTop(boxes.s5, boxes.s6),
    ]
  }
  if (desktop) {
    return [
      wireAcross(boxes.s1, 'r', boxes.s2, 'l'),
      wireAcross(boxes.s2, 'r', boxes.s3, 'l'),
      wireDownIntoTop(boxes.s3, boxes.s4),
      wireAcross(boxes.s4, 'r', boxes.s5, 'l'),
      wireAcross(boxes.s5, 'r', boxes.s6, 'l'),
    ]
  }
  return [
    wireAcross(boxes.s1, 'r', boxes.s2, 'l'),
    wireDownIntoTop(boxes.s2, boxes.s3),
    wireAcross(boxes.s3, 'r', boxes.s4, 'l'),
    wireDownIntoTop(boxes.s4, boxes.s5),
    wireAcross(boxes.s5, 'r', boxes.s6, 'l'),
  ]
}

export function CrmProcess() {
  const compute = useCallback((boxes: Record<ProcessId, WireBox>) => computeProcessPaths(boxes), [])
  const { rootRef, setNodeRef, width, height, paths } = useMeasuredWirePaths(PROCESS_IDS, compute)

  return (
    <section className="crm-process" id="process" aria-labelledby="crm-process-title">
      <div className="container">
        <div className="section__head">
          <p className="section__eyebrow">Этапы проекта</p>
          <h2 className="section__title" id="crm-process-title">
            От заявки до ввода в эксплуатацию
          </h2>
        </div>

        <div ref={rootRef} className="crm-process__flow" aria-label="Этапы работы над CRM">
          <WireOverlay
            className="crm-process__wires"
            groupClassName="crm-process__wires-g"
            markerId="crm-process-ah"
            width={width}
            height={height}
            paths={paths}
          />

          {STEPS.map((step, index) => (
            <article
              key={step.id}
              ref={setNodeRef(step.id)}
              className="crm-process__step"
            >
              <div className="crm-process__visual">
                <img
                  className="crm-process__art"
                  src={step.art}
                  alt=""
                  width={160}
                  height={160}
                  decoding="async"
                />
                <span className="crm-process__num" aria-hidden="true">
                  {index + 1}
                </span>
              </div>
              <div className="crm-process__body">
                <h3 className="crm-process__name">{step.name}</h3>
                <p className="crm-process__text">{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
