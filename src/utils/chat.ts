export function renderWithEmojis(text: string, emojis: Record<string, string> = {}): string {
  return text.replace(/\{:([^:]+):\}/g, (match, key) => {
    const url = emojis[key]
    if (url) return `<img src="${url}" height="20" style="display:inline;vertical-align:middle;margin:0 1px" alt="${key}">`
    return match
  })
}
