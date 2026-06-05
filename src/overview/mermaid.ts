/** Escape text for safe use inside a Mermaid node label `id["..."]`.
 * Double-quotes use Mermaid's HTML-entity form; newlines collapse to spaces. */
export function mermaidLabel(s: string): string {
  return s.replace(/"/g, "#quot;").replace(/\r?\n/g, " ");
}
