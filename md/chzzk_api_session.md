# CHZZK API - Session (세션)

세션 생성, 세션 목록 조회, 이벤트 구독 및 취소를 할 수 있습니다.

> **참고:** 세션 API 중 아래 API Scope를 호출하려면 사용자 계정으로 인증하여 얻은 Access Token이 필요합니다.
> - **API Scope:** 채팅 메시지 조회, 후원 조회, 구독 조회

---

## 1. 세션 생성 (클라이언트)

Client 인증을 통해 소켓 연결을 위한 URL을 요청합니다. 생성된 URL은 일정 시간 동안만 유효합니다.
- 최대 10개의 연결을 유지할 수 있습니다.
- 애플리케이션 등록 후 Client 인증이 필요합니다. (Client 인증 API 참조)

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/sessions/auth/client`

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `url` | String | 소켓 연결을 위한 URL |

---

## 2. 세션 생성 (유저)

Access Token 인증을 통해 소켓 연결을 위한 URL을 요청합니다. 생성된 URL은 일정 시간 동안만 유효합니다.
- 연결된 세션은 세션 생성에 사용된 Access Token과 **동일한 유저 이벤트만 구독**할 수 있습니다.
- 유저별 최대 3개의 연결을 유지할 수 있습니다.

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/sessions/auth`

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `url` | String | 소켓 연결을 위한 URL |

---

## 3. 세션 연결 가이드

- **지원 버전:** Socket.IO-client 1.0.0+ ~ 2.0.3 버전까지 지원합니다.

### 소켓 연결 예제 (JavaScript)
```javascript
// api를 통해 얻은 연결 url
const sessionURL = 'https://ssio08.nchat.naver.com:443?auth=TOKEN'; 

// 옵션 설정
const socketOption = {
    reconnection: false,
    'force new connection': true,
    'connect timeout': 3000,
    transports: ['websocket'],
};

// 세션 연결
const socket = io.connect(sessionURL, socketOption);

socket.on('connect', function() {
    // on connected
});
```
연결이 완료될 경우 세션으로 연결 완료 메시지가 전달됩니다. 해당 메시지의 `sessionKey` 값을 통해 연결된 세션에 이벤트를 구독할 수 있습니다.

### 메시지 수신 예제
```javascript
// eventType 메시지
socket.on("SYSTEM", function(data) {
    /* on system event */
});
```

---

## 4. 세션 목록 조회 (클라이언트)

Client 인증 기반의 생성된 세션을 조회합니다. 연결이 끊어진 세션은 90일 동안만 조회가 가능합니다.

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/sessions/client`

### Request Parameters
| Field | Type | Description |
| :--- | :--- | :--- |
| `size` | Int | 조회할 세션 개수 (최소 1 ~ 최대 50, 기본값: 20) |
| `page` | String | 조회할 페이지 (0부터 시작, 기본값: 0) |

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | Object[] | 세션 목록 결과 배열 |
| ↳ `sessionKey` | String | 세션 식별자 |
| ↳ `connectedDate` | String | 연결 시간 |
| ↳ `disconnectedDate` | String | 연결 해제 시간 |
| ↳ `subscribedEvents` | Object[] | 구독 이벤트 목록 |
| &nbsp;&nbsp;&nbsp;↳ `eventType` | String | 이벤트 종류 (`CHAT`, `DONATION`, `SUBSCRIPTION`) |
| &nbsp;&nbsp;&nbsp;↳ `channelId` | String | 이벤트 채널 ID(채널 식별자) |

---

## 5. 세션 목록 조회 (유저)

Access Token 인증 기반의 생성된 세션을 조회합니다. 연결이 끊어진 세션은 90일 동안만 조회가 가능합니다.

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/sessions`

### Request Parameters
*(클라이언트 세션 목록 조회와 동일)*

### Response Body
*(클라이언트 세션 목록 조회의 Response Body와 동일)*

---

## 6. 이벤트 구독 및 취소 API

> **참고:** 세션당 **최대 30개의 이벤트**(채팅, 후원, 구독 포함)를 구독할 수 있습니다.

### 6.1. 이벤트 구독/취소 (채팅)
- **관련 Scope:** 채팅 메시지 조회
- 구독 시, 해당 채널에 채팅 발생 시 이벤트 메시지 전달.

| 동작 | Method | URL | Request Param (Required) |
| :--- | :--- | :--- | :--- |
| **구독** | `POST` | `/open/v1/sessions/events/subscribe/chat` | `sessionKey` (String) * |
| **취소** | `POST` | `/open/v1/sessions/events/unsubscribe/chat` | `sessionKey` (String) * |

### 6.2. 이벤트 구독/취소 (후원)
- **관련 Scope:** 후원 조회
- 구독 시, 해당 채널에 후원 발생 시 이벤트 메시지 전달.

| 동작 | Method | URL | Request Param (Required) |
| :--- | :--- | :--- | :--- |
| **구독** | `POST` | `/open/v1/sessions/events/subscribe/donation` | `sessionKey` (String) * |
| **취소** | `POST` | `/open/v1/sessions/events/unsubscribe/donation` | `sessionKey` (String) * |

### 6.3. 이벤트 구독/취소 (구독)
- **관련 Scope:** 구독 조회
- 구독 시, 해당 채널에 구독 발생 시 이벤트 메시지 전달.

| 동작 | Method | URL | Request Param (Required) |
| :--- | :--- | :--- | :--- |
| **구독** | `POST` | `/open/v1/sessions/events/subscribe/subscription` | `sessionKey` (String) * |
| **취소** | `POST` | `/open/v1/sessions/events/unsubscribe/subscription` | `sessionKey` (String) * |

---

## 7. 세션 메시지

세션으로 전달되는 메시지에는 **시스템 메시지**와 **구독 이벤트 메시지**가 존재합니다.

### 7.1. 시스템 메시지 (Event Type: `SYSTEM`)

| 메시지 종류 (`type`) | 설명 | `data` 객체 구성 |
| :--- | :--- | :--- |
| `connected` | 소켓 연결이 정상적으로 완료되었을 때 | `sessionKey`: 세션 식별자 |
| `subscribed` | 이벤트 구독이 완료되었을 때 | `eventType` (CHAT/DONATION/SUBSCRIPTION), `channelId` |
| `unsubscribed`| 이벤트 구독이 취소되었을 때 | `eventType`, `channelId` |
| `revoked` | 동의 철회, 스코프 변경 등 권한 회수로 취소 시 | `eventType`, `channelId` |

---

### 7.2. 구독 이벤트 메시지

#### 채팅 이벤트 메시지 (Event Type: `CHAT`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `channelId` | String | 이벤트 채널 ID(채널 식별자) |
| `senderChannelId` | String | 채팅 메시지 작성자 채널 ID |
| `chatChannelId` | String | 채팅 메시지가 속한 채팅 채널 ID |
| `profile` | Object | 채팅 메시지 작성자 프로필 정보 |
| ↳ `nickname` | String | 닉네임 |
| ↳ `badges` | Object[] | 배지 |
| ↳ `verifiedMark` | boolean | 인증 여부 |
| `userRoleCode` | String | 유저 채널 권한 (`streamer`, `common_user`, `streaming_channel_manager`, `streaming_chat_manager`) |
| `content` | String | 채팅 메시지 내용 |
| `emojis` | Map | 사용된 치지직 이모티콘 정보 (`key`: 식별자, `value`: URL) |
| `messageTime` | Int64 | 메시지 시간 (ms) |

#### 후원 이벤트 메시지 (Event Type: `DONATION`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `donationType` | String | 후원 종류 (`CHAT`, `VIDEO`) |
| `channelId` | String | 이벤트 채널 ID(채널 식별자) |
| `donatorChannelId`| String | 후원자 채널 ID |
| `donatorNickname`| String | 후원자 닉네임 |
| `payAmount` | String | 후원 금액 (원) |
| `donationText` | String | 후원 메시지 내용 |
| `emojis` | Map | 사용된 치지직 이모티콘 정보 (`key`: 식별자, `value`: URL) |

#### 구독 이벤트 메시지 (Event Type: `SUBSCRIPTION`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `channelId` | String | 이벤트 채널 ID(채널 식별자) |
| `subscriberChannelId`| String | 구독자 채널 ID |
| `subscriberNickname` | String | 구독자 닉네임 |
| `tierNo` | Int | 구독 상품 (`1`: 티어1, `2`: 티어2) |
| `tierName` | String | 구독 브랜드명 |
| `month` | Int | 구독 개월 수 |
