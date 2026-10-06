export function isModifierKey(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey;
}

/** Physical key match — works across keyboard layouts (e.g. Russian «с» on KeyC). */
export function isModifierShortcut(event: KeyboardEvent, code: string) {
  return isModifierKey(event) && event.code === code;
}

export function isUndoShortcut(event: KeyboardEvent) {
  return isModifierShortcut(event, "KeyZ") && !event.shiftKey;
}

export function isCopyShortcut(event: KeyboardEvent) {
  return isModifierShortcut(event, "KeyC");
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}
