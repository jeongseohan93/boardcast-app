export function renderWithEmojis(text: string, emojis: Record<string, string> = {}, size = 20): string {
  return text.replace(/\{:([^:]+):\}/g, (match, key) => {
    const url = emojis[key]
    if (url) return `<img src="${url}" style="display:inline;vertical-align:middle;margin:0 1px;object-fit:contain;width:${size}px;height:${size}px;flex-shrink:0" alt="${key}">`
    return match
  })
}
