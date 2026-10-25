import type { CrmProjectId } from '@/types';

export type { CrmProjectId } from '@/types';

export type CrmProject = {
  id: CrmProjectId;
  name: string;
  shortName: string;
  icon: string;
};

export const DEFAULT_PROJECT_ID: CrmProjectId = 'pest-control';
export const PROJECT_STORAGE_KEY = 'crm_project';

/** В демо на портфолио — только дезинсекция, без переключателя «сушка». */
export const CRM_PROJECTS: CrmProject[] = [
  {
    id: 'pest-control',
    name: 'CRM Дезинсекция',
    shortName: 'Дезинсекция',
    icon: '🐜',
  },
];

export const getStoredProjectId = (): CrmProjectId => DEFAULT_PROJECT_ID;

export const setStoredProjectId = (projectId: CrmProjectId): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
  }
};

export const clearStoredProject = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  }
};

export const getProject = (projectId: CrmProjectId): CrmProject =>
  CRM_PROJECTS.find(project => project.id === projectId) || CRM_PROJECTS[0];
