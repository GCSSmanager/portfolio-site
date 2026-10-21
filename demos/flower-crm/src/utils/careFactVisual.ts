import type { CareFactIconId } from '../components/ui/CareFactIcon'
import type { CareDisplaySectionId } from './careRulesDisplay'

export type CareSectionTone = 'water' | 'temp' | 'life' | 'warehouse' | 'extra'

export const CARE_SECTION_VISUAL: Record<
  CareDisplaySectionId,
  { tone: CareSectionTone; icon: CareFactIconId }
> = {
  water_trim: { tone: 'water', icon: 'drop' },
  temperature: { tone: 'temp', icon: 'thermometer' },
  vase_life: { tone: 'life', icon: 'calendar' },
  warehouse: { tone: 'warehouse', icon: 'box' },
  extra: { tone: 'extra', icon: 'note' },
}

export const CARE_FACT_ICON: Record<string, CareFactIconId> = {
  water_change_interval_days: 'drop',
  cut_interval_days: 'scissors',
  stem_trim_per_water_change_cm: 'ruler',
  vase_water_temp_celsius: 'thermometer',
  storage_temp_celsius: 'snow',
  display_room_temp_celsius: 'sun',
  vase_life_days: 'calendar',
  cut_angle_degrees: 'angle',
  care_notes_ru: 'note',
  warehouse_arrival_notes_ru: 'box',
}

export function careFactIconFor(id: string, sectionId: CareDisplaySectionId): CareFactIconId {
  return CARE_FACT_ICON[id] ?? CARE_SECTION_VISUAL[sectionId].icon
}
