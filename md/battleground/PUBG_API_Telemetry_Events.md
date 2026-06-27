# 원격 측정 이벤트 (Telemetry Events)

다음은 포함된 데이터를 보여주기 위한 기본 스키마가 있는 모든 원격 측정(Telemetry) 이벤트 유형의 목록입니다. 데이터 사전 및 열거형(Enums)은 [여기](#)에서 찾을 수 있습니다.

공간을 절약하기 위해 `{object-name}`으로 표시된 객체는 이 문서에서 설명하지 않습니다. 이벤트 내 객체에 대한 자세한 내용은 `원격 측정 객체 (Telemetry Objects)` 참조 문서에서 확인할 수 있습니다.
또한, 각 이벤트에는 아래 개요에서 생략된 다음과 같은 필드가 공통으로 포함되어 있습니다.
```json
"_D": "string",      // 이벤트 타임스탬프 (Event timestamp)
"_T": "string",      // 이벤트 유형 (Event type)
"common": "{Common}" // 공통 정보 객체
```

---

## 이벤트 유형 목록 (List of Event Types)

### LogArmorDestroy (방어구 파괴)
* `attackId`: int
* `attacker`: {Character}
* `victim`: {Character}
* `damageTypeCategory`: string
* `damageReason`: string
* `damageCauserName`: string
* `item`: {Item}
* `distance`: number

### LogBlackZoneEnded (블랙존 종료)
* `survivors`: [{Character}, ...]

### LogCarePackageLand (보급상자 착지)
* `itemPackage`: {ItemPackage}

### LogCarePackageSpawn (보급상자 생성)
* `itemPackage`: {ItemPackage}

### LogCharacterCarry (캐릭터 업기)
* `character`: {Character}
* `carryState`: string

### LogEmPickupLiftOff (비상 호출 이륙)
* `instigator`: {Character}
* `riders`: [{Character}, ...]

### LogGameStatePeriodic (주기적 게임 상태)
* `gameState`: {GameState}

### LogHeal (회복)
* `character`: {Character}
* `item`: {Item}
* `healamount`: number

### LogItemAttach (아이템 부착 - 파츠)
* `character`: {Character}
* `parentItem`: {Item}
* `childItem`: {Item}

### LogItemDetach (아이템 분리 - 파츠)
* `character`: {Character}
* `parentItem`: {Item}
* `childItem`: {Item}

### LogItemDrop (아이템 버리기)
* `character`: {Character}
* `item`: {Item}

### LogItemEquip (아이템 장착)
* `character`: {Character}
* `item`: {Item}

### LogItemPickup (아이템 줍기)
* `character`: {Character}
* `item`: {Item}

### LogItemPickupFromCarepackage (보급상자에서 아이템 줍기)
* `character`: {Character}
* `item`: {Item}
* `carePackageUniqueId`: number

### LogItemPickupFromCustomPackage (커스텀 패키지에서 아이템 줍기)
* `character`: {Character}
* `item`: {Item}

### LogItemPickupFromLootbox (전리품 상자에서 아이템 줍기)
* `character`: {Character}
* `item`: {Item}
* `ownerTeamId`: int
* `creatorAccountId`: string

### LogItemPickupFromVehicleTrunk (차량 트렁크에서 아이템 줍기)
* `character`: {Character}
* `vehicle`: {Vehicle}
* `item`: {Item}

### LogItemPutToVehicleTrunk (차량 트렁크에 아이템 넣기)
* `character`: {Character}
* `vehicle`: {Vehicle}
* `item`: {Item}

### LogItemUnequip (아이템 장착 해제)
* `character`: {Character}
* `item`: {Item}

### LogItemUse (아이템 사용)
* `character`: {Character}
* `item`: {Item}

### LogMatchDefinition (매치 정의)
* `MatchId`: string
* `PingQuality`: string (Deprecated)
* `SeasonState`: string

### LogMatchEnd (매치 종료)
* `characters`: [{CharacterWrapper}, ...]
* `gameResultOnFinished`: {GameResultOnFinished} // 우승한 플레이어만 표시됨

### LogMatchStart (매치 시작)
* `mapName`: string
* `weatherId`: string
* `characters`: [{CharacterWrapper}, ...]
* `cameraViewBehaviour`: string
* `teamSize`: int
* `isCustomGame`: bool
* `isEventMode`: bool
* `blueZoneCustomOptions`: string
  * *참고: `blueZoneCustomOptions`는 문자열화된 객체 배열입니다. `BlueZoneCustomOptions`를 참조하세요.*

### LogObjectDestroy (오브젝트 파괴)
* `character`: {Character}
* `objectType`: string
* `objectLocation`: {Location}

### LogObjectInteraction (오브젝트 상호작용)
* `character`: {Character}
* `objectType`: string
* `objectTypeStatus`: string
* `objectTypeAdditionalInfo`: string

### LogParachuteLanding (낙하산 착지)
* `character`: {Character}
* `distance`: number

### LogPhaseChange (페이즈 변경 - 자기장)
* `phase`: int
* `elapsedTime`: number

### LogPlayerAttack (플레이어 공격)
* `attackId`: int
* `fireWeaponStackCount`: int
* `attacker`: {Character}
* `attackType`: string
* `weapon`: {Item}
* `vehicle`: {Vehicle}

### LogPlayerCreate (플레이어 생성)
* `character`: {Character}

### LogPlayerDestroyBreachableWall (플레이어 파괴 가능 벽 파괴)
* `attacker`: {Character}
* `weapon`: {Item}

### LogPlayerDestroyProp (플레이어 프롭 파괴)
* `attacker`: {Character}
* `objectType`: string
* `objectLocation`: {Location}

### LogPlayerKill (플레이어 킬 - 토너먼트 매치용)
* `attackId`: int
* `killer`: {Character}
* `victim`: {Character}
* `assistant`: {Character}
* `dBNOId`: int
* `damageReason`: string
* `damageTypeCategory`: string
* `damageCauserName`: string
* `damageCauserAdditionalInfo`: [string, ...]
* `victimWeapon`: string
* `victimWeaponAdditionalInfo`: [string, ...]
* `distance`: number
* `victimGameResult`: {GameResult}
* `isThroughPenetrableWall`: bool

### LogPlayerKillV2 (플레이어 킬 V2)
* `attackId`: int
* `dBNOId`: int
* `victimGameResult`: {GameResult}
* `victim`: {Character}
* `victimWeapon`: string
* `victimWeaponAdditionalInfo`: [string, ...]
* `dBNOMaker`: {Character}
* `dBNODamageInfo`: {DamageInfo}
* `finisher`: {Character}
* `finishDamageInfo`: {DamageInfo}
* `killer`: {Character}
* `killerDamageInfo`: {DamageInfo}
* `assists_AccountId`: [string, ...]
* `teamKillers_AccountId`: [string, ...]
* `isSuicide`: bool

### LogPlayerLogin (플레이어 로그인)
* `accountId`: string

### LogPlayerLogout (플레이어 로그아웃)
* `accountId`: string

### LogPlayerMakeGroggy (플레이어 기절시킴 / DBNO)
* `attackId`: int
* `attacker`: {Character}
* `victim`: {Character}
* `damageReason`: string
* `damageTypeCategory`: string
* `damageCauserName`: string
* `damageCauserAdditionalInfo`: [string, ...]
* `VictimWeapon`: string
* `VictimWeaponAdditionalInfo`: [string, ...]
* `distance`: number
* `isAttackerInVehicle`: bool
* `dBNOId`: int
* `isThroughPenetrableWall`: bool

### LogPlayerPosition (플레이어 위치)
* `character`: {Character}
* `vehicle`: {Vehicle}
* `elapsedTime`: number
* `numAlivePlayers`: int

### LogPlayerRedeploy (플레이어 재배치)
* `character`: {Character}

### LogPlayerRedeployBRStart (복귀전/부활 시작)
* `characters`: [{Character}, ...]

### LogPlayerRevive (플레이어 부활)
* `reviver`: {Character}
* `victim`: {Character}
* `dBNOId`: int

### LogPlayerTakeDamage (플레이어 피해 받음)
* `attackId`: int
* `attacker`: {Character}
* `victim`: {Character}
* `damageTypeCategory`: string
* `damageReason`: string
* `damage`: number // 1.0 피해량 = 1.0 체력 (방어구 적용 후 순수 체력 피해량)
* `damageCauserName`: string
* `isThroughPenetrableWall`: bool

### LogPlayerUseFlareGun (플레어건 사용)
* `attackId`: int
* `fireWeaponStackCount`: int
* `attacker`: {Character}
* `attackType`: string
* `weapon`: {Item}

### LogPlayerUseThrowable (투척 무기 사용)
* `attackId`: int
* `fireWeaponStackCount`: int
* `attacker`: {Character}
* `attackType`: string
* `weapon`: {Item}

### LogRedZoneEnded (레드존 종료)
* `drivers`: [{Character}, ...]

### LogSwimEnd (수영 종료)
* `character`: {Character}
* `swimDistance`: number
* `maxSwimDepthOfWater`: number

### LogSwimStart (수영 시작)
* `character`: {Character}

### LogVaultStart (지형지물 넘기 시작)
* `character`: {Character}
* `isLedgeGrab`: bool

### LogVehicleDamage (차량 피해 받음)
* `attackId`: int
* `attacker`: {Character}
* `vehicle`: {Vehicle}
* `damageTypeCategory`: string
* `damageCauserName`: string
* `damage`: number
* `distance`: number

### LogVehicleDestroy (차량 파괴)
* `atackId`: int
* `attacker`: {Character}
* `vehicle`: {Vehicle}
* `damageTypeCategory`: string
* `damageCauserName`: string
* `distance`: number

### LogVehicleLeave (차량 하차)
* `character`: {Character}
* `vehicle`: {Vehicle}
* `rideDistance`: number
* `seatIndex`: integer
* `maxSpeed`: number
* `fellowPassengers`: [{Character}, ...]

### LogVehicleRide (차량 탑승)
* `character`: {Character}
* `vehicle`: {Vehicle}
* `seatIndex`: int
* `fellowPassengers`: [{Character}, ...]

### LogWeaponFireCount (무기 발사 횟수)
* `character`: {Character}
* `weaponId`: string
* `fireCount`: int // 10 단위로 증가

### LogWheelDestroy (바퀴 파괴)
* `attackId`: int
* `attacker`: {Character}
* `vehicle`: {Vehicle}
* `damageTypeCategory`: string
* `damageCauserName`: string
