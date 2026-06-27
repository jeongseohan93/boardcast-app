# 클랜 (CLANS)

## 서버 (Server)
* **기본 URL:** `https://api.pubg.com/shards/{platform}`
* **계산된 URL 예시:** `https://api.pubg.com/shards/steam`

### 서버 변수 (Server Variables)
* `platform`: `kakao`, `psn`, `stadia`, `steam`, `xbox`

---

## 클랜 (CLANS)

### `GET /clans/{clanId}`
단일 클랜의 정보를 가져옵니다.

---

## 모델 (Models)

### 클랜 객체 (Clan Object)
클랜 객체는 클랜에 대한 정보를 포함합니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"clan"`)
* `id` *(string)*: 클랜 ID
* `attributes` *(object)*:
  * `clanName` *(string)*: 클랜 이름
  * `clanTag` *(string)*: 클랜 태그
  * `clanLevel` *(integer)*: 클랜 레벨
  * `clanMemberCount` *(integer)*: 클랜 멤버 수
* `links` *(object)*:
  * `schema` *(string)*: N/A
  * `self` *(string)*: 이 객체에 대한 링크
