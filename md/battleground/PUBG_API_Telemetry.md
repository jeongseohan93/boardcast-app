# 원격 측정 (Telemetry)

원격 측정(Telemetry) 데이터는 매치에 대한 더 깊은 통찰력을 제공합니다. 여기에서 매치 내내 발생하는 원격 측정 이벤트(Telemetry Events)를 찾을 수 있습니다. 원격 측정 데이터를 얻으려면 먼저 매치 객체 내에서 해당 데이터에 대한 링크를 가져와야 합니다. 자세한 단계는 아래에서 확인할 수 있습니다.

데이터 사전 및 열거형(Enums)은 [여기](#)에서 찾을 수 있습니다.

---

## 원격 측정 데이터 가져오기 (To retrieve Telemetry Data)

먼저 `matches` 엔드포인트에서 매치 정보를 가져오는 것부터 시작해야 합니다. 매치 객체를 얻으려면 매치의 ID를 알아야 합니다. `players` 엔드포인트에서 반환된 플레이어 객체 내부에서 매치 ID를 찾을 수 있습니다. `players` 엔드포인트에 대한 자세한 내용은 플레이어(Players) 문서를 확인하세요. '시작하기(Getting Started)' 페이지의 튜토리얼도 도움이 될 수 있습니다.

요청은 아래 코드와 같아야 합니다. `$platform` 및 `$matchId`를 각각 적절한 플랫폼과 매치 ID로 바꾸는 것을 잊지 마세요.

```bash
curl "https://api.pubg.com/shards/$platform/matches/$matchId" \
-H "Accept: application/vnd.api+json"
```

다음으로 매치의 `relationships` 객체에서 "assets" 참조를 찾아야 합니다. 여기에는 전체 원격 측정 객체의 ID가 포함되어 있습니다. 원격 측정 파일의 링크를 찾으려면 이 ID가 필요합니다. 응답에서 다음 부분을 확인하세요.

```json
"relationships": {
  ...
  "assets": {
    "data": [
      {
        "type": "asset",
        "id": "1ad97f85-cf9b-11e7-b84e-0a586460f004"
      }
    ]
  }
  ...
}
```

이 ID를 찾으면 `included` 배열에서 해당 ID를 가진 원격 측정(telemetry) 객체를 검색할 수 있습니다. 거기서 발견된 전체 객체는 원격 측정 파일에 대한 링크를 제공하며 다음과 같은 형태를 띱니다 (URL은 예시일 뿐 작동하지 않습니다).

```json
{
  "type": "asset",
  "id": "1ad97f85-cf9b-11e7-b84e-0a586460f004",
  "attributes": {
    "URL": "https://telemetry-cdn.pubg.com/pc-krjp/2018/01/01/0/0/1ad97f85-cf9b-11e7-b84e-0a586460f004-telemetry.json",
    "createdAt": "2018-01-01T00:00:00Z",
    "description": "",
    "name": "telemetry"
  }
}
```

이제 원격 측정 파일에 대한 링크가 있으므로 다음 명령을 사용하여 데이터를 다운로드할 수 있습니다. **이 데이터를 가져오는 데는 API 키가 필요하지 않습니다.**

```bash
curl --compressed "https://telemetry-cdn.pubg.com/pc-krjp/2018/01/01/0/0/1ad97f85-cf9b-11e7-b84e-0a586460f004-telemetry.json" \
      -H "Accept: application/vnd.api+json"
```

원격 측정 파일에는 유형에 따라 구조가 다른 이벤트 객체의 배열이 포함됩니다. 포함된 이벤트에 대한 정보는 **원격 측정 이벤트(Telemetry Events)** 문서를 참조하세요.

**참고:** 원격 측정 데이터는 **gzip**을 사용하여 압축됩니다. 많은 브라우저와 라이브러리에서 추가 작업 없이 이를 지원하지만, API를 사용하는 클라이언트는 gzip 압축 응답을 허용한다고 지정해야 합니다. 반드시 `Accept-Encoding: gzip` 헤더를 전달하도록 확인하세요.
