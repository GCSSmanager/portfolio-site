/** Case / demo thumbnails copied to `_site/data/*` and allowed in dev static. */
export const CRM_DATA_DIRS = [
  'flower-crm',
  'clinic-crm',
  'pest-crm',
  'motorlab-crm',
  'severkuhnya-crm',
  'sila-crm',
] as const

export type CrmDataDir = (typeof CRM_DATA_DIRS)[number]

export function isCrmDataDir(name: string): name is CrmDataDir {
  return (CRM_DATA_DIRS as readonly string[]).includes(name)
}
