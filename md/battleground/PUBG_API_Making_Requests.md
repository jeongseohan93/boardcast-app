# 요청 보내기 (Making Requests)

## 콘텐츠 협상 (Content Negotiation)
API를 사용하는 클라이언트는 `application/vnd.api+json` 형식을 사용하여 응답을 수락한다고 지정해야 합니다. 편의를 위해 널리 사용되는 많은 클라이언트 라이브러리의 기본값인 `application/json`도 허용합니다.
서버는 클라이언트가 요청한 형식을 반영하는 `Content-Type` 헤더로 응답합니다.

## 헤더 설정 (Setting Headers)
헤더를 지정하려면 다음 코드를 사용하세요.

**Shell**
```bash
curl "endpoint-url" \
-H "Authorization: Bearer <api-key>" \
-H "Accept: application/vnd.api+json"
```

**Java**
```java
import java.io.*;
import java.net.*;
URL url = new URL("endpoint-url");
HttpURLConnection conn = (HttpURLConnection) url.openConnection();
conn.setRequestMethod("GET");
conn.setRequestProperty("Authorization","Bearer <api-key>");
conn.setRequestProperty("Accept", "application/vnd.api+json");
conn.getInputStream()
```

**Python**
```python
import requests
url = "endpoint-url"
header = {
  "Authorization": "Bearer <api-key>",
  "Accept": "application/vnd.api+json"
}
r = requests.get(url, headers=header)
```

**Go**
```go
import "net/http"
client := &http.Client{}
req, _ := http.NewRequest("GET","endpoint-url",nil)
req.Header.Set("Authorization", "Bearer <api-key>")
req.Header.Set("Accept", "application/vnd.api+json")
res, _ := client.Do(req)
```

---

# URL 매개변수 (URL Parameters)

### 플랫폼 샤드 (the platform shard)
`shards/$platform`
PUBG API는 플랫폼별로 데이터를 분류(shard)하므로, 대부분의 요청에서 URL에 샤드를 지정해야 합니다. 대부분의 경우 샤드에는 플랫폼만 필요합니다. 하지만 `division.bro.official.2018-09` 이전 시즌의 PC 및 PSN 플레이어 시즌 스탯과, `division.bro.official.2018-08` 이전 시즌의 Xbox 시즌 스탯을 요청할 때는 '플랫폼-지역(platform-region)' 샤드가 필요합니다.

### 플랫폼-지역 샤드 (the platform-region shard)
`shards/$platform-region`
플랫폼-지역 샤드는 생존 타이틀(Survival Title) 시스템이 시작되기 전의 시즌 스탯을 요청할 때 사용해야 합니다.
* PC 및 PSN 시즌 스탯: `division.bro.official.2018-09` 및 그 이전 시즌
* Xbox 시즌 스탯: `division.bro.official.2018-08` 및 그 이전 시즌

### 게임 모드 (Game Mode)
`gameMode/$gameMode`
`$gameMode` 값에 대한 자세한 내용은 '게임 모드(Game Modes)' 섹션을 참조하세요.

### 매치 ID (Match ID)
`matches/$matchId`
매치 ID는 매치 데이터와 원격 측정(telemetry) 데이터를 가져오는 데 사용됩니다. `players`, `samples`, `season stats` 엔드포인트의 응답 내에 나열됩니다.

### 시즌 ID (Season ID)
`seasons/$seasonId`
시즌 ID는 플레이어 시즌 스탯을 가져오는 데 사용되며, `Season Stats` 엔드포인트의 응답에서 확인할 수 있습니다. 각 플랫폼의 첫 번째 생존 타이틀 시즌은 다음과 같습니다.
* pc: `division.bro.official.pc-2018-01`
* psn: `division.bro.official.playstation-01`
* xbox: `division.bro.official.xbox-01`
* stadia: 해당 없음, 첫 시즌: `division.bro.official.console-07`

### 평생 시즌 ID (Lifetime Season ID)
`seasons/lifetime`
평생 시즌 ID를 사용하여 플레이어의 "평생(lifetime)" 스탯을 얻을 수 있습니다. 이는 인게임 시즌 스탯에서 "전적(Overall)"을 선택했을 때 표시되는 스탯과 동일하며 생존 타이틀 시스템이 시작된 시점부터의 데이터가 포함됩니다.

### 플레이어 계정 ID (Player Account ID)
`players/$playerId`
이 필터를 사용하여 검색할 플레이어 계정을 지정합니다.

### 플레이어 계정 ID 필터 (Player Account IDs Filter)
`filter[playerIds]=$playerId`
검색할 플레이어 계정을 지정합니다. 계정 ID를 쉼표로 구분하여 한 번에 최대 10명의 플레이어를 검색할 수 있습니다.

### 플레이어 계정 이름 필터 (Player Account Names Filter)
`filter[playerNames]=$playerName`
검색할 플레이어를 지정합니다. 플레이어 이름(인게임 닉네임)을 쉼표로 구분하여 한 번에 최대 10명의 플레이어를 검색할 수 있습니다.

### 게임패드 필터 (Gamepad Filter)
`filter[gamepad]=$isGamepad`
`stadia` 샤드를 사용할 때 마우스/키보드 스탯 대신 게임패드 스탯을 검색할지 여부를 지정하는 필터입니다. 해당 스탯을 쿼리할 때 `$isGamepad`는 `true` 값을 가져야 합니다.

### 페이지 필터 (Page Filter)
`page[number]=$page`
순위표(Leaderboards)는 각각 500명의 플레이어로 구성된 페이지로 나뉩니다. 페이지 필터를 사용하여 추가 페이지를 요청하세요. 페이지는 0부터 번호가 매겨집니다.

---

# 플랫폼 및 지역 (Platforms and Regions)
현재 샤드(shards)는 다음과 같습니다.

### 플랫폼 샤드 (`shards/$platform`)
* `kakao` - Kakao
* `stadia` - Stadia
* `steam` - Steam
* `tournament` - Tournaments
* `psn` - PSN
* `xbox` - Xbox
* `console` - PSN/Xbox (`/matches` 및 `/samples` 엔드포인트에 사용됨)

### 플랫폼-지역 샤드 (`shards/$platform-region`) (권장되지 않음/Deprecated)
* `pc-as` - Asia, `pc-eu` - Europe, `pc-jp` - Japan, `pc-kakao` - Kakao, `pc-krjp` - Korea, `pc-na` - North America, `pc-oc` - Oceania, `pc-ru` - Russia, `pc-sa` - South/Central America, `pc-sea` - South East Asia, `pc-tournament` - Tournaments
* `psn-as`, `psn-eu`, `psn-na`, `psn-oc`
* `xbox-as`, `xbox-eu`, `xbox-na`, `xbox-oc`, `xbox-sa`

---

# 게임 모드 (Game Modes)
유효한 게임 모드는 다음과 같습니다.
* `solo` - 팀당 1명, 3인칭 시점
* `solo-fpp` - 팀당 1명, 1인칭 시점
* `duo` - 팀당 최대 2명, 3인칭 시점
* `duo-fpp` - 팀당 최대 2명, 1인칭 시점
* `squad` - 팀당 2명 초과, 3인칭 시점
* `squad-fpp` - 팀당 2명 초과, 1인칭 시점

---

# GZIP
클라이언트는 `Accept-Encoding: gzip` 헤더를 지정할 수 있으며, 서버는 응답을 압축합니다. 응답은 `Content-Encoding: gzip`으로 반환됩니다. 매치 데이터의 크기를 고려할 때 이는 상당한 성능 이점을 가질 수 있습니다.

---

# 데이터 보존 기간 (Data Retention Period)
데이터 보존 기간은 **14일**입니다. 14일이 지난 매치 데이터는 사용할 수 없습니다. `players` 엔드포인트의 매치 목록은 14일 전까지 제공되며, `season stats` 엔드포인트는 14일 이내의 가장 최근 매치를 최대 32개까지 표시합니다.

---

# 응답 (Responses)
모든 서버 응답은 JSON-API 형식이며 루트 JSON 객체를 포함합니다. 응답에는 다음 최상위 멤버 중 하나 이상이 포함됩니다.
* `data`: 응답의 "기본 데이터"
* `errors`: 오류 객체 배열

응답에는 다음이 포함될 수도 있습니다.
* `links`: 기본 데이터와 관련된 링크 객체
* `included`: 기본 데이터 및/또는 서로 관련된 리소스 객체 배열
* `meta`: 현재 사용되지 않음

---

# 교차 출처 리소스 공유 (Cross Origin Resource Sharing / CORS)
이 API는 모든 출처의 AJAX 요청에 대해 CORS를 지원합니다.
