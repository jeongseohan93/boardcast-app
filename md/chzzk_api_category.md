# CHZZK API - Category (카테고리)

카테고리 검색 API로 카테고리 목록 및 정보를 조회할 수 있습니다.

> **참고 (카테고리 분류):**
> 방송은 개별 게임 카테고리 또는 종합 게임, 데모 게임, 고전 게임, 스포츠, 축구, 야구, talk, ASMR, 음악/노래, 그림/아트, 운동/건강, 과학/기술, 시사/경제, 먹방/쿡방, 뷰티, 여행/캠페인 카테고리 등으로 분류될 수 있습니다.

---

## 1. 카테고리 검색

카테고리를 검색하여 목록 및 정보를 조회할 수 있습니다.
- 이 API를 호출하려면 애플리케이션 등록 후 **Client 인증**이 필요합니다. (Client 인증 API 참조)

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/categories/search`

### Request Parameters
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `size` | Int | Optional | 조회할 카테고리 개수 (최소 1 ~ 최대 50, 기본값: 20) |
| `query` | String | * | 검색할 카테고리 이름 (해당 값을 포함하는 카테고리 목록 반환) |

### Response Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `data` | Object[] | 카테고리 목록 결과 배열 |
| ↳ `categoryType` | String | 카테고리 종류 (`GAME`, `SPORTS`, `ETC`) |
| ↳ `categoryId` | String | 카테고리 ID (카테고리 식별자) |
| ↳ `categoryValue` | String | 카테고리 이름 |
| ↳ `posterImageUrl`| String | 카테고리 이미지 URL |
