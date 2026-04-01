export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function trimLowerString(value: string) {
  return value.trim().toLowerCase();
}
