# 시작하기 (Getting Started)
이 가이드는 PUBG API의 기본 사항을 안내합니다.

## URL
PUBG API에 요청을 보낼 때, URL은 어떤 데이터를 다시 받을지와 그 데이터가 어떻게 표시될지를 제어합니다. 다음 예제 URL을 살펴보고 흥미로운 부분들을 분석해 보겠습니다.

```
"https://api.pubg.com/shards/$platform/players?filter[playerNames]=$playerName"
```

### shards/$platform - 플랫폼 샤드
PUBG API는 플랫폼별로 데이터를 분류(shard)하므로, 대부분의 요청에서 URL에 샤드를 지정해야 합니다. 대부분의 경우 샤드에는 플랫폼만 필요합니다. 하지만 `division.bro.official.2018-09` 이전 시즌의 PC 및 PSN 플레이어 시즌 스탯과, `division.bro.official.2018-08` 이전 시즌의 Xbox 시즌 스탯을 요청할 때는 '플랫폼-지역(platform-region)' 샤드가 필요합니다. 샤드에 대한 자세한 내용은 Platforms and Regions를 참조하세요.

### players - 쿼리할 엔드포인트
각 엔드포인트는 PUBG 게임 데이터와 관련된 다양한 정보를 제공합니다. 사용 가능한 각 필터에 대한 자세한 내용은 각 엔드포인트 문서 페이지에서 확인할 수 있습니다.

### filter[playerNames]=$playerName - 검색할 플레이어를 지정하는 필터
검색 범위를 좁히고 결과를 정리하는 등 다양한 필터와 옵션이 있습니다! 사용 가능한 각 필터에 대한 추가 정보는 URL Parameters 및 각 엔드포인트의 문서 페이지에서 확인할 수 있습니다.

이 URL은 요청한 플레이어의 최근 매치 ID 목록을 포함하여 플레이어 정보를 담은 플레이어 객체를 반환합니다. 튜토리얼 뒷부분에서 이에 대해 더 자세히 다루겠습니다.

## 인증 (Authorization)
API가 요청을 수락하려면 `Authorization` 헤더를 통해 API 키를 전송해야 합니다. API 키에 대한 자세한 정보는 API Keys에서 찾을 수 있습니다.

인증 문자열은 다음과 같은 형태이며, `$api-key` 부분에 본인의 개인 API 키를 입력합니다.
```
"Authorization: Bearer $api-key"
```

## 콘텐츠 협상 (Content Negotiation)
이제 헤더에 API가 반환하는 형식의 콘텐츠를 허용한다고 명시해야 합니다. API를 사용하는 클라이언트는 `application/vnd.api+json` 형식을 사용하여 응답을 수락한다고 지정해야 합니다. 편의를 위해 널리 사용되는 많은 클라이언트 라이브러리의 기본값인 `application/json`도 허용합니다.

콘텐츠 유형 문자열은 다음과 같은 형태입니다.
```
"Accept: application/vnd.api+json"
```

## 요청 작성하기 (Putting the Request Together)
이제 첫 번째 요청을 만들기 위해 필요한 모든 요소를 갖추었습니다! `$platform`과 `$playerName`을 본인의 정보로 바꾸기만 하면 됩니다. CURL을 예로 들면 다음과 같습니다.

```bash
curl -g "https://api.pubg.com/shards/$platform/players?filter[playerNames]=$playerName" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

플레이어 응답이 어떻게 보이는지 확인하려면 Players 페이지를 참조하세요.

## 플레이어 계정 ID 찾기 (Finding the Player Account ID)
플레이어의 계정 ID는 '요청 작성하기'의 응답에서 확인할 수 있습니다. 응답에서 플레이어는 다음과 같이 나열됩니다.

```json
{
  "type": "player",
  "id": "$playerId"
}
```

## 경쟁전, 시즌 및 평생 스탯 (Ranked, Season, and Lifetime Stats)
매치 응답 내 참가자(participant) 객체에 포함된 스탯은 해당 매치 내에서의 플레이어 스탯을 보여주지만, 전체 시즌이나 전적(평생) 스탯을 얻는 것도 가능합니다. 경쟁전, 시즌 또는 평생 스탯을 얻으려면 `playerId`와 `seasonId`가 필요합니다.

평생 시즌 ID(Lifetime Season ID)를 사용하여 플레이어의 "평생(lifetime)" 스탯을 얻을 수 있습니다. 이는 게임 내에서 시즌 스탯을 볼 때 "전적(Overall)"을 선택하여 볼 수 있는 스탯과 동일합니다. 생존 타이틀(Survival Title) 시스템이 시작된 시점부터의 데이터가 포함됩니다. 평생 스탯의 첫 시즌은 PC의 경우 `division.bro.official.pc-2018-01`, PSN의 경우 `division.bro.official.playstation-01`, Xbox의 경우 `division.bro.official.xbox-01`, Stadia의 경우 `division.bro.official.console-07`입니다.

Stadia 플레이어는 키보드와 마우스를 사용할 때와 게임패드를 사용할 때 각각 별도의 시즌 및 평생 스탯을 가집니다. 게임패드 스탯은 `console` 샤드를 사용하거나 `stadia` 샤드와 함께 게임패드 필터(Gamepad Filter)를 사용하여 조회할 수 있습니다.

먼저 seasons 엔드포인트를 쿼리하여 시즌 목록을 가져오는 것부터 시작합니다.

### 시즌 ID 가져오기 (Getting Season IDs)
seasons 엔드포인트를 쿼리하여 다음과 같이 시즌 목록을 가져옵니다. `$platform`을 본인의 정보로 바꾸세요.

```bash
curl -g "https://api.pubg.com/shards/$platform/seasons" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```
*참고: 시즌 목록은 새 시즌이 추가될 때 약 두 달에 한 번씩만 변경됩니다. 애플리케이션은 시즌 목록을 한 달에 한 번 이상 쿼리해서는 안 됩니다.*

응답에서 시즌은 다음과 같이 나열됩니다.

```json
{
  "type": "season",
  "id": "$seasonId",
  "attributes": {
    "isCurrentSeason": true,
    "isOffseason": false
  }
}
```

### 플레이어 시즌 스탯 가져오기 (Getting Player Season Stats)
이제 `$seasonId`를 알았으니 다음과 같이 API를 쿼리하여 시즌 스탯을 얻을 수 있습니다. `$platform`, `$playerId`, `$seasonId`를 본인의 정보로 바꾸세요.

```bash
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/seasons/$seasonId" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```
생존 타이틀(Survival Title) 시스템이 도입되기 이전 시즌의 스탯을 요청할 때는 '플랫폼-지역(platform-region)' 샤드를 사용해야 합니다.

14일 이내에 플레이한 매치의 ID도 제공됩니다. 응답에는 플레이어당 최대 32개의 매치 ID가 포함됩니다. 커스텀 매치 및 14일이 지난 매치는 제공되지 않습니다.

### 플레이어 경쟁전 스탯 가져오기 (Getting Player Ranked Stats)
경쟁전 스탯은 시즌 7부터 제공됩니다. 시즌 스탯 요청 URL에 `/ranked`를 추가하여 경쟁전 스탯을 쿼리할 수 있습니다.

```bash
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/seasons/$seasonId/ranked" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```
이 엔드포인트에서는 매치 ID 목록이 제공되지 않습니다.

### 플레이어 평생 스탯 가져오기 (Getting Player Lifetime Stats)
평생 스탯은 게임 내 시즌 스탯에서 "전적(Overall)"을 선택했을 때 볼 수 있는 스탯입니다. 플레이어의 평생 스탯은 `seasons` 엔드포인트를 쿼리하고 `$seasonId`로 `"lifetime"`을 사용하여 얻을 수 있습니다.

```bash
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/seasons/lifetime" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```
각 플랫폼별 평생 스탯에 포함된 첫 번째 시즌은 Lifetime Season ID에 나열되어 있습니다.

## 일괄 요청하기 (Making Batch Requests)
한 번에 최대 10명의 플레이어씩 시즌/평생 스탯 및 플레이어 정보를 일괄 요청할 수 있습니다. 애플리케이션에 필요한 속도 제한 요청 횟수를 줄이는 데 도움이 되도록 가능한 한 이 방법을 사용해야 합니다.

### 스탯 일괄 요청하기 (Making Batch Requests For Stats)
다음과 같이 한 번에 최대 10명의 플레이어에 대한 단일 게임 모드의 시즌 스탯을 얻을 수 있습니다.

```bash
curl -g "https://api.pubg.com/shards/$platform/seasons/$seasonId/gameMode/$gameMode/players?filter[playerIds]=$playerId-1,$playerId-2" \
-H "Authorization: Bearer api-key" \
-H "Accept: application/vnd.api+json"
```

단일 게임 모드의 평생 스탯 역시 `$seasonId`로 `"lifetime"`을 사용하여 최대 10명까지 요청할 수 있습니다.

```bash
curl -g "https://api.pubg.com/shards/$platform/seasons/lifetime/gameMode/$gameMode/players?filter[playerIds]=$playerId-1,$playerId-2" \
-H "Authorization: Bearer api-key" \
-H "Accept: application/vnd.api+json"
```

### 일괄로 플레이어 매치 목록 가져오기 (Getting Match Lists For Players in Batches)
다음과 같이 한 번의 요청으로 최대 10명 플레이어의 매치 목록을 얻을 수 있습니다.

```bash
curl -g "https://api.pubg.com/shards/$platform/players?filter[playerNames]=$playerName-1,$playerName-2" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```
계정 ID를 쉼표로 구분하여 최대 10명의 플레이어 정보를 요청할 수 있습니다. `?filter[playerIds]`를 `?filter[playerNames]`로 변경하여 계정 ID 대신 인게임 닉네임으로 이 작업을 수행할 수도 있습니다.

## 매치 정보 가져오기 (Getting a Match)
players 엔드포인트의 응답 내에서 다음과 같이 구성된 매치 ID 목록을 볼 수 있습니다.

```json
"matches": {
  "data": [
    {
      "type": "match",
      "id": "matchId"
    }
  ]
}
```

이 ID를 사용하여 matches 엔드포인트에서 다음과 같이 매치 정보를 검색할 수 있습니다. `$platform` 및 `$matchId`를 본인의 정보로 바꾸세요.

```bash
curl -g "https://api.pubg.com/shards/$platform/matches/$matchId" \
-H "Accept: application/vnd.api+json"
```
*참고: 토너먼트 매치를 가져올 때는 `tournament` 샤드를 사용해야 합니다.*
데이터 보존 기간은 14일입니다. 14일이 지난 매치 데이터는 제공되지 않습니다.

## 매치 샘플 가져오기 (Getting Match Samples)
samples 엔드포인트는 각 플랫폼에 대해 24시간마다 업데이트되는 대규모 무작위 매치 레퍼런스 세트를 제공합니다. 샘플링 비율은 플랫폼마다 독립적이며 어떠한 시간 간격에도 일정하지 않습니다. 이 데이터는 전체 매치 수나 고유 PUBG 플레이어 수를 추정하는 데 사용할 수 없으며 사용해서도 안 되고, 플랫폼별 매치 수나 고유 플레이어 수를 비교하는 방법으로 사용해서도 안 됩니다.

매치 샘플 요청은 다음과 같습니다.

```bash
curl -g "https://api.pubg.com/shards/$platform/samples?filter[createdAt-start]=$startTime" \
-H "Authorization: Bearer api-key" \
-H "Accept: application/vnd.api+json"
```
*참고: `filter[createdAt-start]` 없이 샘플을 호출하면 해당 플랫폼에 대한 가장 최근 샘플 목록이 반환됩니다. 필터를 사용하여 최대 14일 이전 샘플을 가져올 수 있습니다.*

## 원격 측정(Telemetry) 데이터 가져오기 (Getting Telemetry Data)
원격 측정 데이터는 각 매치에 대한 추가 정보를 제공합니다. 이 데이터는 gzip으로 압축되어 있으며, API를 사용하는 클라이언트는 gzip으로 압축된 응답을 허용한다고 지정해야 합니다. 매치의 원격 측정 파일로 연결되는 URL 문자열은 해당 매치의 Asset 객체에서 찾을 수 있습니다.

## 플레이어 마스터리 스탯 가져오기 (Getting Player Mastery Stats)
무기 마스터리 및 생존 마스터리 정보는 `weapon_mastery` 및 `survival_mastery` 엔드포인트를 쿼리하여 얻을 수 있습니다. 
*참고: 무기 마스터리 스탯은 18.2 업데이트의 일환으로 초기화되었으며, "OfficialStatsTotal"과 "CompetitiveStatsTotal"로 분리되었습니다.*

무기 마스터리:
```bash
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/weapon_mastery" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

생존 마스터리:
```bash
curl -g "https://api.pubg.com/shards/$platform/players/$playerId/survival_mastery" \
-H "Authorization: Bearer $api-key" \
-H "Accept: application/vnd.api+json"
```

## 순위표 데이터 가져오기 (Getting Leaderboard Data)
순위표는 각 플랫폼의 첫 번째 생존 타이틀 시즌 ID부터 각 시즌별로 제공됩니다. 각 순위표에는 지정된 게임 모드의 상위 500명의 플레이어가 포함됩니다. 현재 시즌의 순위표는 2시간마다 업데이트됩니다. 시즌 `division.bro.official.pc-2018-07`(PC용) 및 시즌 `division.bro.official.console-07`(콘솔용)부터 순위표를 얻으려면 `platform-region` 샤드를 사용해야 합니다. `platform` 샤드는 시즌 6까지만 지원됩니다.

다음과 같이 각 게임 모드의 현재 순위표 데이터를 얻을 수 있습니다.

```bash
curl -g "https://api.pubg.com/shards/$platform-region/leaderboards/$seasonId/$gameMode" \
-H "Authorization: Bearer api-key" \
-H "Accept: application/vnd.api+json"
```
