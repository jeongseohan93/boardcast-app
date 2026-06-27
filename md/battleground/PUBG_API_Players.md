# 플레이어 (PLAYERS)

## 서버 (Server)
* **기본 URL:** `https://api.pubg.com/shards/{platform}`
* **계산된 URL 예시:** `https://api.pubg.com/shards/steam`

### 서버 변수 (Server Variables)
* `platform`: `kakao`, `psn`, `stadia`, `steam`, `xbox`

---

## 엔드포인트 (Endpoints)

### `GET /players`
최대 10명의 플레이어 정보 컬렉션을 가져옵니다.

### `GET /players/{accountId}`
단일 플레이어의 정보를 가져옵니다.

---

## 모델 (Models)

### 플레이어 객체 (Player Object)
플레이어 객체는 플레이어에 대한 정보와 최근 매치 목록(최대 14일 이전 데이터)을 포함합니다. 
*참고: 플레이어 객체는 플랫폼 샤드(platform shards)에 따라 다릅니다.*

* `type` *(string)*: 이 객체 유형의 식별자 (항상 `"player"`)
* `id` *(string)*: 플레이어 ID
* `attributes` *(object)*:
  * `name` *(string)*: PUBG 인게임 닉네임 (IGN)
  * `shardId` *(string)*: 플랫폼 샤드
  * `stats` *(object)*: 스탯 정보
  * `createdAt` *(string, $dateTime)*: **[사용 중단됨/deprecated]** N/A
  * `updatedAt` *(string, $dateTime)*: **[사용 중단됨/deprecated]** N/A
  * `patchVersion` *(string)*: 게임 버전
  * `banType` *(string)*: 이용 제한(제재) 유형 (`Innocent` - 정상, `TemporaryBan` - 임시 정지, `PermanentBan` - 영구 정지)
  * `titleId` *(string)*: 스튜디오 및 게임 식별자
* `relationships` *(object)*: 이 플레이어와 관련된 리소스 객체에 대한 참조
  * `assets` *(object)*: 에셋 정보
  * `matches` *(object)*: 매치 정보
* `links` *(object)*:
  * `schema` *(string)*: N/A
  * `self` *(string)*: 이 객체에 대한 직접 링크

### 매치 목록 (Match List)
매치 ID의 목록을 포함합니다.
* `data` *(array)*: 매치 데이터 객체 배열
