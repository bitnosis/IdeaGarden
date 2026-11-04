export const cardFonts = {
  bookish: { label: 'Bookish · Georgia', family: 'Georgia, "Times New Roman", serif' },
  classic: { label: 'Classic · Palatino', family: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  modern: { label: 'Modern · System', family: '"Segoe UI", system-ui, sans-serif' },
  clean: { label: 'Clean · Verdana', family: 'Verdana, Geneva, sans-serif' },
  mono: { label: 'Monospace · Consolas', family: '"Cascadia Code", Consolas, monospace' }
} as const;
export type CardFont = keyof typeof cardFonts;
export function isCardFont(value: unknown): value is CardFont { return typeof value === 'string' && Object.hasOwn(cardFonts, value); }
