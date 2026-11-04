export function createTaskScope() {
  let version = 0;
  return { start: () => ++version, cancel: () => { version++; }, isCurrent: (token: number) => token === version };
}
