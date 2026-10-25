import { Link } from 'react-router-dom'

type LegalNoteProps = {
  noteOnHero?: boolean
}

export function LegalNote({ noteOnHero }: LegalNoteProps) {
  return (
    <p className={`crm-legal-note${noteOnHero ? ' crm-legal-note--hero' : ''}`}>
      Нажимая кнопку, вы соглашаетесь на{' '}
      <Link to="/legal/consent/">обработку персональных данных</Link> и с{' '}
      <Link to="/legal/privacy/">политикой конфиденциальности</Link>.
    </p>
  )
}
