export type KpStage = {
  id: string
  name: string
  scope: string
  days: number
  price: number
}

export type KpFormState = {
  client: string
  dateIso: string
  title: string
  lead: string
  terms: string
  notes: string
  stages: KpStage[]
}
