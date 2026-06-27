# CHZZK API - Live (라이브)

라이브 API로 전체 라이브 목록 조회, 방송 스트림키 조회, 방송 설정 조회, 방송 설정을 변경할 수 있습니다.

> **참고 (인증 및 Scope):**
> - **Client 인증 필요:** 라이브 목록 조회
> - **Access Token (사용자 인증) 필요:** 방송 스트림키 조회, 방송 설정 조회, 방송 설정 변경

---

## 1. 라이브 목록 조회

현재 진행 중인 라이브의 전체 목록을 조회할 수 있습니다.
- 이 API를 호출하려면 애플리케이션 등록 후 **Client 인증**이 필요합니다. (Client 인증 API 참조)

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/lives`

### Request Parameters
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `size` | Int | Optional | 조회할 라이브 개수 (최소 1 ~ 최대 20, 기본값: 20) |
| `next` | String | Optional | 다음 목록을 호출하기 위한 커서 값 (이전 API 응답의 `page.next` 값을 통해 호출 가능) |

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | Object[] | 라이브 목록 결과 (시청자 수 높은 순 정렬) |
| ↳ `liveId` | Int | 라이브 식별자 |
| ↳ `liveTitle` | String | 라이브 제목 |
| ↳ `liveThumbnailImageUrl`| String | 라이브 썸네일로 사용되는 이미지 URL |
| ↳ `concurrentUserCount` | Int | 라이브 현재 시청자 수 |
| ↳ `openDate` | String | 라이브 시작 시간 |
| ↳ `adult` | boolean | 연령 제한 설정 여부 |
| ↳ `tags` | String[] | 라이브에 설정된 태그 목록 |
| ↳ `categoryType` | String | 카테고리 종류 (`GAME`, `SPORTS`, `ETC`) |
| ↳ `liveCategory` | String | 라이브 카테고리 식별자 |
| ↳ `liveCategoryValue` | String | 라이브 카테고리 이름 |
| ↳ `channelId` | String | 채널 ID (채널 식별자) |
| ↳ `channelName` | String | 채널명 |
| ↳ `channelImageUrl` | String | 채널 이미지 URL |
| `page` | Object | 페이지네이션 정보 객체 |
| ↳ `next` | String | 다음 목록 호출을 위한 값 |
