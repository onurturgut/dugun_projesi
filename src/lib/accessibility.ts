function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Altı haneli hex renk gerekli.");
  const value = Number.parseInt(hex.slice(1), 16);
  const red = channel((value >> 16) & 255);
  const green = channel((value >> 8) & 255);
  const blue = channel(value & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}
