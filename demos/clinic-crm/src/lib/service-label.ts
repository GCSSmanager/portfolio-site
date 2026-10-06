export function formatServiceName(service: { name: string; isGroup: boolean }) {
  return `(${service.isGroup ? "гр." : "инд."}) ${service.name}`;
}
