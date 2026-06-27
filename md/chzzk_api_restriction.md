# CHZZK API - Restriction (활동 제한)

활동 제한 API로 활동 제한 추가, 삭제, 목록 조회를 할 수 있습니다.

> **참고 (인증 및 Scope):**
> - 활동 제한 API를 호출하려면 사용자 계정으로 인증하여 얻은 **Access Token**이 필요합니다.
> - **API Scope:** 활동제한 쓰기, 활동제한 조회

---

## 1. 활동 제한 추가

사용자를 활동 제한 대상으로 추가할 수 있습니다.
- **관련 Scope:** 활동제한 쓰기

### HTTP Request
- **Method:** `POST`
- **URL:** `/open/v1/restrict-channels`

### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `targetChannelId` | String | 활동 제한 대상 channelId |

### Response
| Code | Description |
| :--- | :--- |
| `200` | 활동 제한 추가 성공 |

---

## 2. 활동 제한 삭제

사용자를 활동 제한 대상에서 삭제할 수 있습니다.
- **관련 Scope:** 활동제한 쓰기

### HTTP Request
- **Method:** `DELETE`
- **URL:** `/open/v1/restrict-channels`

### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `targetChannelId` | String | 활동 제한 삭제 대상 channelId |

### Response
| Code | Description |
| :--- | :--- |
| `200` | 활동 제한 삭제 성공 |

---

## 3. 활동 제한 목록 조회

채널의 활동 제한 목록을 조회할 수 있습니다.
- **관련 Scope:** 활동제한 조회

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/restrict-channels`

### Request Parameters (Query)
*(※ GET 요청이므로 일반적으로 Request Parameter로 처리됩니다.)*
| Field | Type | Description |
| :--- | :--- | :--- |
| `size` | Integer | 조회할 목록의 크기 (기본값: 30, 최대: 30) |
| `next` | String | 다음 페이징 값으로 사용 |

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `restrictedChannelId` | String | 활동 제한 대상 channelId |
| `restrictedChannelName` | String | 활동 제한 대상 채널명 |
| `createdDate` | Date | 활동 제한 일자 |
| `releaseDate` | Date | 활동 제한 해제 일자 |

---

## 4. 임시제한 추가

사용자를 임시제한 대상으로 추가할 수 있습니다.
- **관련 Scope:** 활동제한 쓰기

### HTTP Request
- **Method:** `POST`
- **URL:** `/open/v1/temporary-restrict-channels`

### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `targetChannelId` | String | 임시제한 대상 channelId |
| `chatChannelId` | String | 채팅 channelId |

### Response
| Code | Description |
| :--- | :--- |
| `200` | 임시제한 추가 성공 |
| `400` | 존재하지 않는 사용자 / 임시제한된 사용자 / 등록이 불가능한 계정 |
| `403` | 권한 없음 |

---

## 5. 임시제한 해제

사용자를 활동 제한(임시제한) 대상에서 삭제할 수 있습니다.
- **관련 Scope:** 활동제한 쓰기

### HTTP Request
- **Method:** `DELETE`
- **URL:** `/open/v1/temporary-restrict-channels`

### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `targetChannelId` | String | 임시제한 해제 대상 channelId |
| `chatChannelId` | String | 채팅 channelId |

### Response
| Code | Description |
| :--- | :--- |
| `200` | 임시제한 해제 성공 |
| `400` | 존재하지 않는 사용자 / 해제가 불가능한 계정 |
| `403` | 권한 없음 |
