# CHZZK API - Chat (채팅)

채팅 API로 채팅 전송, 채팅 공지 등록, 채팅 설정 조회, 채팅 설정 변경 및 채팅 메시지 숨기기를 할 수 있습니다.

> **참고 (인증 및 Scope):**
> - 채팅 API를 호출하려면 사용자 계정으로 인증하여 얻은 **Access Token**이 필요합니다.
> - **API Scope:** 채팅 메시지 조회, 채팅 메시지 쓰기, 채팅 공지 쓰기, 채팅 설정 조회, 채팅 설정 변경

---

## 1. 채팅 메시지 전송

채팅 메시지를 전송할 수 있습니다.
- **관련 Scope:** 채팅 메시지 쓰기

### HTTP Request
- **Method:** `POST`
- **URL:** `/open/v1/chats/send`

### Request Header
| Key | Value |
| :--- | :--- |
| `Content-Type` | `application/json` |

### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `message` | String | 전송할 메시지 내용 (최대 100자로 제한) |

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `messageId` | String | 전송된 메시지 ID |

---

## 2. 채팅 공지 등록

채팅 공지사항을 등록할 수 있습니다.
신규 메시지 또는 전송된 기존 메시지로 공지사항 등록이 가능합니다.
- **관련 Scope:** 채팅 공지 쓰기

### HTTP Request
- **Method:** `POST`
- **URL:** `/open/v1/chats/notice`

### Request Header
| Key | Value |
| :--- | :--- |
| `Content-Type` | `application/json` |

### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `message` | String | Optional | 신규 메시지로 공지사항 등록 시 전송할 메시지 내용 (최대 100자로 제한) |
| `messageId` | String | Optional | 기존 메시지로 공지사항 등록 시 사용하는 전송된 메시지 ID |

### Response
| Code | Description |
| :--- | :--- |
| `200` | 공지사항 등록 성공 |

---

## 3. 채팅 설정 조회

채널의 채팅 설정을 조회할 수 있습니다.
- **관련 Scope:** 채팅 설정 조회

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/chats/settings`

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `chatAvailableCondition` | String | 본인인증 여부 설정 조건<br> - `NONE` (제한 없음)<br> - `REAL_NAME` (네이버 본인인증한 시청자만 허용) |
| `chatAvailableGroup` | String | 채팅 참여 범위 설정 조건<br> - `ALL` (모든 시청자)<br> - `FOLLOWER` (팔로워 전용)<br> - `MANAGER` (운영자 전용)<br> - `SUBSCRIBER` (구독자 전용) |
| `minFollowerMinute` | Int | `FOLLOWER` 모드 설정된 경우 적용된 최소 팔로잉 기간 조건 |
| `allowSubscriberInFollowerMode` | boolean | `FOLLOWER` 모드 설정된 경우 구독자는 최소 팔로잉 기간 조건 대상에서 제외 허용할지 여부 |
| `chatSlowModeSec` | Integer | 시청자의 채팅 전송 간격 (초) |
| `chatEmojiMode` | Boolean | 이모티콘 모드 사용 여부 |

---

## 4. 채팅 설정 변경

채널의 채팅 설정을 변경할 수 있습니다.
- **관련 Scope:** 채팅 설정 변경

### HTTP Request
- **Method:** `PUT`
- **URL:** `/open/v1/chats/settings`

### Request Header
| Key | Value |
| :--- | :--- |
| `Content-Type` | `application/json` |

### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `chatAvailableCondition` | String | 본인인증 여부 설정 조건 (`NONE`, `REAL_NAME`) |
| `chatAvailableGroup` | String | 채팅 참여 범위 설정 조건 (`ALL`, `FOLLOWER`, `MANAGER`, `SUBSCRIBER`) |
| `minFollowerMinute` | Int | `FOLLOWER` 모드 시 적용할 최소 팔로잉 기간 조건<br> (허용 값: `0`, `5`, `10`, `30`, `60`, `1440`, `10080`, `43200`, `86400`, `129600`, `172800`, `216000`, `259200`) |
| `allowSubscriberInFollowerMode` | boolean | `FOLLOWER` 모드 시 구독자는 팔로잉 기간 조건 대상에서 제외 허용할지 여부 |
| `chatSlowModeSec` | int | 시청자의 채팅 전송 간격(초)<br> (허용 값: `0` (저속모드 Off), `3`, `5`, `10`, `30`, `60`, `120`, `300`) |
| `chatEmojiMode` | boolean | 이모티콘 모드 사용 여부 |

---

## 5. 채팅 메시지 숨기기

채팅 메시지를 숨길 수 있습니다.
- **관련 Scope:** 채팅 메시지 쓰기

### HTTP Request
- **Method:** `POST`
- **URL:** `/open/v1/chats/blind-message`

### Request Header
| Key | Value |
| :--- | :--- |
| `Content-Type` | `application/json` |

### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `chatChannelId` | String | 채팅 channelId |
| `messageTime` | long | 채팅 메시지 전송 시각 (timestamp) |
| `senderChannelId` | String | 채팅 메시지 작성자 channelId |

### Response
| Code | Description |
| :--- | :--- |
| `200` | 메시지 숨기기 성공 |
| `400` | 스트리머가 아닙니다. |
| `403` | 권한 없음 |
| `404` | 해당 메시지를 찾을 수 없습니다. |
