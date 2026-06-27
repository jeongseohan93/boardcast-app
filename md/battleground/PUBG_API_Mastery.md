# 마스터리 (MASTERY)

## 서버 (Server)
* **기본 URL:** `https://api.pubg.com/shards/{platform}`
* **계산된 URL 예시:** `https://api.pubg.com/shards/steam`

### 서버 변수 (Server Variables)
* `platform`: `console`, `kakao`, `psn`, `stadia`, `steam`, `xbox`

---

## 무기 마스터리 (WEAPON MASTERY)

### `GET /players/{accountId}/weapon_mastery`
단일 플레이어의 무기 마스터리 정보를 가져옵니다.

---

## 생존 마스터리 (SURVIVAL MASTERY)

### `GET /players/{accountId}/survival_mastery`
단일 플레이어의 생존 마스터리 정보를 가져옵니다.

---

## 모델 (Models)

### 무기 마스터리 (Weapon Mastery)
무기 마스터리는 플레이어의 평생(lifetime) 무기 요약 정보를 포함합니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"weaponMasterySummary"`)
* `id` *(string)*: 플레이어 ID (계정 ID)
* `attributes` *(object)*:
  * `platform` *(string)*: 플랫폼
  * `weaponSummaries` *(object)*: 각 무기에 대한 요약 정보
  * `latestMatchId` *(string)*: 가장 최근에 플레이하여 완료된 매치의 ID

### 무기 요약 (Weapon Summary)
각 무기에 대한 요약 정보입니다.
* `$Item_Weapon` *(object)*: 특정 무기의 요약
  * `XPTotal` *(integer)*: 이 무기로 획득한 총 경험치(XP)
  * `LevelCurrent` *(integer)*: 이 무기의 현재 레벨
  * `TierCurrent` *(integer)*: 이 무기의 현재 티어
  * `StatsTotal` *(object)*: 이 무기의 전체 무기 마스터리 스탯
    * `MostDefeatsInAGame` *(integer)*: 단일 매치 최다 패배시킴(defeats) 횟수
    * `Defeats` *(integer)*: 통산 총 패배시킴 횟수
    * `MostDamagePlayerInAGame` *(number)*: 단일 매치에서 플레이어에게 입힌 최대 피해량
    * `DamagePlayer` *(number)*: 통산 플레이어에게 입힌 총 피해량
    * `MostHeadShotsInAGame` *(integer)*: 단일 매치 최다 헤드샷 횟수
    * `HeadShots` *(integer)*: 통산 총 헤드샷 횟수
    * `LongestDefeat` *(number)*: 가장 먼 거리에서의 패배시킴 기록
    * `LongRangeDefeats` *(integer)*: 장거리 패배시킴 횟수
    * `Kills` *(integer)*: 총 킬 수
    * `MostKillsInAGame` *(integer)*: 단일 매치 최다 킬 수
    * `Groggies` *(integer)*: 통산 다른 플레이어를 기절(groggy)시킨 총 횟수
    * `MostGroggiesInAGame` *(integer)*: 단일 매치에서 다른 플레이어를 기절시킨 최다 횟수
  * `OfficialStatsTotal` *(object)*: 공식(Official) 모드에서 플레이한 이 무기의 마스터리 스탯
    * `MostDefeatsInAGame` *(integer)*: 단일 매치 최다 패배시킴 횟수
    * `Defeats` *(integer)*: 통산 총 패배시킴 횟수
    * `DamagePlayer` *(number)*: 통산 플레이어에게 입힌 총 피해량
    * `HeadShots` *(integer)*: 통산 총 헤드샷 횟수
    * `Kills` *(integer)*: 총 킬 수
    * `MostKillsInAGame` *(integer)*: 단일 매치 최다 킬 수
    * `Groggies` *(integer)*: 통산 다른 플레이어를 기절시킨 총 횟수
    * `LongestKill` *(number)*: 가장 먼 거리에서의 킬 기록
  * `CompetitiveStatsTotal` *(object)*: 경쟁전(Competitive)에서 플레이한 이 무기의 마스터리 스탯
    * `MostDefeatsInAGame` *(integer)*: 단일 매치 최다 패배시킴 횟수
    * `Defeats` *(integer)*: 통산 총 패배시킴 횟수
    * `DamagePlayer` *(number)*: 통산 플레이어에게 입힌 총 피해량
    * `HeadShots` *(integer)*: 통산 총 헤드샷 횟수
    * `Kills` *(integer)*: 총 킬 수
    * `MostKillsInAGame` *(integer)*: 단일 매치 최다 킬 수
    * `Groggies` *(integer)*: 통산 다른 플레이어를 기절시킨 총 횟수
    * `LongestKill` *(number)*: 가장 먼 거리에서의 킬 기록
  * `Medals` *(array)*: **[사용 중단됨/deprecated]** 이 무기로 받은 모든 메달
    * `MedalId` *(string)*: **[사용 중단됨/deprecated]** 메달 이름
    * `Count` *(integer)*: **[사용 중단됨/deprecated]** 메달 획득 횟수

### 생존 마스터리 (Survival Mastery)
생존 마스터리는 플레이어의 생존 마스터리 데이터를 포함합니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"survivalMasterySummary"`)
* `id` *(string)*: 플레이어 ID (계정 ID)
* `attributes` *(object)*:
  * `xp` *(integer)*: 생존 마스터리 경험치(XP)
  * `tier` *(integer)*: 생존 마스터리 티어
  * `level` *(integer)*: 생존 마스터리 레벨
  * `totalMatchesPlayed` *(integer)*: 생존 마스터리에 반영된 총 플레이 매치 수
  * `latestMatchId` *(string)*: 가장 최근에 플레이하여 완료된 매치의 ID
  * `stats` *(object)*:
    * `airDropsCalled`: 호출한 보급상자 수 (`total`: 통산 합계, `average`: 평균, `careerBest`: 최고 기록, `lastMatchValue`: 최근 매치 기록)
    * `damageDealt`: 다른 플레이어에게 입힌 총 피해량 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `damageTaken`: 받은 총 피해량 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `distanceBySwimming`: 수영으로 이동한 총 거리 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `distanceByVehicle`: 차량으로 이동한 총 거리 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `distanceOnFoot`: 도보로 이동한 총 거리 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `distanceTotal`: 도보, 수영, 차량으로 이동한 총 거리 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `healed`: 총 회복량 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `hotDropLandings`: 핫드랍(Hot drop) 지역에 낙하한 횟수 (`total`)
    * `enemyCratesLooted`: 파밍한 적 전리품 상자 수 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `position`: 매치 순위 (`average`, `careerBest`, `lastMatchValue`)
    * `revived`: 부활받은 횟수 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `teammatesRevived`: 팀원을 부활시킨 횟수 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `timeSurvived`: 총 생존 시간 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `throwablesThrown`: 투척 무기 사용 횟수 (`total`, `average`, `careerBest`, `lastMatchValue`)
    * `top10`: 탑 10 진입 횟수 (`total`)
* `links` *(object)*:
  * `self` *(string)*: 이 객체에 대한 링크
* `meta` *(object)*: N/A
