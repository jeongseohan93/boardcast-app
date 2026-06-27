# 시즌 스탯 (SEASON STATS)

## 참고 사항 (Notes)
* 생존 타이틀(Survivor Title) 시스템 이전에 진행된 시즌의 경우 **플랫폼-지역(platform-region)** 샤드를 사용해야 합니다. 그 외의 경우에는 **플랫폼(platform)** 샤드를 사용해야 합니다.
* 시즌 목록은 플랫폼 샤드와 플랫폼-지역 샤드 모두를 사용하여 조회할 수 있습니다.

---

## 서버 (Server)
* **기본 URL:** 
  * `https://api.pubg.com/shards/{platform}`
  * `https://api.pubg.com/shards/{platform-region}`
* **계산된 URL 예시:** `https://api.pubg.com/shards/steam`

### 서버 변수 (Server Variables)
* `platform`: `kakao`, `psn`, `stadia`, `steam`, `xbox`

---

## 시즌 (SEASONS)

### `GET /seasons`
사용 가능한 시즌 목록을 가져옵니다.

---

## 경쟁전 스탯 (RANKED STATS)

### `GET /players/{accountId}/seasons/{seasonId}/ranked`
단일 플레이어의 경쟁전(Ranked) 스탯을 가져옵니다.

---

## 시즌 스탯 (SEASON STATS)

### `GET /players/{accountId}/seasons/{seasonId}`
단일 플레이어의 시즌 정보를 가져옵니다.

### `GET /seasons/{seasonId}/gameMode/{gameMode}/players`
최대 10명의 플레이어에 대한 시즌 정보를 가져옵니다.

---

## 모델 (Models)

### 시즌 객체 (Season Object)
시즌 객체는 각 시즌의 ID를 포함하며, 이를 사용하여 플레이어의 시즌 정보를 조회할 수 있습니다.
* `type` *(string)*: 이 객체 유형의 식별자 (항상 `"season"`)
* `id` *(string)*: 시즌 ID - `/players` 엔드포인트에서 이 시즌에 대한 플레이어의 스탯을 조회하는 데 사용됩니다.
* `attributes` *(object)*:
  * `isCurrentSeason` *(boolean)*: 시즌이 현재 활성 상태인지 나타냅니다.
  * `isOffseason` *(boolean)*: 시즌이 비활성(오프시즌) 상태인지 나타냅니다.

### 게임 모드 스탯 객체 (Game Mode Stats Object)
게임 모드 스탯 객체는 특정 시즌 내 게임 모드에 대한 플레이어의 종합적인 스탯을 포함합니다.
* `assists` *(integer)*: 팀원이 처치한, 이 플레이어가 피해를 입힌 적 플레이어 수 (어시스트)
* `boosts` *(integer)*: 사용한 부스트 아이템 수
* `dBNOs` *(integer)*: 기절시킨(DBNO) 적 플레이어 수
* `dailyKills` *(integer)*: 가장 최근 플레이한 날의 킬 수
* `damageDealt` *(number)*: 입힌 총 피해량 (*참고: 자가 피해는 제외됨*)
* `days` *(integer)*: 플레이 일수
* `dailyWins` *(integer)*: 가장 최근 플레이한 날의 승리 횟수
* `headshotKills` *(integer)*: 헤드샷으로 처치한 적 플레이어 수
* `heals` *(integer)*: 사용한 회복 아이템 수
* `killPoints` *(number)*: **[사용 중단됨/deprecated]** N/A
* `kills` *(integer)*: 처치한 적 플레이어 수
* `longestKill` *(number)*: 가장 먼 거리에서의 킬 (거리)
* `longestTimeSurvived` *(number)*: 매치에서 가장 오래 생존한 시간
* `losses` *(integer)*: 패배한 매치 수
* `maxKillStreaks` *(integer)*: 최대 연속 킬 수
* `mostSurvivalTime` *(number)*: 매치에서 가장 오래 생존한 시간
* `rankPoints` *(number)*: **[사용 중단됨/deprecated]** 플레이어가 획득한 랭크 포인트 (roundsPlayed < 10인 경우 값은 0)
* `rankPointsTitle` *(string)*: **[사용 중단됨/deprecated]** `title-level` 형태의 랭크 타이틀
* `revives` *(integer)*: 팀원을 부활시킨 횟수
* `rideDistance` *(number)*: 차량으로 이동한 총 거리 (미터 단위)
* `roadKills` *(integer)*: 차량에 탑승한 상태에서의 킬 수
* `roundMostKills` *(integer)*: 단일 매치에서 기록한 최고 킬 수
* `roundsPlayed` *(integer)*: 플레이한 매치 수
* `suicides` *(integer)*: 자살 횟수
* `swimDistance` *(number)*: 수영으로 이동한 총 거리 (미터 단위)
* `teamKills` *(integer)*: 팀킬 횟수
* `timeSurvived` *(number)*: 총 생존 시간
* `top10s` *(integer)*: 매치에서 탑 10에 진입한 횟수
* `vehicleDestroys` *(integer)*: 파괴한 차량 수
* `walkDistance` *(number)*: 도보로 이동한 총 거리 (미터 단위)
* `weaponsAcquired` *(integer)*: 획득한 무기 수
* `weeklyKills` *(integer)*: 가장 최근 플레이한 주(week)의 킬 수
* `weeklyWins` *(integer)*: 가장 최근 플레이한 주(week)의 승리 횟수
* `winPoints` *(number)*: **[사용 중단됨/deprecated]** N/A
* `wins` *(integer)*: 승리한 매치 수

### 경쟁전 게임 모드 스탯 객체 (Ranked Game Mode Stats Object)
경쟁전 게임 모드 스탯 객체는 특정 시즌 내 게임 모드에 대한 플레이어의 종합적인 경쟁전 스탯을 포함합니다.
* `currentRankPoint` *(integer)*: 플레이어의 현재 랭크 포인트 (RP)
* `bestRankPoint` *(integer)*: 플레이어의 최고 랭크 포인트 (RP)
* `currentTier` *(object)*: 현재 티어 정보
* `bestTier` *(object)*: 최고 티어 정보
* `roundsPlayed` *(integer)*: 플레이한 매치 수
* `avgRank` *(number)*: 평균 순위
* `avgSurvivalTime` *(number)*: **[사용 중단됨/deprecated]** 매치 평균 생존 시간
* `top10Ratio` *(number)*: 매치에서 탑 10에 진입한 횟수 / 진입하지 못한 횟수의 비율
* `winRatio` *(number)*: 매치에서 승리한 횟수 / 승리하지 못한 횟수의 비율
* `assists` *(integer)*: 팀원이 처치한, 이 플레이어가 피해를 입힌 적 플레이어 수 (어시스트)
* `wins` *(integer)*: 승리한 매치 수
* `kda` *(number)*: 킬/데스/어시스트(KDA) 비율
* `kdr` *(number)*: **[사용 중단됨/deprecated]** 킬/데스 비율 (KDR)
* `kills` *(integer)*: 처치한 적 플레이어 수
* `deaths` *(integer)*: 플레이어 데스 수
* `roundMostKills` *(integer)*: **[사용 중단됨/deprecated]** 단일 매치에서 기록한 최고 킬 수
* `longestKill` *(number)*: **[사용 중단됨/deprecated]** 가장 먼 거리에서의 킬
* `headshotKills` *(integer)*: **[사용 중단됨/deprecated]** 헤드샷으로 처치한 적 플레이어 수
* `headshotKillRatio` *(number)*: **[사용 중단됨/deprecated]** 헤드샷으로 처치한 적 플레이어 수의 비율
* `damageDealt` *(number)*: 입힌 총 피해량 (*참고: 자가 피해는 제외됨*)
* `dBNOs` *(integer)*: 기절시킨(DBNO) 적 플레이어 수
* `reviveRatio` *(number)*: **[사용 중단됨/deprecated]** 팀원을 부활시킨 비율
* `revives` *(integer)*: **[사용 중단됨/deprecated]** 팀원을 부활시킨 횟수
* `heals` *(integer)*: **[사용 중단됨/deprecated]** 사용한 회복 아이템 수
* `boosts` *(integer)*: **[사용 중단됨/deprecated]** 사용한 부스트 아이템 수
* `weaponsAcquired` *(integer)*: **[사용 중단됨/deprecated]** 획득한 무기 수
* `teamKills` *(integer)*: **[사용 중단됨/deprecated]** 팀킬 횟수
* `playTime` *(number)*: **[사용 중단됨/deprecated]** 플레이 시간
* `killStreak` *(integer)*: **[사용 중단됨/deprecated]** 최고 연속 킬 수

### 매치 목록 (Match List)
매치 ID의 목록을 포함합니다.
* `data` *(array)*: 매치 객체 배열
