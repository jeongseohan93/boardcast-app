/**
 * [오버레이 공유 모듈]
 *
 * 여러 오버레이 페이지(OverlayPage, OverlaySettingsPage, EmotePartyPage 등)에서
 * 공통으로 사용하는 타입·상수·유틸·미니 프리뷰 컴포넌트를 모아둔 공유 모듈.
 *
 * ── 인터페이스 구조 ──────────────────────────────────────────────────────
 *   ThemeDef        → 개별 테마(id, name, desc) 정의
 *   OverlayDef      → 오버레이 종류 정의 (key, label, path, 테마 목록 등)
 *   ChatOvSettings  → 채팅 오버레이 설정 (폰트 크기, 최대 메시지 수, 페이드 시간 등)
 *   AlertOvSettings → 후원·팔로우 알림 오버레이 공통 설정
 *   EmoteOvSettings → 이모트 파티 오버레이 설정 (크기, 중력, 퍼짐도 등)
 *   AvachatOvSettings → 아바챗 오버레이 설정 (슬롯별 이미지 URL, 크기)
 *   AllOvSettings   → 위 설정들을 하나로 묶은 최상위 타입
 *
 * ── DEFAULT_OV_SETTINGS ──────────────────────────────────────────────────
 *   모든 오버레이 설정의 기본값. buildOverlayUrl 이 기본값과 다른 설정만 URL 파라미터로 추가하는데
 *   이 상수를 비교 기준으로 사용한다.
 *
 * ── buildOverlayUrl ──────────────────────────────────────────────────────
 *   오버레이 경로 + 현재 설정 → OBS Browser Source URL 을 생성하는 순수 함수.
 *   기본값과 동일한 설정은 파라미터에서 제외해 URL 을 최대한 짧게 유지한다.
 *   이렇게 하면 OBS 에 입력할 URL 이 깔끔하고, 재현 가능성이 높아진다.
 *
 * ── PW / PH (미리보기 원본 크기) ─────────────────────────────────────────
 *   PW=156, PH=88 은 미리보기 컨테이너의 고정 크기(px).
 *   실제 오버레이(1920×1080)를 이 크기로 scale() 변환해 iframe 미리보기에 적용한다.
 *
 * ── CL (색상 단축 상수) ───────────────────────────────────────────────────
 *   미니 프리뷰 컴포넌트에서 반복 사용되는 Tailwind 색상 클래스를 짧은 키로 매핑한 객체.
 *   코드 중복을 줄이고 색상 일관성을 유지하기 위한 내부 상수.
 *
 * ── StreamPreviewCard ────────────────────────────────────────────────────
 *   오버레이 미리보기 iframe 을 감싸는 카드 컴포넌트.
 *   scale transform 으로 1920×1080 오버레이를 PW×PH 미리보기 영역에 맞춰 축소 표시한다.
 *
 * ── 미니 프리뷰 컴포넌트 (DonationMini / FollowMini / ChatMini / EmoteMini / AvachatMini) ─
 *   각 오버레이 유형별로 실제 오버레이와 유사한 모양의 SVG/HTML 미리보기를 렌더링한다.
 *   실제 iframe 로드 없이 순수 React 로 렌더링해 설정 변경 시 즉각 반응하도록 한다.
 */
export interface ThemeDef { id: number; name: string; desc: string }
export interface OverlayDef {
  key: string
  label: string
  path: string
  color: string
  testType: string
  themes: ThemeDef[]
}
export interface ChatOvSettings    { fontSize: number; maxMsgs: number; fadeMs: number; nickColor: string; noticeEnabled: boolean; noticeTheme: number }
export interface AlertOvSettings   { fontSize: number; showMs: number; imageDataUrl?: string; imageName?: string; imageSize?: number }
export interface EmoteOvSettings   { size: number; maxParts: number; gravity: number; spread: number }
export interface AvachatOvSettings { images: string[]; size: number }
export interface AllOvSettings { chat: ChatOvSettings; donation: AlertOvSettings; follow: AlertOvSettings; emote: EmoteOvSettings; avachat: AvachatOvSettings }

export const DEFAULT_OV_SETTINGS: AllOvSettings = {
  chat:     { fontSize: 18, maxMsgs: 15, fadeMs: 0, nickColor: '', noticeEnabled: true, noticeTheme: 1 },
  donation: { fontSize: 0, showMs: 7, imageDataUrl: '', imageName: '', imageSize: 118 },
  follow:   { fontSize: 0, showMs: 5, imageDataUrl: '', imageName: '', imageSize: 118 },
  emote:    { size: 42, maxParts: 90, gravity: 900, spread: 1 },
  avachat:  { images: ['','','','',''], size: 100 },
}

export const DONATION_THEMES: ThemeDef[] = [
  { id: 1,  name: '기본',        desc: '하단 중앙 카드' },
  { id: 2,  name: '배너',        desc: '하단 풀스크린' },
  { id: 3,  name: '네온',        desc: '중앙 보라 글로우' },
  { id: 4,  name: '토스트',      desc: '우상단 알림' },
  { id: 5,  name: '리본',        desc: '상단 풀스크린' },
  { id: 6,  name: '팝업',        desc: '중앙 대형 골드' },
  { id: 7,  name: '미니멀',      desc: '좌하단 슬림' },
  { id: 8,  name: '사이드',      desc: '좌측 패널' },
  { id: 9,  name: '카드',        desc: '우하단 카드' },
  { id: 10, name: '스포트라이트', desc: '중앙 글로우' },
]

export const FOLLOW_THEMES: ThemeDef[] = [
  { id: 1,  name: '카드',     desc: '우상단 청록' },
  { id: 2,  name: '슬라이드', desc: '상단 배너 스카이' },
  { id: 3,  name: '하트',     desc: '중앙 핑크' },
  { id: 4,  name: '하단 카드', desc: '우하단 퍼플' },
  { id: 5,  name: '좌측 카드', desc: '좌상단 옐로우' },
  { id: 6,  name: '팝업',     desc: '중앙 핫핑크' },
  { id: 7,  name: '토스트',   desc: '좌하단 블루' },
  { id: 8,  name: '필',       desc: '중앙 그린 pill' },
  { id: 9,  name: '리본',     desc: '하단 오렌지' },
  { id: 10, name: '사이드',   desc: '우측 바이올렛' },
]

export const CHAT_THEMES: ThemeDef[] = [
  { id: 1,  name: '기본',     desc: '다크 말풍선' },
  { id: 2,  name: '카카오',   desc: '노란 말풍선' },
  { id: 3,  name: '네온',     desc: '발광 테두리' },
  { id: 4,  name: '박스',     desc: '좌측 컬러 테두리' },
  { id: 5,  name: '레인보우', desc: '그라데이션 테두리' },
  { id: 6,  name: '라운드',   desc: '원형 말풍선' },
  { id: 7,  name: '말풍선',   desc: '꼬리형 말풍선' },
  { id: 8,  name: '레트로',   desc: '터미널 스타일' },
  { id: 9,  name: '포스트잇', desc: '스티커 카드' },
  { id: 10, name: '게임 HUD', desc: '각진 패널' },
]

export const EMOTE_THEMES: ThemeDef[] = [
  { id: 1, name: '기본',   desc: '기본 파티' },
  { id: 2, name: '네온',   desc: '발광 파티' },
  { id: 3, name: '버블',   desc: '버블 팝' },
  { id: 4, name: '스티커', desc: '스티커 아웃라인' },
  { id: 5, name: '픽셀',   desc: '픽셀 아케이드' },
]

export const OVERLAYS: OverlayDef[] = [
  { key: 'chat',       label: '채팅 오버레이',    path: '/overlay/chat',       color: '#A78BFA', testType: 'chat',       themes: CHAT_THEMES     },
  { key: 'donation',   label: '후원 알림',         path: '/overlay/donation',   color: '#00FFA3', testType: 'donation',   themes: DONATION_THEMES },
  { key: 'follow',     label: '팔로우 알림',       path: '/overlay/follow',     color: '#06D6A0', testType: 'follow',     themes: FOLLOW_THEMES   },
  { key: 'avachat',    label: '아바타 채팅',       path: '/overlay/avachat',    color: '#F472B6', testType: 'avachat',    themes: []              },
  { key: 'roulette',   label: '룰렛 오버레이',     path: '/overlay/roulette',   color: '#FFD166', testType: 'roulette',   themes: []              },
  { key: 'tamagotchi', label: '다마고치 오버레이',  path: '/overlay/tamagotchi', color: '#F472B6', testType: 'tamagotchi', themes: []              },
  { key: 'emote',      label: '이모티콘 파티',     path: '/overlay/emote',      color: '#F472B6', testType: 'emote',      themes: EMOTE_THEMES    },
  { key: 'video-donation', label: '영상 후원',      path: '/overlay/video-donation', color: '#38BDF8', testType: 'video-donation', themes: [] },
  { key: 'mission',       label: '미션 알림',       path: '/overlay/mission',        color: '#00FFA3', testType: 'mission',        themes: [] },
]

export function buildOverlayUrl(
  base: string,
  path: string,
  key: string,
  themes: Record<string, number>,
  settings: AllOvSettings,
) {
  const parts: string[] = []
  const t = themes[key] || 1
  if (t > 1) parts.push(`theme=${t}`)
  if (key === 'chat') {
    const s = settings.chat || DEFAULT_OV_SETTINGS.chat
    if (s.fontSize !== DEFAULT_OV_SETTINGS.chat.fontSize) parts.push(`fontSize=${s.fontSize}`)
    if (s.maxMsgs !== DEFAULT_OV_SETTINGS.chat.maxMsgs) parts.push(`maxMsgs=${s.maxMsgs}`)
    if (s.fadeMs !== DEFAULT_OV_SETTINGS.chat.fadeMs) parts.push(`fadeMs=${s.fadeMs}`)
    if (s.nickColor) parts.push(`nickColor=${encodeURIComponent(s.nickColor)}`)
    if (s.noticeEnabled === false) parts.push('notice=0')
    if (s.noticeTheme !== DEFAULT_OV_SETTINGS.chat.noticeTheme) parts.push(`noticeTheme=${s.noticeTheme}`)
  } else if (key === 'donation') {
    const s = settings.donation || DEFAULT_OV_SETTINGS.donation
    if (s.fontSize > 0) parts.push(`fontSize=${s.fontSize}`)
    if (s.showMs !== DEFAULT_OV_SETTINGS.donation.showMs) parts.push(`showMs=${s.showMs}`)
  } else if (key === 'follow') {
    const s = settings.follow || DEFAULT_OV_SETTINGS.follow
    if (s.fontSize > 0) parts.push(`fontSize=${s.fontSize}`)
    if (s.showMs !== DEFAULT_OV_SETTINGS.follow.showMs) parts.push(`showMs=${s.showMs}`)
  } else if (key === 'emote') {
    const s = settings.emote || DEFAULT_OV_SETTINGS.emote
    if (s.size !== DEFAULT_OV_SETTINGS.emote.size) parts.push(`size=${s.size}`)
    if (s.maxParts !== DEFAULT_OV_SETTINGS.emote.maxParts) parts.push(`maxParts=${s.maxParts}`)
    if (s.gravity !== DEFAULT_OV_SETTINGS.emote.gravity) parts.push(`gravity=${s.gravity}`)
    if (s.spread !== DEFAULT_OV_SETTINGS.emote.spread) parts.push(`spread=${s.spread}`)
  } else if (key === 'avachat') {
    const s = settings.avachat || DEFAULT_OV_SETTINGS.avachat
    if (s.size !== DEFAULT_OV_SETTINGS.avachat.size) parts.push(`size=${s.size}`)
  }
  return `${base}${path}${parts.length ? `?${parts.join('&')}` : ''}`
}

const CL = { m: '#00FFA3', g: '#06D6A0', p: '#A78BFA', y: '#FFD700', r: '#FF6B9D', w: '#ffffff' }
const PW = 156
const PH = 88

function Line({ t, l, w, h, c, op = 1 }: { t: number; l: number; w: number; h: number; c: string; op?: number }) {
  return <div style={{ position: 'absolute', top: t, left: l, width: w, height: h, background: c, borderRadius: 2, opacity: op }} />
}

export function StreamBg() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0a0c12,#131620)' }} />
      <Line t={8} l={8} w={34} h={3} c="#ef4444" op={0.7} />
      <Line t={14} l={8} w={26} h={3} c="#38bdf8" op={0.55} />
      <div style={{ position: 'absolute', top: 6, right: 7, fontSize: 6, color: '#ffffff55', fontFamily: 'monospace' }}>12,450</div>
    </>
  )
}

function DonationMini({ id }: { id: number }) {
  // donation.html의 실제 --accent 색상과 1:1 대응
  const ACC: Record<number,string> = {
    1:'#38BDF8', 2:'#00FFA3', 3:'#A78BFA', 4:'#F472B6',
    5:'#C026D3',  6:'#FACC15', 7:'#60A5FA', 8:'#34D399',
    9:'#FB923C', 10:'#7C3AED',
  }
  const A = ACC[id] || '#38BDF8'
  const G = '#FFD338'

  // 이미지 자리 (원형 아이콘)
  const img = (sz: number) => (
    <div style={{ width:sz, height:sz, borderRadius:'50%', flexShrink:0,
      background:`radial-gradient(circle at 35% 35%,#fff 0%,${A} 100%)`,
      boxShadow:`0 2px 6px rgba(0,0,0,.7)` }} />
  )
  // 텍스트 (닉네임 + 금액)
  const txt = (fs: number, align: 'center'|'left' = 'center') => (
    <span style={{ fontSize:fs, fontWeight:900, color:'#fff', whiteSpace:'nowrap', textAlign:align, lineHeight:1.35 }}>
      <span style={{ color:A }}>닉</span>님이 <span style={{ color:G }}>5,000</span>치즈!
    </span>
  )

  if (id === 1) return ( // 기본 — 하단 중앙 column, 다크 카드+파란 테두리
    <div style={{ position:'absolute', bottom:5, left:'50%', transform:'translateX(-50%)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:3,
      padding:'5px 10px', background:'rgba(8,16,28,.95)', border:`1.5px solid ${A}`,
      borderRadius:7, boxShadow:`0 0 12px rgba(56,189,248,.25)` }}>
      {img(15)}{txt(5.5)}
    </div>
  )

  if (id === 2) return ( // 배너 — 하단 풀폭 row, 초록 상단 선
    <div style={{ position:'absolute', bottom:0, left:0, right:0,
      display:'flex', alignItems:'center', gap:5, padding:'4px 7px',
      background:'linear-gradient(90deg,#061410f5,#0a1a14f5)', borderTop:`2px solid ${A}` }}>
      {img(14)}{txt(5.5,'left')}
    </div>
  )

  if (id === 3) return ( // 네온 — 중앙 column, 보라 테두리+글로우
    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:3,
      padding:'6px 10px', background:'rgba(6,4,16,.97)', border:`1.5px solid ${A}`,
      borderRadius:9, boxShadow:`0 0 20px rgba(167,139,250,.35), inset 0 0 12px rgba(167,139,250,.06)` }}>
      {img(16)}
      <span style={{ fontSize:5.5, fontWeight:900, color:'#EDE9FE', whiteSpace:'nowrap',
        textShadow:`0 0 8px ${A}` }}>
        <span style={{ color:A }}>닉</span>님이 <span style={{ color:G }}>5K</span>치즈!
      </span>
    </div>
  )

  if (id === 4) return ( // 토스트 — 우상단 row, 핑크 테두리
    <div style={{ position:'absolute', top:5, right:5,
      display:'flex', alignItems:'center', gap:4, padding:'4px 6px',
      background:'rgba(22,10,20,.97)', border:`1.5px solid ${A}`,
      borderRadius:7, boxShadow:'0 4px 14px rgba(0,0,0,.7)', maxWidth:78 }}>
      {img(13)}{txt(5,'left')}
    </div>
  )

  if (id === 5) return ( // 리본 — 상단 풀폭 row, 다크퍼플 배경+퍼플 하단 선
    <div style={{ position:'absolute', top:0, left:0, right:0,
      display:'flex', alignItems:'center', gap:5, padding:'4px 7px',
      background:'linear-gradient(90deg,#1a0b2af5,#2d1050f5)', borderBottom:`2px solid ${A}` }}>
      {img(14)}{txt(5.5,'left')}
    </div>
  )

  if (id === 6) return ( // 팝업 — 중앙 column, 골드 테두리+외곽 링
    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
      padding:'8px 14px', background:'rgba(14,11,2,.97)', border:`2px solid ${A}`,
      borderRadius:10, boxShadow:`0 0 0 4px rgba(250,204,21,.12), 0 0 28px rgba(250,204,21,.28)` }}>
      {img(20)}
      <span style={{ fontSize:6, fontWeight:900, color:'#FEFCE8', whiteSpace:'nowrap' }}>
        <span style={{ color:A }}>닉</span>님이 <span style={{ color:A }}>5K</span>치즈!
      </span>
    </div>
  )

  if (id === 7) return ( // 미니멀 — 좌하단 row, 좌측 파란 선
    <div style={{ position:'absolute', bottom:5, left:0,
      display:'flex', alignItems:'center', gap:4, padding:'4px 7px',
      background:'rgba(8,12,22,.9)', borderLeft:`3px solid ${A}`,
      borderRadius:'0 6px 6px 0' }}>
      {img(13)}{txt(5,'left')}
    </div>
  )

  if (id === 8) return ( // 사이드 — 좌측 column, 초록 우측 선
    <div style={{ position:'absolute', top:'50%', left:0, transform:'translateY(-50%)', width:29,
      display:'flex', flexDirection:'column', alignItems:'center', gap:3,
      padding:'7px 4px', background:'linear-gradient(180deg,rgba(16,28,20,.97),rgba(8,16,12,.97))',
      borderRight:`2px solid ${A}`, borderRadius:'0 8px 8px 0' }}>
      {img(14)}
      <div style={{ width:'75%', height:1, background:`${A}40` }} />
      <span style={{ fontSize:4.5, fontWeight:900, color:'#fff', textAlign:'center', lineHeight:1.4 }}>
        닉<br/><span style={{ color:G }}>5K</span>
      </span>
    </div>
  )

  if (id === 9) return ( // 카드 — 우하단 column, align-items:flex-start, 주황
    <div style={{ position:'absolute', bottom:5, right:5,
      display:'flex', flexDirection:'column', alignItems:'flex-start', gap:3,
      padding:'5px 7px', background:'linear-gradient(135deg,rgba(20,14,6,.97),rgba(28,18,8,.97))',
      border:`1.5px solid ${A}`, borderRadius:8, boxShadow:'0 6px 20px rgba(0,0,0,.7)' }}>
      {img(14)}
      <span style={{ fontSize:5.5, fontWeight:900, color:'#fff', whiteSpace:'nowrap' }}>
        <span style={{ color:A }}>닉</span> <span style={{ color:G }}>5K</span>치즈
      </span>
    </div>
  )

  if (id === 10) return ( // 스포트라이트 — 중앙, 상단 타원 글로우+다크 카드
    <>
      <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
        width:60, height:36,
        background:`radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.38),transparent 75%)` }} />
      <div style={{ position:'absolute', top:'46%', left:'50%', transform:'translate(-50%,-50%)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:3,
        padding:'6px 10px',
        background:'radial-gradient(ellipse at 50% 0%,rgba(26,18,48,.98),rgba(8,5,18,.98) 72%)',
        border:`1px solid rgba(124,58,237,.35)`, borderRadius:9,
        boxShadow:'0 0 28px rgba(124,58,237,.28)' }}>
        {img(15)}
        <span style={{ fontSize:5.5, fontWeight:900, color:'#fff', whiteSpace:'nowrap',
          textShadow:`0 0 10px ${A}` }}>
          <span style={{ color:'#C4B5FD' }}>닉</span>님이 <span style={{ color:G }}>5K</span>!
        </span>
      </div>
    </>
  )

  return null
}

function FollowMini({ id }: { id: number }) {
  const ACC: Record<number,string> = {
    1:'#06D6A0', 2:'#38BDF8', 3:'#FF6B9D', 4:'#A78BFA',
    5:'#FFD166', 6:'#F472B6', 7:'#60A5FA', 8:'#34D399',
    9:'#FB923C', 10:'#7C3AED',
  }
  const A = ACC[id] || '#06D6A0'

  // 이미지 플레이스홀더 (원형, 테마 색상 그라디언트)
  const imgBox = (sz: number) => (
    <div style={{
      width:sz, height:sz, borderRadius:'50%', flexShrink:0,
      background:`radial-gradient(circle at 35% 35%, #fff 0%, ${A} 100%)`,
      boxShadow:`0 2px 6px rgba(0,0,0,.7)`,
    }} />
  )

  // 텍스트 블록
  const txt = (accentColor = A) => (
    <div>
      <div style={{ fontSize:5.5, fontWeight:900, color:accentColor, whiteSpace:'nowrap' }}>닉네임님이 팔로우!</div>
      <div style={{ fontSize:4.5, color:'rgba(255,255,255,.6)', whiteSpace:'nowrap' }}>팔로워 1,234명</div>
    </div>
  )

  // row 레이아웃 카드 (공통)
  const rowCard = (pos: React.CSSProperties, bg: string, border: string) => (
    <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 7px',
      background:bg, border:`1.5px solid ${border}`, borderRadius:7, ...pos }}>
      {imgBox(13)}{txt()}
    </div>
  )

  if (id === 1) return rowCard( // 우상단
    { position:'absolute', top:5, right:5, width:80 },
    'linear-gradient(135deg,rgba(22,26,30,.96),rgba(32,38,44,.96))',
    A,
  )

  if (id === 2) return ( // 상단 배너 row
    <div style={{ position:'absolute', top:0, left:0, right:0, display:'flex', justifyContent:'center',
      alignItems:'center', gap:5, padding:'4px 8px',
      background:'linear-gradient(90deg,transparent,rgba(10,20,32,.96) 15%,rgba(10,20,32,.96) 85%,transparent)',
      borderBottom:`2px solid ${A}` }}>
      {imgBox(13)}
      <div style={{ fontSize:5.5, fontWeight:900, color:A, whiteSpace:'nowrap' }}>닉네임님이 팔로우!</div>
    </div>
  )

  if (id === 3) return ( // 중앙 column (이미지 크게)
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:5 }}>
      {imgBox(22)}
      <div style={{ fontSize:6.5, fontWeight:900, color:A, textAlign:'center',
        textShadow:`0 0 8px ${A}60` }}>닉네임님이 팔로우!</div>
      <div style={{ fontSize:5, color:'rgba(255,255,255,.65)' }}>팔로워 1,234명</div>
    </div>
  )

  if (id === 4) return rowCard( // 우하단
    { position:'absolute', bottom:5, right:5, width:80 },
    'linear-gradient(135deg,rgba(18,12,28,.96),rgba(28,20,42,.96))',
    A,
  )

  if (id === 5) return rowCard( // 좌상단
    { position:'absolute', top:5, left:5, width:80 },
    'linear-gradient(135deg,rgba(28,22,8,.96),rgba(38,30,12,.96))',
    A,
  )

  if (id === 6) return ( // 중앙 팝업 column
    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
      padding:'8px 14px',
      background:'linear-gradient(145deg,rgba(26,16,30,.98),rgba(36,22,42,.98))',
      border:`2px solid ${A}`, borderRadius:12,
      boxShadow:`0 0 28px rgba(0,0,0,.85), 0 0 18px ${A}33` }}>
      {imgBox(18)}
      <div style={{ fontSize:6, fontWeight:900, color:A, whiteSpace:'nowrap' }}>닉네임님이 팔로우!</div>
      <div style={{ fontSize:4.5, color:'rgba(255,255,255,.65)' }}>팔로워 1,234명</div>
    </div>
  )

  if (id === 7) return ( // 좌하단 토스트 (left border)
    <div style={{ position:'absolute', bottom:5, left:0,
      display:'flex', alignItems:'center', gap:5, padding:'4px 7px',
      background:'rgba(8,14,22,.92)', borderLeft:`3px solid ${A}`,
      borderRadius:'0 7px 7px 0' }}>
      {imgBox(13)}{txt()}
    </div>
  )

  if (id === 8) return ( // 중앙 pill row
    <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
      display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
      background:'linear-gradient(135deg,rgba(14,26,20,.97),rgba(22,38,30,.97))',
      border:`2px solid ${A}`, borderRadius:40,
      boxShadow:`0 0 18px ${A}33` }}>
      {imgBox(13)}
      <div style={{ fontSize:5.5, fontWeight:900, color:A, whiteSpace:'nowrap' }}>닉네임님이 팔로우!</div>
    </div>
  )

  if (id === 9) return ( // 하단 리본 row
    <div style={{ position:'absolute', bottom:0, left:0, right:0,
      display:'flex', justifyContent:'center', alignItems:'center', gap:5, padding:'4px 8px',
      background:'linear-gradient(90deg,transparent,rgba(24,14,6,.96) 15%,rgba(24,14,6,.96) 85%,transparent)',
      borderTop:`2px solid ${A}` }}>
      {imgBox(13)}
      <div style={{ fontSize:5.5, fontWeight:900, color:A, whiteSpace:'nowrap' }}>닉네임님이 팔로우!</div>
    </div>
  )

  if (id === 10) return ( // 우측 사이드 패널 column
    <div style={{ position:'absolute', top:0, right:0, bottom:0, width:40,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4,
      background:'linear-gradient(180deg,rgba(18,12,28,.97),rgba(10,8,20,.97))',
      borderLeft:`2px solid ${A}50` }}>
      {imgBox(15)}
      <div style={{ fontSize:4.5, fontWeight:900, color:A, textAlign:'center', lineHeight:1.4 }}>
        닉<br/>팔로우!
      </div>
    </div>
  )

  return null
}

function ChatMini({ id }: { id: number }) {
  const COLS = ['#FF6B9D','#72EFDD','#FFD166']

  // chat.html 테마별 메시지 행 렌더
  const rows = [0,1,2].map(i => {
    const c = COLS[i]
    const widths = [55, 42, 68]
    const w = widths[i]

    if (id === 1) return ( // 기본 — 다크 버블
      <div key={i} style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 5px',
        background:'rgba(0,0,0,.6)', borderRadius:4, marginBottom:3 }}>
        <div style={{ fontSize:5, fontWeight:700, color:c, flexShrink:0 }}>닉</div>
        <div style={{ width:w*0.5, height:2, borderRadius:1, background:'rgba(255,255,255,.65)' }} />
      </div>
    )
    if (id === 2) return ( // 카카오 — 노란 버블
      <div key={i} style={{ padding:'2px 6px', background:'#FEE500', borderRadius:'0 5px 5px 5px',
        marginBottom:3, maxWidth:w*0.7 }}>
        <div style={{ fontSize:4.5, color:'#3C1E1E', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden' }}>닉{['','',''][i]}</div>
        <div style={{ width:w*0.45, height:2, background:'#3C1E1E50', borderRadius:1, marginTop:1 }} />
      </div>
    )
    if (id === 3) return ( // 네온 — 컬러 테두리+글로우
      <div key={i} style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 5px',
        background:'rgba(10,11,15,.95)', border:`1px solid ${c}`,
        boxShadow:`0 0 6px ${c}60`, borderRadius:4, marginBottom:3 }}>
        <div style={{ fontSize:5, fontWeight:700, color:c, flexShrink:0 }}>닉</div>
        <div style={{ width:w*0.5, height:2, borderRadius:1, background:'rgba(255,255,255,.5)' }} />
      </div>
    )
    if (id === 4) return ( // 박스 — 좌측 컬러 세로선
      <div key={i} style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 5px',
        background:'rgba(20,22,24,.95)', borderLeft:`3px solid ${c}`, marginBottom:3 }}>
        <div style={{ fontSize:5, fontWeight:700, color:c, flexShrink:0 }}>닉</div>
        <div style={{ width:w*0.5, height:2, borderRadius:1, background:'rgba(255,255,255,.5)' }} />
      </div>
    )
    if (id === 5) return ( // 레인보우 — 그라데이션 테두리
      <div key={i} style={{ position:'relative', display:'flex', alignItems:'center', gap:3,
        padding:'2px 5px', background:'#1a1c23', borderRadius:4, marginBottom:3 }}>
        <div style={{ position:'absolute', inset:0, borderRadius:4,
          background:`linear-gradient(90deg,${c},${COLS[(i+1)%3]})`,
          WebkitMask:'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite:'xor', padding:1.5, pointerEvents:'none' }} />
        <div style={{ fontSize:5, fontWeight:700, color:c, flexShrink:0, position:'relative' }}>닉</div>
        <div style={{ width:w*0.5, height:2, borderRadius:1, background:'rgba(255,255,255,.5)', position:'relative' }} />
      </div>
    )
    if (id === 6) return ( // 라운드 — pill 버블
      <div key={i} style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 8px',
        background:'rgba(37,40,48,.93)', borderRadius:30, border:'1px solid rgba(255,255,255,.1)',
        marginBottom:3, width:'fit-content' }}>
        <div style={{ fontSize:5, fontWeight:700, color:c, flexShrink:0 }}>닉</div>
        <div style={{ width:w*0.45, height:2, borderRadius:1, background:'rgba(255,255,255,.55)' }} />
      </div>
    )
    if (id === 7) return ( // 말풍선 — 꼬리 있는 버블
      <div key={i} style={{ position:'relative', marginLeft:5, marginBottom:4 }}>
        <div style={{ position:'absolute', left:-4, top:3, width:0, height:0,
          borderTop:'4px solid transparent',
          borderRight:'5px solid rgba(30,34,48,.9)',
          borderBottom:0 }} />
        <div style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 6px',
          background:'rgba(30,34,48,.9)', border:'1px solid rgba(255,255,255,.13)',
          borderRadius:'2px 7px 7px 7px' }}>
          <div style={{ fontSize:5, fontWeight:700, color:c, flexShrink:0 }}>닉</div>
          <div style={{ width:w*0.45, height:2, borderRadius:1, background:'rgba(255,255,255,.55)' }} />
        </div>
      </div>
    )
    if (id === 8) return ( // 레트로 — 터미널
      <div key={i} style={{ display:'flex', alignItems:'center', gap:2, padding:'1px 2px',
        borderBottom:'1px solid rgba(0,255,65,.1)', marginBottom:2,
        fontFamily:'monospace' }}>
        <span style={{ fontSize:5, color:'#00ff41', fontWeight:700 }}>[닉]</span>
        <div style={{ width:w*0.45, height:2, background:'#c8ffcf80', borderRadius:1 }} />
      </div>
    )
    if (id === 9) return ( // 포스트잇 — 노란 스티커
      <div key={i} style={{ padding:'2px 6px', background:'#FFF9C4',
        borderRadius:'2px 7px 7px 7px', borderTop:`3px solid ${c}`,
        marginBottom:3, maxWidth:w*0.7, boxShadow:'1px 2px 4px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize:5, fontWeight:700, color:'#555', whiteSpace:'nowrap' }}>닉</div>
        <div style={{ width:w*0.45, height:2, background:'#22222250', borderRadius:1, marginTop:1 }} />
      </div>
    )
    if (id === 10) return ( // 게임 HUD — 우측 각진
      <div key={i} style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 5px',
        background:`linear-gradient(90deg,rgba(15,25,35,.93),rgba(26,36,50,.93))`,
        borderTop:'1px solid rgba(79,195,247,.15)', marginBottom:2,
        clipPath:'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%)' }}>
        <div style={{ fontSize:4.5, fontWeight:700, color:c, flexShrink:0 }}>닉</div>
        <div style={{ width:w*0.45, height:2, background:'rgba(207,232,255,.5)', borderRadius:1 }} />
      </div>
    )
    return null
  })

  const isRight = id === 10
  return (
    <div style={{ position:'absolute', bottom:4, left:isRight ? undefined : 6, right:isRight ? 4 : undefined, width:isRight ? 68 : 112 }}>
      {rows}
    </div>
  )
}

function EmoteMini({ id }: { id: number }) {
  const icons = ['P', 'H', 'A', 'R', 'T']
  return (
    <>
      {icons.map((icon, i) => (
        <div key={icon} style={{ position: 'absolute', left: 42 + Math.cos(i * 1.25) * 28, top: 35 + Math.sin(i * 1.25) * 20, width: 18, height: 18, borderRadius: id === 3 ? 999 : 4, background: id === 2 ? '#F472B6' : '#ffffff24', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, boxShadow: id === 2 ? '0 0 12px #F472B6' : undefined }}>
          {icon}
        </div>
      ))}
    </>
  )
}

function AvachatMini() {
  // 아바타 3마리가 하단을 걷고, 한 마리에 말풍선 표시
  const avatars = [
    { x: 26,  emoji: '🐱', bubble: false },
    { x: 72,  emoji: '🐶', bubble: true  },
    { x: 118, emoji: '🐻', bubble: false },
  ]
  return (
    <>
      {avatars.map((av) => (
        <div key={av.x} style={{ position:'absolute', bottom:4, left:av.x - 13, display:'flex', flexDirection:'column', alignItems:'center' }}>
          {av.bubble && (
            <div style={{
              background:'rgba(255,255,255,.95)', color:'#222',
              padding:'3px 6px', borderRadius:6, fontSize:5, fontWeight:700,
              maxWidth:52, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              boxShadow:'0 2px 6px rgba(0,0,0,.3)', marginBottom:3, position:'relative',
            }}>
              <span style={{ color:'#FF6B9D', fontWeight:900 }}>닉</span> 안녕하세요!
              <div style={{ position:'absolute', top:'100%', left:'50%', transform:'translateX(-50%)',
                width:0, height:0, borderLeft:'4px solid transparent',
                borderRight:'4px solid transparent', borderTop:'5px solid rgba(255,255,255,.95)' }} />
            </div>
          )}
          <div style={{ fontSize:20, lineHeight:1 }}>{av.emoji}</div>
        </div>
      ))}
    </>
  )
}

export function StreamPreviewCard({ overlayKey, theme, selected, onClick }: {
  overlayKey: string
  theme: ThemeDef
  selected: boolean
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div
        style={{ width: PW, height: PH, position: 'relative', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}
        className={`border-2 transition-all ${selected ? 'border-accent-mint shadow-lg shadow-accent-mint/20' : 'border-border group-hover:border-white/20'}`}
      >
        <StreamBg />
        {overlayKey === 'donation' && <DonationMini id={theme.id} />}
        {overlayKey === 'follow'   && <FollowMini   id={theme.id} />}
        {overlayKey === 'chat'     && <ChatMini     id={theme.id} />}
        {overlayKey === 'emote'    && <EmoteMini    id={theme.id} />}
        {overlayKey === 'avachat'  && <AvachatMini />}
        {selected && (
          <div style={{ position: 'absolute', top: 5, right: 5, background: '#00FFA3', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#17191D" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
        )}
      </div>
      <div className="text-center max-w-[156px]">
        <p className={`text-xs font-semibold truncate ${selected ? 'text-accent-mint' : 'text-text-primary'}`}>{theme.name}</p>
        <p className="text-xs text-text-muted truncate">{theme.desc}</p>
      </div>
    </button>
  )
}
