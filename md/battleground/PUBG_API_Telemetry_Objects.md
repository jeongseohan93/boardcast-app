# 원격 측정 객체 (Telemetry Objects)

다음은 포함된 데이터를 보여주기 위한 기본 스키마가 있는 모든 원격 측정(Telemetry) 객체의 목록입니다.
데이터 사전 및 열거형(Enums)은 [여기](#)에서 찾을 수 있습니다.

---

### BlueZoneCustomOptions (블루존 커스텀 옵션)
`blueZoneCustomOptions` 문자열에는 각 블루존(자기장) 페이즈에 대한 구성 객체 배열이 다음 구조로 포함되어 있습니다.
```json
{
  "phaseNum":                 int,
  "startDelay":               int,
  "warningDuration":          int,
  "releaseDuration":          int,
  "poisonGasDamagePerSecond": number,
  "radiusRate":               number,
  "spreadRatio":              number,
  "landRatio":                number,
  "circleAlgorithm":          int
}
```
객체 배열은 다음과 같이 문자열화됩니다.
`"[{"phaseNum":0,"startDelay":120,"warningDuration":300,"releaseDuration":300,"poisonGasDamagePerSecond":0.40000000596046448,"radiusRate":0.34999999403953552,"spreadRatio":0.5,"landRatio":0.55000001192092896,"circleAlgorithm":0},...]"`

### Character (캐릭터)
```json
{
  "name":         "string",
  "teamId":       int,
  "health":       number,
  "location":     "{Location}",
  "ranking":      int,
  "accountId":    "string",
  "isInBlueZone": bool,
  "isInRedZone":  bool,
  "zone":         ["regionId", "..."]
}
```

### CharacterWrapper (캐릭터 래퍼)
```json
{
  "character":           "{Character}",
  "primaryWeaponFirst":  "string",
  "primaryWeaponSecond": "string",
  "secondaryWeapon":     "string",
  "spawnKitIndex":       int
}
```

### Common (공통)
```json
{
  "isGame":  number
}
```
`isGame`은 블루존 및 안전 구역(safezone)의 상태로 정의되는 게임의 페이즈를 나타냅니다.
* `isGame = 0` -> 이륙 전
* `isGame = 0.1` -> 비행기 탑승 중
* `isGame = 0.5` -> 맵에 '존(zone)'이 없을 때 (게임 시작 전)
* `isGame = 1.0` -> 첫 번째 안전 구역 및 블루존 등장
* `isGame = 1.5` -> 첫 번째 블루존 축소
* `isGame = 2.0` -> 두 번째 블루존 등장
* `isGame = 2.5` -> 두 번째 블루존 축소
...

### DamageInfo (피해 정보)
```json
{
  "damageReason":             "string",
  "damageTypeCategory":       "string",
  "damageCauserName":         "string",
  "additionalInfo":           ["string", "..."],
  "distance":                 number,
  "isThroughPenetrableWall":  bool
}
```

### GameResult (게임 결과)
```json
{
  "rank":       int,
  "gameResult": "string",
  "teamId":     int,
  "stats":      "{Stats}",
  "accountId":  "string"
}
```

### GameResultOnFinished (종료 시 게임 결과)
```json
{
  "results": ["{GameResult}", "..."]   // 우승한 플레이어만 표시됨
}
```

### GameState (게임 상태)
```json
{
  "elapsedTime":              int,
  "numAliveTeams":            int,
  "numJoinPlayers":           int,
  "numStartPlayers":          int,
  "numAlivePlayers":          int,
  "safetyZonePosition":       "{Location}",
  "safetyZoneRadius":         number,
  "poisonGasWarningPosition": "{Location}",
  "poisonGasWarningRadius":   number,
  "redZonePosition":          "{Location}",
  "redZoneRadius":            number,
  "blackZonePosition":        "{Location}",
  "blackZoneRadius":          number
}
```

### Item (아이템)
```json
{
  "itemId":        "string",
  "stackCount":    int,
  "category":      "string",
  "subCategory":   "string",
  "attachedItems": ["itemId", "..."]
}
```

### ItemPackage (아이템 패키지 - 보급/전리품)
```json
{
  "itemPackageId": "string",
  "location":      "{Location}",
  "items":         ["{Item}", "..."]
}
```

### Location (위치)
```json
{
  "x": number,
  "y": number,
  "z": number
}
```
* 위치 값은 **센티미터(cm)** 단위로 측정됩니다.
* `(0,0)`은 각 맵의 왼쪽 상단(top-left)에 위치합니다.
* X 및 Y 축의 범위는 다음과 같습니다.
  * `0 - 816,000`: Erangel(에란겔), Miramar(미라마), Taego(태이고), Vikendi(비켄디), Deston(데스턴)
  * `0 - 408,000`: Sanhok(사녹)
  * `0 - 306,000`: Paramo(파라모)
  * `0 - 204,000`: Karakin(카라킨), Range(훈련장)
  * `0 - 102,000`: Haven(헤이븐)

### Stats (스탯)
```json
{
  "killCount":           int,
  "distanceOnFoot":      number,
  "distanceOnSwim":      number,
  "distanceOnVehicle":   number,
  "distanceOnParachute": number,
  "distanceOnFreefall":  number
}
```

### Vehicle (차량)
```json
{
  "vehicleType":     "string",
  "vehicleId":       "string",
  "vehicleUniqueId": int,
  "healthPercent":   number,
  "feulPercent":     number,
  "altitudeAbs":     number,
  "altitudeRel":     number,
  "velocity":        number,
  "seatIndex":       int,
  "isWheelsInAir":   bool,
  "isInWaterVolume": bool,
  "isEngineOn":      bool
}
```
