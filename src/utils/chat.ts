/**
 * [채팅 렌더링 유틸리티]
 *
 * 채팅 메시지 텍스트 내의 이모티콘 플레이스홀더를 인라인 이미지로 치환하는 유틸 모듈.
 *
 * ── renderWithEmojis ─────────────────────────────────────────────────────
 *   Chzzk 채팅 메시지는 이모티콘을 {:key:} 형태의 플레이스홀더로 전송한다.
 *   이 함수가 해당 패턴을 찾아 emojis[key] URL 의 <img> 태그로 교체한 HTML 문자열을 반환한다.
 *   반환값은 dangerouslySetInnerHTML={{ __html: ... }} 에 직접 삽입된다.
 *
 *   ⚠️  XSS 안전성 보장 조건:
 *   emojis 객체는 서버(소켓 이벤트)에서 전달된 신뢰된 URL 맵이어야 한다.
 *   임의의 사용자 입력으로 emojis 를 채우면 <img onerror="..."> 등의 XSS 가 가능해진다.
 *   text 자체는 innerHTML 에 삽입되지 않으므로 text 내 HTML 태그는 이스케이프된다.
 */
export function renderWithEmojis(text: string, emojis: Record<string, string> = {}, size = 20): string {
  return text.replace(/\{:([^:]+):\}/g, (match, key) => {
    const url = emojis[key]
    if (url) return `<img src="${url}" style="display:inline;vertical-align:middle;margin:0 1px;object-fit:contain;width:${size}px;height:${size}px;flex-shrink:0" alt="${key}">`
    return match
  })
}
