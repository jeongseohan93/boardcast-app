import { useEffect, useState } from 'react'
import { Copy, ExternalLink, Monitor, Play, Wifi, Shield, CheckCircle, AlertTriangle, X } from 'lucide-react'
import { api } from '../api/client'

// ── 타입 ───────────────────────────────────────────────────────────────────────

interface ThemeDef { id: number; name: string; desc: string }
interface OverlayDef {
  key: string; label: string; path: string
  color: string; testType: string; themes: ThemeDef[]
}

const DONATION_THEMES: ThemeDef[] = [
  { id:1,  name:'카드형',      desc:'하단 좌측 카드'       },
  { id:2,  name:'배너형',      desc:'하단 전체 배너'       },
  { id:3,  name:'네온형',      desc:'하단 중앙 글로우'     },
  { id:4,  name:'토스트형',    desc:'상단 우측 알림'       },
  { id:5,  name:'리본형',      desc:'상단 전체 리본'       },
  { id:6,  name:'팝업형',      desc:'화면 중앙 팝업'       },
  { id:7,  name:'미니멀형',    desc:'하단 텍스트만'        },
  { id:8,  name:'사이드형',    desc:'좌측 세로 패널'       },
  { id:9,  name:'우하단형',    desc:'하단 우측 카드'       },
  { id:10, name:'스포트라이트', desc:'화면 중앙 강조'       },
]
const FOLLOW_THEMES: ThemeDef[] = [
  { id:1,  name:'카드형',    desc:'상단 우측 카드'       },
  { id:2,  name:'슬라이드형', desc:'상단 중앙 배너'      },
  { id:3,  name:'하트형',    desc:'화면 중앙 대형'       },
  { id:4,  name:'하단카드형', desc:'하단 우측 카드'      },
  { id:5,  name:'좌상단형',  desc:'상단 좌측 카드'       },
  { id:6,  name:'팝업형',    desc:'화면 중앙 팝업'       },
  { id:7,  name:'토스트형',  desc:'하단 좌측 알림'       },
  { id:8,  name:'원형형',    desc:'중앙 원형 배지'       },
  { id:9,  name:'리본형',    desc:'하단 전체 배너'       },
  { id:10, name:'측면형',    desc:'우측 세로 패널'       },
]
const CHAT_THEMES: ThemeDef[] = [
  { id:1,  name:'기본',     desc:'하단 다크 버블'       },
  { id:2,  name:'카카오톡', desc:'노란 말풍선'           },
  { id:3,  name:'네온',     desc:'닉 컬러 글로우 테두리' },
  { id:4,  name:'박스',     desc:'좌측 컬러 보더'        },
  { id:5,  name:'무지개',   desc:'그라데이션 테두리'     },
  { id:6,  name:'라운드',   desc:'pill 버블'             },
  { id:7,  name:'풍선',     desc:'말풍선 꼬리'           },
  { id:8,  name:'레트로',   desc:'터미널 스타일'         },
  { id:9,  name:'포스트잇', desc:'스티커 카드'           },
  { id:10, name:'게임 HUD', desc:'우측 각진 패널'        },
]
const OVERLAYS: OverlayDef[] = [
  { key:'donation', label:'후원 알림',    path:'/overlay/donation', color:'#00FFA3', testType:'donation', themes:DONATION_THEMES },
  { key:'follow',   label:'팔로우 알림',  path:'/overlay/follow',   color:'#06D6A0', testType:'follow',   themes:FOLLOW_THEMES   },
  { key:'chat',     label:'채팅 오버레이', path:'/overlay/chat',    color:'#A78BFA', testType:'chat',     themes:CHAT_THEMES     },
  { key:'roulette', label:'룰렛 오버레이', path:'/overlay/roulette', color:'#FFD166', testType:'roulette', themes:[]              },
]

// ── 미니 프리뷰 컴포넌트들 ─────────────────────────────────────────────────────

const CL = { m:'#00FFA3', g:'#06D6A0', p:'#A78BFA', y:'#FFD700', r:'#FF6B9D', w:'#ffffff' }

function B({ t=0, l=0, w, h, c, op=1 }: { t?:number; l?:number; w:number; h:number; c:string; op?:number }) {
  return <div style={{ position:'absolute', top:t, left:l, width:w, height:h, background:c, borderRadius:1.5, opacity:op }} />
}

function StreamBg() {
  return (
    <>
      <div style={{ position:'absolute', top:6, left:6, display:'flex', flexDirection:'column', gap:2 }}>
        <div style={{ width:36, height:3, background:'#ff444440', borderRadius:1 }}><div style={{ width:'70%', height:'100%', background:'#ff4444', borderRadius:1 }} /></div>
        <div style={{ width:28, height:3, background:'#44aaff40', borderRadius:1 }}><div style={{ width:'50%', height:'100%', background:'#44aaff', borderRadius:1 }} /></div>
      </div>
      <div style={{ position:'absolute', top:6, right:6, fontSize:6, color:'#ffffff50', fontFamily:'monospace' }}>12,450</div>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:5, height:5 }}>
        <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'#ffffff20', marginTop:-0.5 }} />
        <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:'#ffffff20', marginLeft:-0.5 }} />
      </div>
    </>
  )
}

const cardBg = 'linear-gradient(135deg,#1a1c23ee,#252830ee)'

function CardPreview({ s, color }: { s: React.CSSProperties; color: string }) {
  const w = (s.width as number) || 72
  return (
    <div style={{ position:'absolute', ...s, borderRadius:5 }}>
      <B t={5}  l={5} w={w * .50} h={2.5} c={color} op={.9} />
      <B t={11} l={5} w={w * .72} h={3.5} c={CL.y}  op={.8} />
      <B t={19} l={5} w={w * .42} h={2}   c={CL.w}  op={.3} />
    </div>
  )
}

function DonationMini({ id }: { id: number }) {
  const s = cardBg
  switch (id) {
    case 1: return <CardPreview color={CL.m} s={{ bottom:7, left:7, width:72, height:37, background:s, border:`1px solid ${CL.m}`, boxShadow:`0 0 6px ${CL.m}40` }} />
    case 2: return (
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:22, background:'linear-gradient(90deg,transparent,#1a1c23f0 25%,#1a1c23f0 75%,transparent)', borderTop:`1.5px solid ${CL.m}`, display:'flex', alignItems:'center', gap:5, paddingLeft:10 }}>
        <span style={{ fontSize:10 }}>🧀</span>
        <div style={{ position:'relative', width:50, height:14 }}><B t={1} l={0} w={22} h={2.5} c={CL.m} /><B t={7} l={0} w={36} h={3} c={CL.y} op={.85} /></div>
      </div>
    )
    case 3: return (
      <div style={{ position:'absolute', bottom:7, left:'50%', transform:'translateX(-50%)', width:82, height:33, background:'#0a0b0fee', border:`1px solid ${CL.m}`, borderRadius:6, boxShadow:`0 0 10px ${CL.m}60,0 0 20px ${CL.m}30` }}>
        <B t={5}  l={6} w={42} h={2.5} c={CL.m} op={.95} /><B t={11} l={6} w={60} h={3.5} c={CL.y} op={.8} />
      </div>
    )
    case 4: return <CardPreview color={CL.m} s={{ top:7, right:7, width:62, height:32, background:s, borderLeft:`2.5px solid ${CL.m}`, borderRadius:5 }} />
    case 5: return (
      <div style={{ position:'absolute', top:0, left:0, right:0, height:19, background:'linear-gradient(90deg,transparent,#1a1c23f0 25%,#1a1c23f0 75%,transparent)', borderBottom:`1.5px solid ${CL.m}`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
        <span style={{ fontSize:10 }}>🧀</span>
        <div style={{ position:'relative', height:12, width:50 }}><B t={1} l={0} w={22} h={2.5} c={CL.m} /><B t={7} l={0} w={36} h={3} c={CL.y} op={.8} /></div>
      </div>
    )
    case 6: return (
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:88, height:52, background:'linear-gradient(145deg,#1e2028,#252830)', border:`1.5px solid ${CL.m}`, borderRadius:8, boxShadow:'0 0 20px #00000080' }}>
        <div style={{ position:'absolute', top:7, left:0, right:0, textAlign:'center', fontSize:12 }}>🧀</div>
        <B t={23} l={14} w={60} h={2.5} c={CL.m} /><B t={29} l={10} w={68} h={3.5} c={CL.y} op={.85} /><B t={37} l={18} w={52} h={2} c={CL.w} op={.3} />
      </div>
    )
    case 7: return (
      <div style={{ position:'absolute', bottom:9, left:8, width:70, height:30 }}>
        <div style={{ position:'absolute', left:0, top:0, bottom:0, width:2.5, background:CL.m, borderRadius:1 }} />
        <B t={4}  l={7} w={38} h={2.5} c={CL.m} op={.9} /><B t={11} l={7} w={52} h={3.5} c={CL.y} op={.85} />
      </div>
    )
    case 8: return (
      <div style={{ position:'absolute', top:0, left:0, bottom:0, width:32, background:'linear-gradient(to right,#1a1c23f0,#1a1c23a0)', borderRight:`1px solid ${CL.m}40` }}>
        <div style={{ position:'absolute', top:'50%', left:5, right:4, transform:'translateY(-50%)' }}>
          <B t={0}  l={0} w={22} h={2.5} c={CL.m} /><B t={6} l={0} w={22} h={3.5} c={CL.y} op={.8} /><B t={14} l={0} w={18} h={2} c={CL.w} op={.3} />
        </div>
      </div>
    )
    case 9: return <CardPreview color={CL.m} s={{ bottom:7, right:7, width:56, height:27, background:s, border:`1px solid ${CL.m}60`, borderRadius:5 }} />
    case 10: return (
      <>
        <div style={{ position:'absolute', inset:0, background:'#00000060' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:88, height:52, background:'linear-gradient(145deg,#252830,#1a1c23)', border:`2px solid ${CL.m}`, borderRadius:8, boxShadow:'0 0 0 40px #00000050' }}>
          <B t={10} l={12} w={52} h={2.5} c={CL.m} /><B t={17} l={8}  w={72} h={4}   c={CL.y} op={.85} /><B t={26} l={16} w={56} h={2}   c={CL.w} op={.3} />
        </div>
      </>
    )
    default: return null
  }
}

function FollowCardAt(pos: React.CSSProperties) {
  const s: React.CSSProperties = { position:'absolute', ...pos, width:56, height:30, background:cardBg, border:`1px solid ${CL.g}`, borderRadius:5, boxShadow:`0 0 5px ${CL.g}30`, display:'flex', alignItems:'center', gap:4, padding:'0 5px' }
  return (
    <div style={s}>
      <span style={{ fontSize:13 }}>❤️</span>
      <div style={{ position:'relative', flex:1, height:20 }}><B t={3} l={0} w={22} h={2.5} c={CL.g} /><B t={10} l={0} w={16} h={2} c={CL.w} op={.4} /></div>
    </div>
  )
}
function FollowMini({ id }: { id: number }) {
  switch (id) {
    case 1: return FollowCardAt({ top:7, right:7 })
    case 2: return <div style={{ position:'absolute', top:0, left:0, right:0, height:18, background:'linear-gradient(90deg,transparent,#1a1c23f0 20%,#1a1c23f0 80%,transparent)', borderBottom:`1.5px solid ${CL.g}`, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}><span style={{ fontSize:10 }}>❤️</span><B t={7} l={45} w={30} h={2.5} c={CL.g} /></div>
    case 3: return (
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:4, background:'radial-gradient(ellipse at center,#1a1c23f0 60%,transparent)', padding:'10px 20px', borderRadius:10, textAlign:'center' }}>
        <span style={{ fontSize:28 }}>❤️</span>
        <div style={{ position:'relative', height:6, width:40 }}><B t={0} l={5} w={30} h={2.5} c={CL.r} /></div>
      </div>
    )
    case 4: return FollowCardAt({ bottom:7, right:7 })
    case 5: return FollowCardAt({ top:7, left:7 })
    case 6: return (
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:72, height:44, background:'linear-gradient(145deg,#1e2028,#252830)', border:`2px solid ${CL.g}`, borderRadius:8, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
        <span style={{ fontSize:17 }}>❤️</span>
        <div style={{ position:'relative', height:6, width:44 }}><B t={0} l={7} w={30} h={2.5} c={CL.g} /></div>
      </div>
    )
    case 7: return FollowCardAt({ bottom:7, left:7 })
    case 8: return (
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:90, height:22, background:'linear-gradient(135deg,#1a1c23f8,#252830f8)', border:`1.5px solid ${CL.g}`, borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', gap:7, padding:'0 10px' }}>
        <span style={{ fontSize:11 }}>❤️</span>
        <B t={8} l={42} w={26} h={2.5} c={CL.g} /><B t={8} l={72} w={14} h={2} c={CL.w} op={.4} />
      </div>
    )
    case 9: return <div style={{ position:'absolute', bottom:0, left:0, right:0, height:20, background:'linear-gradient(90deg,transparent,#1a1c23f0 20%,#1a1c23f0 80%,transparent)', borderTop:`1.5px solid ${CL.g}`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}><span style={{ fontSize:11 }}>❤️</span><B t={8} l={42} w={30} h={2.5} c={CL.g} /></div>
    case 10: return (
      <div style={{ position:'absolute', top:0, right:0, bottom:0, width:30, background:'linear-gradient(to left,#1a1c23f0,#1a1c23a0)', borderLeft:`1px solid ${CL.g}40`, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', gap:5 }}>
        <span style={{ fontSize:13 }}>❤️</span>
        <div style={{ position:'relative', width:18, height:6 }}><B t={0} l={2} w={14} h={2.5} c={CL.g} /></div>
      </div>
    )
    default: return null
  }
}

const CC = ['#FF6B9D','#72EFDD','#FFD166','#C77DFF','#06D6A0']
const GRADS = [
  'linear-gradient(90deg,#FF6B9D,#C77DFF)',
  'linear-gradient(90deg,#72EFDD,#00FFA3)',
  'linear-gradient(90deg,#FFD166,#F4A261)',
]

// 채팅 미니 프리뷰: 뱃지 + 닉네임 + 텍스트 한 줄
function CMsgRow({ t, l, w, nc, bg, bLeft, bTop, pill, yellow, neon, retro, postit, game, arrow }: {
  t:number; l:number; w:number; nc:string
  bg?:string; bLeft?:string; bTop?:string; pill?:boolean; yellow?:boolean; neon?:string
  retro?:boolean; postit?:boolean; game?:boolean; arrow?:boolean
}) {
  const br = pill ? 20 : game ? '0 3px 3px 0' : arrow ? '2px 8px 8px 8px' : 4
  const bg2 = yellow ? '#FEE500' : postit ? '#FFF9C4' : game ? 'linear-gradient(90deg,#0f1923ee,#1a2432ee)' : bg || '#00000088'
  const ml = arrow ? 5 : 0
  return (
    <div style={{ position:'absolute', top:t, left:l+ml, width:w, background:bg2, borderLeft:bLeft, borderTop:bTop, borderRadius:br, padding:'2px 5px', display:'flex', alignItems:'center', gap:3, boxShadow:neon?`0 0 5px ${nc}60`:undefined, border:neon?`1px solid ${nc}`:undefined }}>
      {/* badge dot */}
      <div style={{ width:8, height:8, background:'#FF4444', borderRadius: pill ? 4 : 2, flexShrink:0, opacity: retro ? 0 : 1 }} />
      {/* nick */}
      <div style={{ width:18, height:3, background: retro ? '#00ff41' : nc, borderRadius:1.5, flexShrink:0 }} />
      {/* text */}
      <div style={{ flex:1, height:2.5, background: yellow||postit ? '#3C1E1Eaa' : retro ? '#c8ffcf' : CL.w, borderRadius:1, opacity: retro||yellow||postit ? .7 : .45 }} />
      {/* arrow hint */}
      {arrow && <div style={{ position:'absolute', left:-5, top:5, width:0, height:0, borderTop:'4px solid transparent', borderRight:'5px solid #ffffff20', borderBottom:0 }} />}
    </div>
  )
}

function ChatMini({ id }: { id: number }) {
  const ls = CC.slice(0, 3)
  switch (id) {
    // 1. 기본 — 다크 버블
    case 1: return <>{ls.map((nc,i) => <CMsgRow key={i} t={58+i*10} l={7} w={92} nc={nc} bg="#00000088" />)}</>
    // 2. 카카오톡 — 노란 말풍선
    case 2: return <>{ls.map((nc,i) => <CMsgRow key={i} t={56+i*11} l={7} w={92} nc={nc} yellow />)}</>
    // 3. 네온 — 컬러 글로우 테두리
    case 3: return <>{ls.map((nc,i) => <CMsgRow key={i} t={58+i*10} l={7} w={90} nc={nc} neon={nc} bg="#0a0b0ff0" />)}</>
    // 4. 박스 — 좌측 컬러 보더
    case 4: return <>{ls.map((nc,i) => <CMsgRow key={i} t={58+i*10} l={0} w={100} nc={nc} bLeft={`2.5px solid ${nc}`} bg="#141618f0" />)}</>
    // 5. 무지개 — 그라데이션 테두리
    case 5: return (
      <>
        {ls.map((nc,i) => (
          <div key={i} style={{ position:'absolute', top:58+i*10, left:7, width:92, borderRadius:6, padding:1.5, background:GRADS[i] }}>
            <div style={{ background:'#1a1c23', borderRadius:5, padding:'2px 5px', display:'flex', alignItems:'center', gap:3 }}>
              <div style={{ width:8, height:8, background:'#FF4444', borderRadius:2, flexShrink:0 }} />
              <div style={{ width:18, height:3, background:nc, borderRadius:1.5, flexShrink:0 }} />
              <div style={{ flex:1, height:2.5, background:CL.w, borderRadius:1, opacity:.4 }} />
            </div>
          </div>
        ))}
      </>
    )
    // 6. 라운드 — pill
    case 6: return <>{ls.map((nc,i) => <CMsgRow key={i} t={58+i*10} l={7} w={90} nc={nc} bg="#252830ee" pill />)}</>
    // 7. 풍선 — 말풍선 꼬리
    case 7: return <>{ls.map((nc,i) => <CMsgRow key={i} t={57+i*11} l={9} w={88} nc={nc} bg="#1e2230e8" arrow />)}</>
    // 8. 레트로 — 터미널
    case 8: return (
      <div style={{ position:'absolute', inset:0, background:'#000000cc' }}>
        {ls.map((nc,i) => (
          <div key={i} style={{ position:'absolute', top:54+i*11, left:7, width:92, display:'flex', alignItems:'center', gap:4, borderBottom:'1px solid #00ff4115', padding:'2px 2px' }}>
            <div style={{ width:20, height:3, background:'#00ff41', borderRadius:1, flexShrink:0, opacity:.9 }} />
            <div style={{ flex:1, height:2.5, background:'#c8ffcf', borderRadius:1, opacity:.5 }} />
          </div>
        ))}
      </div>
    )
    // 9. 포스트잇 — 스티커
    case 9: return <>{ls.map((nc,i) => <CMsgRow key={i} t={56+i*11} l={7} w={90} nc={nc} postit bTop={`2px solid ${nc}`} />)}</>
    // 10. 게임 HUD — 우측 각진
    case 10: return (
      <div style={{ position:'absolute', top:0, right:0, bottom:0, width:58, display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:3, padding:'6px 0' }}>
        {ls.map((nc,i) => (
          <div key={i} style={{ background:'linear-gradient(90deg,#0f1923ee,#1a2432ee)', borderTop:'1px solid #4fc3f720', padding:'3px 7px', display:'flex', alignItems:'center', gap:3, clipPath:'polygon(0 0,calc(100% - 5px) 0,100% 5px,100% 100%,0 100%)' }}>
            <div style={{ width:8, height:8, background:'#FF4444', borderRadius:1, flexShrink:0 }} />
            <div style={{ width:14, height:2.5, background:nc, borderRadius:1 }} />
            <div style={{ flex:1, height:2, background:'#cfe8ff', borderRadius:1, opacity:.4 }} />
          </div>
        ))}
      </div>
    )
    default: return null
  }
}

// ── 스트림 프리뷰 카드 ──────────────────────────────────────────────────────────

const PW = 156, PH = 88

function StreamPreviewCard({ overlayKey, theme, selected, onClick }: {
  overlayKey: string; theme: ThemeDef; selected: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div
        style={{ width:PW, height:PH, position:'relative', borderRadius:8, overflow:'hidden', flexShrink:0 }}
        className={`border-2 transition-all ${selected ? 'border-accent-mint shadow-lg shadow-accent-mint/20' : 'border-border group-hover:border-white/20'}`}
      >
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,#0a0c12,#131620)' }} />
        <StreamBg />
        {overlayKey === 'donation' && <DonationMini id={theme.id} />}
        {overlayKey === 'follow'   && <FollowMini   id={theme.id} />}
        {overlayKey === 'chat'     && <ChatMini     id={theme.id} />}
        {selected && (
          <div style={{ position:'absolute', top:5, right:5, background:'#00FFA3', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#17191D" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className={`text-xs font-semibold ${selected ? 'text-accent-mint' : 'text-text-primary'}`}>{theme.name}</p>
        <p className="text-xs text-text-muted">{theme.desc}</p>
      </div>
    </button>
  )
}

// ── 테마 선택 모달 ──────────────────────────────────────────────────────────────

function ThemeModal({ overlay, current, onSelect, onClose }: {
  overlay: OverlayDef; current: number; onSelect: (id: number) => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-6" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-text-primary">{overlay.label} 테마 선택</h2>
            <p className="text-xs text-text-muted mt-0.5">총 {overlay.themes.length}가지 — 클릭하면 선택됩니다</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <div className="flex flex-wrap gap-5">
          {overlay.themes.map((t) => (
            <StreamPreviewCard
              key={t.id}
              overlayKey={overlay.key}
              theme={t}
              selected={current === t.id}
              onClick={() => { onSelect(t.id); onClose() }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────

export default function OverlayPage() {
  const [copied, setCopied]               = useState('')
  const [previewKey, setPreviewKey]       = useState<string | null>(null)
  const [testing, setTesting]             = useState('')
  const [networkIp, setNetworkIp]         = useState<string | null>(null)
  const [port, setPort]                   = useState(3001)
  const [firewallState, setFirewallState] = useState<'idle'|'loading'|'ok'|'fail'>('idle')
  const [selectedThemes, setSelectedThemes] = useState<Record<string, number>>({ donation:1, follow:1, chat:1, roulette:1 })
  const [themeModalFor, setThemeModalFor] = useState<string | null>(null)

  useEffect(() => {
    api.get('/api/network-info').then((res) => {
      const { ips, port: p } = res.data as { ips: string[]; port: number }
      if (ips.length) setNetworkIp(ips[0])
      setPort(p)
    }).catch(() => {})
    window.electronAPI.store.get('overlayThemes').then((saved) => {
      if (saved && typeof saved === 'object')
        setSelectedThemes((prev) => ({ ...prev, ...(saved as Record<string, number>) }))
    }).catch(() => {})
  }, [])

  const BASE = `http://localhost:${port}`
  const NET  = networkIp ? `http://${networkIp}:${port}` : null

  const mkUrl = (path: string, key: string, net = false) => {
    const base = net && NET ? NET : BASE
    const t = selectedThemes[key]
    return `${base}${path}${t > 1 ? `?theme=${t}` : ''}`
  }

  const copy = (url: string, k: string) => {
    navigator.clipboard.writeText(url); setCopied(k); setTimeout(() => setCopied(''), 2000)
  }

  const selectTheme = (key: string, id: number) => {
    const next = { ...selectedThemes, [key]: id }
    setSelectedThemes(next)
    window.electronAPI.store.set('overlayThemes', next).catch(() => {})
  }

  const sendTest = async (type: string) => {
    setTesting(type); try { await api.post(`/api/overlay/test/${type}`) } catch {}
    setTimeout(() => setTesting(''), 1500)
  }

  const handleFirewall = async () => {
    setFirewallState('loading')
    try { const r = await window.electronAPI.addFirewallRule(); setFirewallState(r.ok ? 'ok' : 'fail') }
    catch { setFirewallState('fail') }
  }

  const modalOverlay = OVERLAYS.find((o) => o.key === themeModalFor)

  return (
    <div className="flex flex-col h-screen bg-bg-outer overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <Monitor size={18} className="text-accent-mint" />
        <h1 className="text-base font-bold text-text-primary">오버레이 URL</h1>
        {NET && <div className="ml-auto flex items-center gap-1.5 text-xs text-accent-mint bg-accent-mint/10 border border-accent-mint/20 rounded-lg px-2.5 py-1"><Wifi size={11} /> 네트워크 감지됨</div>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* 방화벽 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Shield size={15} className="text-accent-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Windows 방화벽 허용</p>
              <p className="text-xs text-text-secondary mt-1 mb-3">다른 PC(송출컴)에서 오버레이에 접근하려면 3001 포트를 허용해야 합니다.</p>
              {firewallState === 'ok'
                ? <div className="flex items-center gap-2 text-accent-success text-sm"><CheckCircle size={13} /> 방화벽 규칙이 추가되었습니다.</div>
                : firewallState === 'fail'
                ? <div className="space-y-2">
                    <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle size={12} /> 자동 추가 실패</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-bg-input border border-border rounded-lg px-3 py-1.5 font-mono text-text-secondary overflow-x-auto">netsh advfirewall firewall add rule name=&quot;방송도우미&quot; dir=in action=allow protocol=TCP localport=3001</code>
                      <button onClick={() => copy('netsh advfirewall firewall add rule name="방송도우미" dir=in action=allow protocol=TCP localport=3001','__fw__')} className="px-2.5 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap">{copied==='__fw__'?'복사됨!':'복사'}</button>
                    </div>
                  </div>
                : <button onClick={handleFirewall} disabled={firewallState === 'loading'} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-input border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent-mint/40 transition-colors disabled:opacity-50"><Shield size={12} />{firewallState==='loading'?'추가 중...':'방화벽 자동 허용 (관리자 권한 필요)'}</button>}
            </div>
          </div>
        </div>

        {/* 오버레이 카드 */}
        {OVERLAYS.map((ov) => {
          const tid  = selectedThemes[ov.key] || 1
          const tdef = ov.themes.find((t) => t.id === tid)
          const lu   = mkUrl(ov.path, ov.key)
          const nu   = NET ? mkUrl(ov.path, ov.key, true) : null

          return (
            <div key={ov.key} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Monitor size={14} style={{ color: ov.color }} />
                <span className="text-sm font-semibold text-text-primary flex-1">{ov.label}</span>
                {ov.themes.length > 0 && (
                  <button onClick={() => setThemeModalFor(ov.key)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border hover:border-accent-mint/50 hover:bg-white/3 transition-all group">
                    <div style={{ width:44, height:25, position:'relative', borderRadius:4, overflow:'hidden', background:'linear-gradient(135deg,#0a0c12,#131620)', flexShrink:0, border:'1px solid #ffffff15' }}>
                      <StreamBg />
                      {ov.key === 'donation' && <DonationMini id={tid} />}
                      {ov.key === 'follow'   && <FollowMini   id={tid} />}
                      {ov.key === 'chat'     && <ChatMini     id={tid} />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-text-primary leading-none">{tdef?.name || `테마 ${tid}`}</p>
                      <p className="text-xs text-text-muted mt-0.5 group-hover:text-accent-mint transition-colors">테마 변경 ({ov.themes.length}종)</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="p-4 space-y-2">
                <div>
                  <p className="text-xs text-text-muted mb-1">같은 PC (localhost)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-accent-mint bg-bg-input border border-border rounded-lg px-3 py-1.5 font-mono truncate">{lu}</code>
                    <button onClick={() => copy(lu, ov.key)} className="px-2.5 py-1.5 text-xs border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap">{copied===ov.key?'복사됨!':'복사'}</button>
                  </div>
                </div>
                {nu && (
                  <div>
                    <p className="text-xs text-text-muted mb-1">송출컴 (네트워크)</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-accent-purple bg-bg-input border border-accent-purple/20 rounded-lg px-3 py-1.5 font-mono truncate">{nu}</code>
                      <button onClick={() => copy(nu, ov.key+'_n')} className="px-2.5 py-1.5 text-xs bg-accent-mint text-bg-outer border border-accent-mint rounded-lg hover:brightness-110 transition-colors whitespace-nowrap font-medium">{copied===ov.key+'_n'?'복사됨!':'OBS용 복사'}</button>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-1 flex-wrap">
                  {!NET && <button onClick={() => copy(lu, ov.key+'_m')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-mint text-bg-outer rounded-lg hover:brightness-110 transition-colors font-medium"><Copy size={11} />{copied===ov.key+'_m'?'복사됨!':'URL 복사'}</button>}
                  <button onClick={() => setPreviewKey((p) => p===ov.key?null:ov.key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors ${previewKey===ov.key?'border-accent-mint text-accent-mint':'border-border text-text-secondary hover:border-accent-mint/40 hover:text-text-primary'}`}><Monitor size={11} />{previewKey===ov.key?'닫기':'미리보기'}</button>
                  <button onClick={() => window.electronAPI.openExternal(lu)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border text-text-secondary hover:text-text-primary hover:border-accent-mint/40 rounded-lg transition-colors"><ExternalLink size={11} /> 브라우저</button>
                  <button onClick={() => sendTest(ov.testType)} disabled={testing===ov.testType} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-accent-purple/40 text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors disabled:opacity-50"><Play size={11} />{testing===ov.testType?'전송 중...':'테스트'}</button>
                </div>
                {previewKey === ov.key && (
                  <div className="mt-1 border border-border rounded-xl overflow-hidden bg-[#111] relative">
                    <div className="absolute top-2 right-2 z-10"><span className="text-xs text-text-muted bg-bg-card border border-border px-2 py-0.5 rounded-lg">OBS에서는 투명 배경으로 표시됩니다</span></div>
                    <iframe src={lu} className="w-full" style={{ height:240, border:'none' }} title={`${ov.label} 미리보기`} />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* OBS 안내 */}
        <div className="bg-bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-semibold text-text-primary mb-3">OBS 브라우저 소스 설정</p>
          <ol className="space-y-2">
            {['OBS Studio → 소스 → + → 브라우저 소스 추가', NET?'"OBS용 복사"로 네트워크 URL 붙여넣기':'"URL 복사"로 복사한 URL 붙여넣기', '너비: 1920, 높이: 1080 설정', '확인 후 "새로 고침" — 테마 변경 후에도 필요'].map((s,i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-accent-mint font-semibold shrink-0 text-xs mt-0.5">{i+1}.</span>
                <span className="text-xs text-text-secondary leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 p-3 bg-accent-warning/10 border border-accent-warning/30 rounded-xl">
            <p className="text-xs text-accent-warning flex items-center gap-1.5"><AlertTriangle size={12} /> 테마 변경 후 OBS 브라우저 소스를 새로 고침해야 적용됩니다.</p>
          </div>
        </div>

      </div>

      {themeModalFor && modalOverlay && (
        <ThemeModal overlay={modalOverlay} current={selectedThemes[themeModalFor]||1} onSelect={(id) => selectTheme(themeModalFor, id)} onClose={() => setThemeModalFor(null)} />
      )}
    </div>
  )
}
