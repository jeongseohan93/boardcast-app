/**
 * [SQLite DB — better-sqlite3]
 *
 * 저장 대상: 도네이션, 구독, 팔로우 이력
 * 채팅 메시지는 저장하지 않는다 (메모리에만 유지, 앱 재시작 시 초기화).
 *
 * DB 파일 위치:
 *   Windows: C:\Users\<유저>\AppData\Roaming\broadcast-assistant\events.db
 *
 * better-sqlite3 특징:
 *   - 동기(synchronous) API → async/await 불필요
 *   - WAL 모드: 읽기와 쓰기 동시 허용, 성능 향상
 */

import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database

export function getDB(): Database.Database {
  return db
}

export function initDB() {
  // userData: OS별 앱 데이터 폴더 (Windows: %APPDATA%\broadcast-assistant)
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'events.db')

  db = new Database(dbPath)

  // WAL(Write-Ahead Log): Express API 읽기 중에도 CHZZK 이벤트 쓰기 가능
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  migrate()
  console.log('[DB] Initialized at', dbPath)
}

/**
 * 마이그레이션: 앱 최초 실행 or 업데이트 시 테이블 생성
 * IF NOT EXISTS → 이미 있으면 건드리지 않음 (기존 데이터 보존)
 */
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id  TEXT    NOT NULL,
      user_id     TEXT    NOT NULL,
      nickname    TEXT    NOT NULL,
      amount      INTEGER NOT NULL,  -- 치즈 금액
      type        TEXT    NOT NULL,  -- TEXT | VIDEO | AUDIO 등
      message     TEXT,              -- 도네이션 메시지 (없을 수 있음)
      created_at  TEXT    NOT NULL   -- ISO 8601 형식
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id  TEXT    NOT NULL,
      user_id     TEXT    NOT NULL,
      nickname    TEXT    NOT NULL,
      month       INTEGER,           -- 구독 개월 수 (없을 수 있음)
      message     TEXT,
      created_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS follows (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id     TEXT    NOT NULL,
      follower_count INTEGER NOT NULL, -- 팔로워 증가 시점의 총 팔로워 수
      created_at     TEXT    NOT NULL
    );

    -- 채널별 + 시간순 조회가 많으므로 복합 인덱스
    CREATE INDEX IF NOT EXISTS idx_donations_channel_created ON donations(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_channel_created ON subscriptions(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_follows_channel_created ON follows(channel_id, created_at);
  `)
}
