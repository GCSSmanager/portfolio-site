import { useLayoutEffect, useState, type ReactNode } from 'react'

type Props = {
  exitIntent: boolean
  children: ReactNode
}

/** `<li>` нельзя сразу с классом выхода — keyframes не стартуют; класс вешается на следующий кадр. */
export function BatchGridCardItem({ exitIntent, children }: Props) {
  const [exitClassOn, setExitClassOn] = useState(false)

  useLayoutEffect(() => {
    if (!exitIntent) {
      setExitClassOn(false)
      return
    }
    setExitClassOn(false)
    const id = requestAnimationFrame(() => {
      setExitClassOn(true)
    })
    return () => cancelAnimationFrame(id)
  }, [exitIntent])

  const liClass = exitIntent && exitClassOn ? 'crm-batch-grid__item--exiting' : undefined

  return <li className={liClass}>{children}</li>
}
