export const SOURCES_UPDATED_EVENT = 'pest-crm:sources-updated';

export type SourcesUpdatedDetail = { oldName: string; newName: string };

export function notifySourcesUpdated(detail?: SourcesUpdatedDetail): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SOURCES_UPDATED_EVENT, { detail }));
  }
}
