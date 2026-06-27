# CHZZK API - Channel (채널)

채널 API로 채널 정보 조회, 채널 관리자 조회, 채널 팔로워 조회, 채널 구독자를 조회할 수 있습니다.

> **참고 (인증 및 Scope):**
> - **Client 인증 필요:** 채널 정보 조회
> - **Access Token (사용자 인증) 필요:** 채널 관리자 조회, 채널 팔로워 조회, 채널 구독자 조회

---

## 1. 채널 정보 조회

채널 정보를 조회할 수 있습니다.
- 이 API를 호출하려면 애플리케이션 등록 후 **Client 인증**이 필요합니다. (Client 인증 API 참조)

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/channels`

### Request Parameters
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `channelIds` | String[] | * | 조회할 채널 ID 목록 (최대 20개까지 요청 가능) |

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | Object[] | 요청한 채널 정보 목록 (일치하는 채널을 찾지 못할 경우 결과 미반환) |
| ↳ `channelId` | String | 채널 식별자 |
| ↳ `channelName` | String | 채널 이름 |
| ↳ `channelImageUrl`| String | 채널 이미지 URL |
| ↳ `followerCount` | Int | 채널의 팔로워 수 |
| ↳ `verifiedMark` | Boolean | 채널 인증 마크 여부 |

---

## 2. 채널 관리자 조회

채널 관리자를 조회할 수 있습니다.
- 사용자 인증(Access Token)이 필요합니다.

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/channels/streaming-roles`

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | Object[] | 요청한 채널 관리자 목록 |
| ↳ `managerChannelId` | String | 관리자 채널 식별자 |
| ↳ `managerChannelName`| String | 관리자 채널 이름 |
| ↳ `userRole` | String | 관리자 역할<br> - `STREAMING_CHANNEL_OWNER`: 채널 소유자<br> - `STREAMING_CHANNEL_MANAGER`: 채널 관리자<br> - `STREAMING_CHAT_MANAGER`: 채팅 운영자<br> - `STREAMING_SETTLEMENT_MANAGER`: 정산 관리자 |
| ↳ `createdDate` | Date | 등록일 |

---

## 3. 채널 팔로워 조회

채널의 팔로워 목록을 조회할 수 있습니다.
- 사용자 인증(Access Token)이 필요합니다.

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/channels/followers`

### Request Parameters
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `page` | Int | Optional | 요청하는 페이지 (0부터 시작, 기본값: 0) |
| `size` | Int | Optional | 조회할 데이터 개수 (최소 1 ~ 최대 50, 기본값: 30) |

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | Object[] | 요청한 채널의 팔로워 목록 |
| ↳ `channelId` | String | 팔로워 채널 식별자 |
| ↳ `channelName` | String | 팔로워 채널 이름 |
| ↳ `createdDate` | Date | 팔로우 일자 |

---

## 4. 채널 구독자 조회

채널의 구독자 목록을 조회할 수 있습니다.
- 사용자 인증(Access Token)이 필요합니다.

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/channels/subscribers`

### Request Parameters
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `page` | Int | Optional | 요청하는 페이지 (0부터 시작, 기본값: 0) |
| `size` | Int | Optional | 조회할 데이터 개수 (최소 1 ~ 최대 50, 기본값: 30) |
| `sort` | String | Optional | 정렬 방식<br> - `RECENT` (최신 구독 순)<br> - `LONGER` (구독 개월 순) |

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | Object[] | 요청한 채널의 구독자 목록 |
| ↳ `channelId` | String | 구독자 채널 식별자 |
| ↳ `channelName` | String | 구독자 채널 이름 |
| ↳ `month` | Int | 구독 개월 수 |
| ↳ `tierNo` | Int | 구독 상품<br> - `1` (티어1 구독)<br> - `2` (티어2 구독) |
| ↳ `createdDate` | Date | 팔로우/구독 일자 |
