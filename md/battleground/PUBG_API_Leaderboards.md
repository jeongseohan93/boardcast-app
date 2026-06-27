# 순위표 (LEADERBOARDS)

**참고:** 순위표는 2시간마다 업데이트됩니다.

## 서버 (Server)
* **기본 URL:** 
  * `https://api.pubg.com/shards/{platform-region}`
  * `https://api.pubg.com/shards/{platform}`
* **계산된 URL 예시:** `https://api.pubg.com/shards/pc-na`

### 서버 변수 (Server Variables)
* `platform-region`: `pc-as`, `pc-eu`, `pc-jp`, `pc-krjp`, `pc-kakao`, `pc-na`, `pc-oc`, `pc-ru`, `pc-sa`, `pc-sea`, `psn-as`, `psn-eu`, `psn-na`, `psn-oc`, `xbox-as`, `xbox-eu`, `xbox-na`, `xbox-oc`, `xbox-sa`

---

## 순위표 (LEADERBOARDS)

### `GET /leaderboards/{seasonId}/{gameMode}`
특정 게임 모드에 대한 순위표를 가져옵니다.

---

## 모델 (Models)

### 순위표 객체 (Leaderboard Object)
순위표 객체는 특정 게임 모드에서 상위 500명 플레이어의 현재 순위를 보여줍니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"leaderboard"`)
* `id` *(string)*: 순위표 응답의 다른 부분과 연결하기 위해 이 리소스 객체에 할당된 무작위 생성 ID
* `attributes` *(object)*:
  * `shardId` *(string)*: 샤드 ID
  * `gameMode` *(string)*: 게임 모드
  * `seasonId` *(string)*: 시즌 ID
* `relationships` *(object)*:
  * `players` *(object)*:
    * `data` *(array)*:
      * `type` *(string)*: 이 객체 유형의 식별자 (`"player"`)
      * `id` *(string)*: 플레이어의 계정 ID (`accountId`)
* `included` *(array)*:
  * `type` *(string)*: 이 객체 유형의 식별자 (`"player"`)
  * `id` *(string)*: 플레이어의 계정 ID (`accountId`)
  * `attributes` *(object)*:
    * `name` *(string)*: 플레이어의 PUBG 인게임 닉네임 (IGN)
    * `rank` *(integer)*: 플레이어의 현재 순위
    * `stats` *(object)*: 시즌 컨텍스트 내에서의 플레이어 스탯
      * `rankPoints` *(number)*: 플레이어가 획득한 랭크 포인트 (RP)
      * `wins` *(integer)*: 승리한 매치 수
      * `games` *(integer)*: 플레이한 게임 수
      * `winRatio` *(number)*: **[사용 중단됨/deprecated]** 승률
      * `averageDamage` *(integer)*: 매치당 평균 피해량
      * `kills` *(integer)*: 처치한 적 플레이어 수
      * `killDeathRatio` *(number)*: **[사용 중단됨/deprecated]** 킬/데스 비율 (KDR)
      * `kda` *(number)*: 킬/데스/어시스트 (KDA) 비율
      * `averageRank` *(number)*: 평균 순위
      * `tier` *(string)*: 플레이어의 티어
      * `subTier` *(string)*: 플레이어의 서브 티어
* `links` *(object)*:
  * `self` *(string)*: 이 객체에 대한 링크
* `meta` *(object)*: N/A
