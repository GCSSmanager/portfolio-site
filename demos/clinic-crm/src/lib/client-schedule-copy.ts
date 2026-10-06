export const CLIENT_COPY_APPOINTMENT_ATTR = "data-client-copy-id";

export function findClientCopyAppointmentId(clientX: number, clientY: number): string | null {
  const hit = document.elementFromPoint(clientX, clientY);
  if (!hit) return null;
  const node = hit.closest(`[${CLIENT_COPY_APPOINTMENT_ATTR}]`);
  if (!(node instanceof HTMLElement)) return null;
  return node.getAttribute(CLIENT_COPY_APPOINTMENT_ATTR);
}
