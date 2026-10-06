import type { Employee, Specialty } from "./types";
import type { SearchOption } from "../components/ui/SearchSelect";

export const SPECIALTY_FILTER_PREFIX = "specialty:";

export function specialtyFilterValue(specialtyId: string) {
  return `${SPECIALTY_FILTER_PREFIX}${specialtyId}`;
}

export function parseStaffFilter(value: string): { employeeId?: string; specialtyId?: string } {
  if (!value) return {};
  if (value.startsWith(SPECIALTY_FILTER_PREFIX)) {
    const specialtyId = value.slice(SPECIALTY_FILTER_PREFIX.length);
    return specialtyId ? { specialtyId } : {};
  }
  return { employeeId: value };
}

export function matchesStaffFilter(
  employee: Pick<Employee, "id" | "specialtyId">,
  filter: { employeeId?: string; specialtyId?: string },
) {
  if (filter.employeeId) return employee.id === filter.employeeId;
  if (filter.specialtyId) return employee.specialtyId === filter.specialtyId;
  return true;
}

export function staffFilterOptions(
  employees: Employee[],
  specialties: Specialty[],
  emptyLabel: string,
): SearchOption[] {
  return [
    { value: "", label: emptyLabel },
    ...specialties
      .filter((item) => item.isActive !== false)
      .map((item) => ({
        value: specialtyFilterValue(item.id),
        label: item.name,
        hint: "специальность",
      })),
    ...employees.map((employee) => ({
      value: employee.id,
      label: employee.shortName,
      hint: employee.specialty?.name || employee.position || undefined,
    })),
  ];
}

export function staffFilterLabel(
  value: string,
  employees: Employee[],
  specialties: Specialty[],
): string | undefined {
  const filter = parseStaffFilter(value);
  if (filter.specialtyId) {
    return specialties.find((item) => item.id === filter.specialtyId)?.name;
  }
  if (filter.employeeId) {
    return employees.find((item) => item.id === filter.employeeId)?.shortName;
  }
  return undefined;
}
