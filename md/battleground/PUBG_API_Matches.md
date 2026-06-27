# 매치 (MATCHES)

`/matches` 엔드포인트는 속도 제한(rate-limited)이 적용되지 않으므로 인증(Authorization)이 필요하지 않습니다.

## 서버 (Server)
* **기본 URL:** `https://api.pubg.com/shards/{platform}`
* **계산된 URL 예시:** `https://api.pubg.com/shards/steam`

### 서버 변수 (Server Variables)
* `platform`: `console`, `kakao`, `psn`, `stadia`, `steam`, `tournament`, `xbox`

---

## 매치 (MATCHES)

### `GET /matches/{id}`
단일 매치 정보를 가져옵니다.

---

## 모델 (Models)

### 매치 객체 (Match Object)
매치 객체는 플레이한 게임 모드, 플레이 시간, 참가한 플레이어 등 완료된 매치에 대한 정보를 포함합니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"match"`)
* `id` *(string)*: 매치 ID
* `attributes` *(object)*:
  * `createdAt` *(string, $dateTime)*: 이 매치 객체가 API에 저장된 시간
  * `duration` *(integer)*: 초 단위로 측정된 매치 길이(진행 시간)
  * `matchType` *(string)*: 매치 유형 
    * *Enum:* `airoyale`, `arcade`, `custom`, `event`, `official`, `seasonal`, `training`
  * `gameMode` *(string)*: 플레이한 게임 모드 
    * *Enum:* `duo`, `duo-fpp`, `solo`, `solo-fpp`, `squad`, `squad-fpp`, `conquest-duo` 등 (지원되는 모든 게임 모드 배열 포함)
  * `mapName` *(string)*: 맵 이름 
    * *Enum:* `Baltic_Main`(에란겔 리마스터), `Desert_Main`(미라마), `DihorOtok_Main`(비켄디), `Erangel_Main`(에란겔), `Range_Main`(훈련장), `Savage_Main`(사녹), `Summerland_Main`(카라킨) 등
  * `isCustomMatch` *(boolean)*: 커스텀 매치인 경우 `true`
  * `patchVersion` *(string)*: N/A
  * `seasonState` *(string)*: 시즌 상태 
    * *Enum:* `closed`, `prepare`, `progress`
  * `shardId` *(string)*: 플랫폼 샤드
  * `stats` *(object)*: N/A
  * `tags` *(object)*: N/A
  * `titleId` *(string)*: 스튜디오 및 게임 식별자
* `relationships` *(object)*: `included` 배열에서 찾을 수 있는 리소스 객체에 대한 참조
  * `assets` *(object)*: 에셋 데이터 객체 배열
  * `rosters` *(object)*: 로스터 데이터 객체 배열
  * `rounds` *(object)*: N/A
  * `spectators` *(object)*: N/A
* `links` *(object)*:
  * `schema` *(string)*: N/A
  * `self` *(string)*: 이 객체에 대한 직접 링크

### 로스터 객체 (Roster Object)
로스터는 상호 경쟁하는 각 참가자 그룹의 점수를 추적합니다. 게임 모드에 따라 로스터에는 한 명 또는 여러 명의 참가자가 있을 수 있습니다. 로스터 객체는 매치 컨텍스트 내에서만 의미가 있으며 독립적인 리소스로는 노출되지 않습니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"roster"`)
* `id` *(string)*: 매치 응답의 다른 부분과 연결하기 위해 이 리소스 객체에 할당된 무작위 생성 ID
* `attributes` *(object)*:
  * `shardId` *(string)*: 플랫폼 샤드
  * `stats` *(object)*:
    * `rank` *(integer, 최소: 1, 최대: 130)*: 매치에서 이 로스터(팀/그룹)의 순위
    * `teamId` *(integer)*: 이 로스터에 할당된 임의의 팀 ID
  * `won` *(string)*: 이 로스터가 매치에서 우승했는지 여부를 나타냅니다.
* `relationships` *(object)*:
  * `participants` *(object)*: `included` 배열에서 찾을 수 있는 참가자(participant) 객체에 대한 참조 배열
  * `team` *(object)*: N/A

### 참가자 객체 (Participant Object)
참가자 객체는 매치 컨텍스트 내에서 플레이어를 나타냅니다. 참가자 객체는 매치 컨텍스트 내에서만 의미가 있으며 독립적인 리소스로는 노출되지 않습니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"participant"`)
* `id` *(string)*: 매치 응답의 다른 부분과 연결하기 위해 이 리소스 객체에 할당된 무작위 생성 ID
* `attributes` *(object)*:
  * `actor` *(string)*: N/A
  * `shardId` *(string)*: 플랫폼 샤드
  * `stats` *(object)*: 매치 컨텍스트 내에서의 플레이어 스탯
    * `DBNOs` *(integer)*: 기절시킨(DBNO) 적 플레이어 수
    * `assists` *(integer)*: 팀원이 처치한, 이 플레이어가 피해를 입힌 적 플레이어 수 (어시스트)
    * `boosts` *(integer)*: 사용한 부스트 아이템 수
    * `damageDealt` *(number)*: 입힌 총 피해량 (*참고: 자가 피해는 제외됨*)
    * `deathType` *(string)*: 플레이어가 사망한 방식 (사망하지 않은 경우 `alive`)
    * `headshotKills` *(integer)*: 헤드샷으로 처치한 적 플레이어 수
    * `heals` *(integer)*: 사용한 회복 아이템 수
    * `killPlace` *(integer)*: 킬 수에 기반한 매치 내 플레이어의 등수(순위)
    * `killStreaks` *(integer)*: 총 연속 킬 수
    * `kills` *(integer)*: 처치한 적 플레이어 수
    * `longestKill` *(number)*: 가장 먼 거리에서의 킬 기록
    * `name` *(string)*: 이 참가자와 연결된 플레이어의 PUBG 인게임 닉네임
    * `playerId` *(string)*: 이 참가자와 연결된 플레이어의 계정 ID
    * `revives` *(integer)*: 팀원을 부활시킨 횟수
    * `rideDistance` *(number)*: 차량으로 이동한 총 거리 (미터 단위)
    * `roadKills` *(integer)*: 차량에 탑승한 상태에서의 킬 수 (로드킬)
    * `swimDistance` *(number)*: 수영으로 이동한 총 거리 (미터 단위)
    * `teamKills` *(integer)*: 팀킬 횟수
    * `timeSurvived` *(number)*: 생존한 시간 (초 단위)
    * `vehicleDestroys` *(integer)*: 파괴한 차량 수
    * `walkDistance` *(number)*: 도보로 이동한 총 거리 (미터 단위)
    * `weaponsAcquired` *(integer)*: 획득한 무기 수
    * `winPlace` *(integer)*: 매치에서 이 플레이어의 최종 생존 순위

### 에셋 객체 (Asset Object)
에셋 객체는 매치에 대한 추가적인 상세 정보(이벤트 객체 배열)를 제공하는 `telemetry.json` 파일에 연결되는 URL 문자열을 포함합니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"asset"`)
* `id` *(string)*: 매치 응답의 다른 부분과 연결하기 위해 이 리소스 객체에 할당된 무작위 생성 ID
* `attributes` *(object)*:
  * `URL` *(string)*: `telemetry.json` 파일에 대한 링크
  * `createdAt` *(string, $dateTime)*: 원격 측정(telemetry) 데이터 생성 시간
  * `description` *(string)*: N/A
  * `name` *(string)*: `Telemetry` (에셋의 이름)
