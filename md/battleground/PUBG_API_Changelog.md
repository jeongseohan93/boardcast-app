# 변경 로그 (Changelog)

## 예정된 변경 사항 (Upcoming Changes)
* 현재 예정된 변경 사항이 없습니다.

---

## v22.1.0
**새로운 데이터 (New Data):**
* 플레이어 객체에 `ClanID` 추가
* 클랜(Clans) 엔드포인트 사용 가능

## v22.0.3
**제거됨 (Removed):**
* 토너먼트(Tournaments) 엔드포인트 및 매치 제거

## v22.0.2
**새로운 데이터 (New Data):**
* 생존 마스터리(survival mastery) 객체에 `tier` 추가

## v22.0.1
**새로운 데이터 (New Data):**
* 플레이어 객체에 이용 제한(ban) 유형 추가

## v22.0.0
**새로운 데이터 (New Data):**
* [PC, 콘솔] 18.2 패치부터 무기 마스터리에 `weaponMasterySummary.weaponSummaries.{Item_Weapon}.OfficialStatsTotal`이 추가되었습니다. 이 스탯에는 이전 무기 마스터리 스탯이 포함되지 않습니다.
* [PC, 콘솔] 18.2 패치부터 무기 마스터리에 `weaponMasterySummary.weaponSummaries.{Item_Weapon}.CompetitiveStatsTotal`이 추가되었습니다. 이 스탯에는 이전 무기 마스터리 스탯이 포함되지 않습니다.

**데이터 변경 사항 (Data Changes):**
* 18.2 패치 이전의 무기 마스터리 스탯은 계속 `weaponMasterySummary.weaponSummaries.{Item_Weapon}.StatsTotal`에 표시되지만, 더 이상 업데이트되지 않습니다.

**지원 중단됨 (Deprecated):**
* `weaponMasterySummary.weaponSummaries.{Item_Weapon}.Medals`

## v21.3.0
**새로운 데이터 (New Data):**
* `LogCharacterCarry`

## v21.2.0
**새로운 데이터 (New Data):**
* `LogItemPutToVehicleTrunk`
* `LogItemPickupFromVehicleTrunk`
* 새로운 `attributes.matchType` 열거형(enum): `"airoyale"`, `"seasonal"`

## v21.1.0
**새로운 데이터 (New Data):**
* `LogPlayerRedeploy`
* `LogPlayerRedeployBRStart`

## v21.0.0
**제거됨 (Removed):**
* [PC, 콘솔] `LogPlayerKill`
* *참고: 이 업데이트 전에 완료된 매치에서는 LogPlayerKill 이벤트가 제거되지 않습니다. 이 업데이트는 토너먼트 매치에는 영향을 미치지 않습니다.*

**버그 수정 (Bug Fix):**
* 매치의 원격 측정(telemetry) 파일에 있는 로그 이벤트에 표시된 것과 `participant.attributes.stats`의 어시스트 수가 때때로 다르게 나타나는 문제 수정

## v20.5.0
**새로운 데이터 (New Data):**
* `LogPlayerDestroyProp`
* `LogPlayerKillV2.assists_AccountId`
* `LogPlayerKillV2.teamKillers_AccountId`

## v20.4.0
**새로운 데이터 (New Data):**
* `LogEmPickupLiftOff`

## v20.3.0
**새로운 데이터 (New Data):**
* `LogPlayerKillV2`

**버그 수정 (Bug Fix):**
* `participant.attributes.stats.killStreaks` 값이 항상 0이던 문제 수정

## v20.2.0
**새로운 데이터 (New Data):**
* `LogItemPickupFromCustomPackage`
* `LogVehicleDamage`
* 생존 마스터리(Survival Mastery) 엔드포인트 사용 가능

**버그 수정 (Bug Fix):**
* 지원 중단된 `Player.attributes.createdAt` 및 `Player.attributes.updatedAt`의 예상치 못한 데이터 문제 수정

## v20.1.0
**지원 중단됨 (Deprecated):**
* `leaderboard.included.player.attributes.stats.winRatio`
* `leaderboard.included.player.attributes.stats.killDeathRatio`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.reviveRatio`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.revives`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.heals`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.boosts`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.weaponsAcquired`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.teamKills`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.playTime`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.killStreak`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.avgSurvivalTime`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.kdr`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.roundMostKills`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.longestKill`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.headshotKills`
* `rankedplayerstats.attributes.rankedGameModeStats.{gameMode}.headshotKillRatio`

## v20.0.0
**새로운 데이터 (New Data):**
* 이제 랭크 스탯 엔드포인트를 통해 플레이어 랭크 스탯(ranked stats)을 사용할 수 있습니다.
* `leaderboard.included.player.attributes.stats.kda`
* `leaderboard.included.player.attributes.stats.tier`
* `leaderboard.included.player.attributes.stats.subTier`

**데이터 변경 사항 (Data Changes):**
* 시즌 7부터 순위표(Leaderboards)에는 `platform-region` 샤드가 필요합니다. API 응답에는 각 순위표의 상위 500명 플레이어가 포함됩니다. 더 이상 페이지 필터가 필요하지 않습니다.

**지원 중단됨 (Deprecated):**
* `playerSeason.attributes.gameModeStats.{gameMode}.rankPoints`
* `playerSeason.attributes.gameModeStats.{gameMode}.rankPointsTitle`
* `playerSeason.attributes.bestRankPoint`

## v19.1.0
**새로운 데이터 (New Data):**
* [Stadia] 이제 Stadia 매치 및 Stadia 플레이어 데이터를 사용할 수 있습니다.

## v19.0.0
**새로운 데이터 (New Data):**
* [콘솔] 차량에 의해 `LogPlayerKill` 또는 `LogPlayerMakeGroggy`가 트리거되고 엔진이 꺼진 경우 `damageCauserAdditionalInfo`에 `"VehicleEngineOff"` 값이 추가됩니다.

**데이터 변경 사항 (Data Changes):**
* [콘솔] `LogMatchEnd.characters` 및 `LogMatchStart.characters`가 Character 객체의 배열에서 CharacterWrapper 객체의 배열로 변경되었습니다.

## v18.1.0
**지원 중단됨 (Deprecated):**
* `LogMatchDefinition.PingQuality`

## v18.0.0
**데이터 변경 사항 (Data Changes):**
* [PC] `LogMatchEnd.characters` 및 `LogMatchStart.characters`가 Character 객체의 배열에서 CharacterWrapper 객체의 배열로 변경되었습니다.

## v17.2.0
**새로운 데이터 (New Data):**
* `LogPlayerUseFlareGun`
* `Vehicle.velocity`
* `Vehicle.altitudeAbs`
* `Vehicle.altitudeRel`
* `Vehicle.isEngineOn`
* [PC] 차량에 의해 `LogPlayerKill` 또는 `LogPlayerMakeGroggy`가 트리거되고 엔진이 꺼진 경우 `damageCauserAdditionalInfo`에 `"VehicleEngineOff"` 값이 추가됩니다.

## v17.1.0
**새로운 데이터 (New Data):**
* `Match.attributes.matchType`

## v17.0.0
**제거됨 (Removed):**
* `Vehicle.rotationPitch`

## v16.2.0
**새로운 데이터 (New Data):**
* [PS4, Xbox] `LogBlackZoneEnded`
* [PS4, Xbox] `LogPlayerDestroyBreachableWall`
* [PS4, Xbox] `LogPlayerKill.isThroughPenetrableWall`
* [PS4, Xbox] `LogPlayerMakeGroggy.isThroughPenetrableWall`
* [PS4, Xbox] `LogPlayerTakeDamage.isThroughPenetrableWall`
* [PS4, Xbox] `GameState.blackZonePosition`
* [PS4, Xbox] `GameState.blackZoneRadius`

## v16.1.0
**새로운 데이터 (New Data):**
* [PC] `LogBlackZoneEnded`
* [PC] `LogPlayerDestroyBreachableWall`
* [PC] `LogPlayerKill.isThroughPenetrableWall`
* [PC] `LogPlayerMakeGroggy.isThroughPenetrableWall`
* [PC] `LogPlayerTakeDamage.isThroughPenetrableWall`
* [PC] `GameState.blackZonePosition`
* [PC] `GameState.blackZoneRadius`

## v16.0.0
**버그 수정 (Bug Fix):**
* `steam`에서 `/leaderboards` 엔드포인트를 사용할 수 없었던 문제 수정

**데이터 변경 사항 (Data Changes):**
* [PC] 이제 `/leaderboards` 엔드포인트 요청 시 시즌 ID가 필요합니다.

**새로운 데이터 (New Data):**
* [PS4, Xbox, 카카오] 이제 `/leaderboards` 엔드포인트를 사용하여 카카오 및 콘솔(PS4, Xbox) 순위표를 사용할 수 있습니다.

## v15.3.1
**버그 수정 (Bug Fix):**
* 일부 플레이어의 매치 누락, `LogMatchEnd`에서 플레이어 누락, 일부 플레이어의 participant 객체 누락 문제를 수정했습니다. 이 수정 사항은 이전 매치에는 적용되지 않습니다.

## v15.3.0
**새로운 데이터 (New Data):**
* [PS4, Xbox] `LogPhaseChange`
* [PS4, Xbox] `LogPlayerUseThrowable`

## v15.2.0
**새로운 데이터 (New Data):**
* [PC] `LogPhaseChange`
* [PC] `LogPlayerUseThrowable`

## v15.1.0
**새로운 데이터 (New Data):**
* [PS4, Xbox] `LogObjectInteraction`
* [PS4, Xbox] `Vehicle.vehicleUniqueId`
* [PS4, Xbox] `Vehicle.rotationPitch`
* [PS4, Xbox] `Vehicle.isWheelsInAir`
* [PS4, Xbox] `Vehicle.isInWaterVolume`

## v15.0.0
**새로운 데이터 (New Data):**
* [PS4, Xbox] 무기 마스터리(Weapon Mastery) 엔드포인트 사용 가능
* [PS4, Xbox] 콘솔 매치에 대해 `/matches` 엔드포인트에서 `"xbox"` 및 `"psn"` 외에 `"console"` 샤드를 사용할 수 있습니다.

**데이터 변경 사항 (Data Changes):**
* [PS4, Xbox] PS4/Xbox의 샘플 데이터를 가져오려면 `"console"` 샤드를 사용해야 합니다.
* [PS4, Xbox] `participant.shardId`에서 개별 플레이어의 플랫폼을 확인할 수 있습니다.

## v14.2.0
**새로운 데이터 (New Data):**
* `LogItemPickupFromLootbox.creatorAccountId`
* [PC] 무기 마스터리(Weapon Mastery) 엔드포인트 사용 가능
* [PC] `LogObjectInteraction`
* [PC] `Vehicle.vehicleUniqueId`
* [PC] `Vehicle.rotationPitch`
* [PC] `Vehicle.isWheelsInAir`
* [PC] `Vehicle.isInWaterVolume`

## v14.1.0
**새로운 데이터 (New Data):**
* `LogVehicleLeave.fellowPassengers`
* `LogVehicleRide.fellowPassengers`
* [PS4, Xbox] `LogPlayerKill.VictimWeapon`
* [PS4, Xbox] `LogPlayerKill.VictimWeaponAdditionalInfo`
* [PS4, Xbox] `LogPlayerMakeGroggy.VictimWeapon`
* [PS4, Xbox] `LogPlayerMakeGroggy.VictimWeaponAdditionalInfo`

## v14.0.0
**버그 수정 (Bug Fixes):**
* 모든 게임 모드에서 `bestRankPoint` 값이 항상 최신 상태가 아니던 문제 수정

**새로운 데이터 (New Data):**
* `playerSeason.attributes.bestRankPoint`
* [PC] `LogPlayerKill.VictimWeapon`
* [PC] `LogPlayerKill.VictimWeaponAdditionalInfo`
* [PC] `LogPlayerMakeGroggy.VictimWeapon`
* [PC] `LogPlayerMakeGroggy.VictimWeaponAdditionalInfo`

**데이터 변경 사항 (Data Changes):**
* [PC] 리마스터된 에란겔 맵은 `"Erangel_Main"`이 아닌 `"Baltic_Main"`으로 불립니다.

**제거됨 (Removed):**
* `playerSeason.attributes.gameModeStats.{gameMode}.bestRankPoint`

## v13.0.1
**버그 수정 (Bug Fixes):**
* "킬 스틸(kill steals)"로 인해 간혹 participant 객체의 `attributes.stats.kills` 값이 부정확해지는 문제 수정

## v13.0.0
**데이터 변경 사항 (Data Changes):**
* 레드존 또는 블루존에 의해 사망한 플레이어의 `participant.attributes.stats.deathType`이 `"byplayer"` 대신 `"byzone"`이 됩니다.

## v12.0.0
**새로운 데이터 (New Data):**
* 새로운 `/seasons/lifetime/gameMode/{gameMode}/players` 엔드포인트를 사용하여 최대 10명의 플레이어에 대한 단일 게임 모드의 평생(lifetime) 스탯을 일괄 요청할 수 있습니다.

**데이터 변경 사항 (Data Changes):**
* `LogPlayerKill.Assistant`, `LogPlayerKill.Killer`, `LogPlayerPosition.Vehicle`은 빈 객체 대신 `null`로 설정됩니다.

**제거됨 (Removed):**
* `participant.attributes.stats.killPoints`
* `participant.attributes.stats.killPointsDelta`
* `participant.attributes.stats.lastKillPoints`
* `participant.attributes.stats.lastWinPoints`
* `participant.attributes.stats.mostDamage`
* `participant.attributes.stats.rankPoints`
* `participant.attributes.stats.winPoints`
* `participant.attributes.stats.winPointsDelta`

## v11.1.0
**새로운 데이터 (New Data):**
* 새로운 `/seasons/{seasonId}/gameMode/{gameMode}/players` 엔드포인트를 사용하여 최대 10명의 플레이어에 대한 단일 게임 모드의 시즌 스탯을 일괄 요청할 수 있습니다.
* `/players` 엔드포인트를 사용하여 정보를 요청할 수 있는 플레이어 수가 6명에서 10명으로 증가했습니다.

## v11.0.1
**버그 수정 (Bug Fixes):**
* 무기에서 파츠(attachment)를 분리하는 동시에 버릴 때 `LogItemDrop` 이벤트가 누락되는 문제 수정

## v11.0.0
**버그 수정 (Bug Fixes):**
* 일부 원격 측정(telemetry) 파일에서 콘텐츠 디코딩이 실패하는 문제 수정

**데이터 변경 사항 (Data Changes):**
* `attributes.gameMode`는 match 객체의 커스텀 매치에 대한 추가 열거형(enum)을 갖습니다. `"normal"`은 `"normal"`, `"war"`, `"zombie"`, `"conquest"`, `"esports"`로 나뉩니다. 다른 열거형과 마찬가지로 각각 `"-solo"`, `"-duo"`, `"-squad"`, `"-fpp"`가 뒤에 붙습니다.

## v10.0.1
**버그 수정 (Bug Fixes):**
* `/tournaments` 엔드포인트의 대부분의 매치에서 match 객체의 `attributes.isCustomMatch`가 `false`이고 `attributes.gameMode`가 `"normal"`이던 문제 수정

## v10.0.0
**데이터 변경 사항 (Data Changes):**
* [PC] `/leaderboards` 엔드포인트는 요청된 페이지당 최대 500명의 생존자를 반환합니다.

## v9.1.0
**지원 중단됨 (Deprecated):**
* `/samples` 엔드포인트에서 `platform-region` 샤드를 사용하는 것은 더 이상 권장되지 않으며, 플랫폼 샤드를 사용하여 쿼리한 것처럼 해당 플랫폼의 모든 지역에 대한 데이터를 반환하여 응답합니다.

## v9.0.0
**새로운 데이터 (New Data):**
* [PS4, Xbox] `Character.isInBlueZone`, `Character.isInRedZone`, `Character.zone`, `GameResult`, `LogHeal`, `LogItemPickupFromCarepackage`, `LogItemPickupFromLootbox`, `LogMatchDefinition.SeasonState`, `LogObjectDestroy`, `LogParachuteLanding`, `LogPlayerAttack.fireWeaponStackCount`, `LogPlayerKill.assistant`, `LogPlayerKill.damageCauserAdditionalInfo`, `LogPlayerKill.dBNOId`, `LogPlayerKill.victimGameResult`, `LogPlayerMakeGroggy.damageCauserAdditionalInfo`, `LogPlayerMakeGroggy.damageReason`, `LogPlayerRevive.dBNOId`, `LogRedZoneEnded`, `LogSwimEnd.maxSwimDepthOfWater`, `LogVaultStart`, `LogVehicleLeave.maxSpeed`, `LogWeaponFireCount`, `Stats`
* [PS4, Xbox] `match.attributes.seasonState`
* [PS4, Xbox] `playerSeason.attributes.gameModeStats.{gameMode}.bestRankPoint`
* [PS4, Xbox] `playerSeason.attributes.gameModeStats.{gameMode}.dailyWins`
* [PS4, Xbox] `playerSeason.attributes.gameModeStats.{gameMode}.rankPoints`
* [PS4, Xbox] `playerSeason.attributes.gameModeStats.{gameMode}.swimDistance`
* [PS4, Xbox] `playerSeason.attributes.gameModeStats.{gameMode}.weeklyWins`
* [PS4, Xbox] `playerSeason.attributes.gameModeStats.{gameMode}.rankPointsTitle`
* [PS4] `division.bro.official.playstation-01`부터 시작하는 평생 스탯(Lifetime Stats)은 `/players/{accountId}/seasons/{seasonId}` 엔드포인트에서 `seasonId`로 `"lifetime"`을 사용하여 gameMode별로 확인할 수 있습니다.
* [Xbox] `division.bro.official.xbox-01`부터 시작하는 평생 스탯(Lifetime Stats)은 `/players/{accountId}/seasons/{seasonId}` 엔드포인트에서 `seasonId`로 `"lifetime"`을 사용하여 gameMode별로 확인할 수 있습니다.

**데이터 변경 사항 (Data Changes):**
* [PS4, Xbox] 2019년 1월 22일 이후의 시즌 스탯은 플랫폼별로 글로벌 및 샤드 처리됩니다. 2019년 1월 22일 이전의 PS4 및 Xbox 데이터는 이전 URL 형식으로만 액세스할 수 있습니다.
* [PS4] `division.bro.official.2018-09` 이후의 PS4 시즌은 `division.bro.official.{Year-Month}`가 아닌 `division.bro.official.playstation-{시즌 번호}` 형식입니다. 첫 번째 시즌은 `division.bro.official.playstation-01`입니다.
* [Xbox] `division.bro.official.2018-08` 이후의 Xbox 시즌은 `division.bro.official.{Year-Month}`가 아닌 `division.bro.official.xbox-{시즌 번호}` 형식입니다. 첫 번째 시즌은 `division.bro.official.xbox-01`입니다.

**지원 중단됨 (Deprecated):**
* [PS4, Xbox] `participant.attributes.stats.killPoints`
* [PS4, Xbox] `participant.attributes.stats.killPointsDelta`
* [PS4, Xbox] `participant.attributes.stats.winPoints`
* [PS4, Xbox] `participant.attributes.stats.winPointsDelta`
* [PS4, Xbox] `playerSeason.attributes.gameModeStats.{gameMode}.killPoints`
* [PS4, Xbox] `playerSeason.attributes.gameModeStats.{gameMode}.winPoints`

## v8.0.2
**버그 수정 (Bug Fixes):**
* [PC] 시즌 스탯에서 `walkDistance`, `rideDistance`, `swimDistance`가 모두 0이던 문제 수정

## v8.0.1
**버그 수정 (Bug Fixes):**
* [PC] `/matches` 엔드포인트의 스탯에서 `walkDistance`, `rideDistance`, `swimDistance`가 모두 0이던 문제 수정

## v8.0.0
**버그 수정 (Bug Fixes):**
* [PC] 토너먼트 매치 객체의 `attributes.shardId`가 `"tournament"` 대신 `"steam"`이던 문제 수정

**새로운 데이터 (New Data):**
* 매치를 가져오는 데 `"tournament"` 샤드를 사용할 수 있습니다.

**지원 중단됨 (Deprecated):**
* `/matches` 엔드포인트에서 `platform-region` 샤드를 사용하는 것은 권장되지 않습니다.

**제거됨 (Removed):**
* [PC] `LogMatchEnd.rewardDetail`
* [PC] `PlayTimeRecord`
* [PC] `RewardDetail`

## v7.8.0
**버그 수정 (Bug Fixes):**
* 승리한 팀의 `roster.attributes.won`이 가끔 `false`이던 문제 수정

**새로운 데이터 (New Data):**
* [PC] `playerSeason.attributes.gameModeStats.{gameMode}.rankPointsTitle`, `GameResult`, `PlayTimeRecord`, `RewardDetail`, `Stats`, `LogHeal`, `LogItemPickupFromCarepackage`, `LogItemPickupFromLootbox`, `LogObjectDestroy`, `LogParachuteLanding`, `LogRedZoneEnded`, `LogVaultStart`, `LogWeaponFireCount`, `Character.isInBlueZone`, `Character.isInRedZone`, `Character.zone`, `LogMatchEnd.rewardDetail`, `LogSwimEnd.maxSwimDepthOfWater`, `LogPlayerKill.assistant`, `LogPlayerKill.damageCauserAdditionalInfo`, `LogPlayerKill.dBNOId`, `LogPlayerKill.victimGameResult`, `LogPlayerMakeGroggy.damageCauserAdditionalInfo`, `LogPlayerMakeGroggy.damageReason`, `LogPlayerRevive.dBNOId`, `LogVehicleLeave.maxSpeed`

**데이터 변경 사항 (Data Changes):**
* [PC] `roundsPlayed < 10`일 때 `playerSeason.attributes.gameModeStats.{gameMode}.rankPoints`가 더 이상 0이 되지 않습니다.

## v7.7.0
**버그 수정 (Bug Fixes):**
* [Xbox] 진행 중인 시즌에 대해 `attributes.isOffSeason`이 `"true"`가 되던 문제 수정

**새로운 데이터 (New Data):**
* [PS4] PS4 플랫폼 지원 추가

## v7.6.0
**버그 수정 (Bug Fixes):**
* IGN(인게임 닉네임)이 같은 계정이 두 개 있는 경우, `/players` 엔드포인트 쿼리 시 가장 최근의 `accountId`가 반환되지 않던 문제 수정

**지원 중단됨 (Deprecated):**
* `/players` 엔드포인트에서 `platform-region` 샤드를 사용하는 것은 권장되지 않으며, 플랫폼 샤드를 사용하여 쿼리한 것처럼 플랫폼의 모든 지역 데이터를 반환합니다.

## v7.5.0
**버그 수정 (Bug Fix):**
* [PC] 플레이어가 로그아웃했다가 매치가 시작되기 전에 다시 게임에 연결한 경우 `timeSurvived` 및 `duration`이 초 단위 대신 타임스탬프로 표시되던 문제 수정

**새로운 데이터 (New Data):**
* [PC] `/leaderboards` 엔드포인트가 추가되었으며 각 게임 모드의 상위 100명 플레이어를 반환합니다.

**데이터 변경 사항 (Data Changes):**
* 이제 `platform-region` 외에 플랫폼별로도 `/players` 엔드포인트를 쿼리할 수 있습니다.

## v7.4.0
**버그 수정 (Bug Fixes):**
* [Xbox] 단일 원격 측정 파일 내에 중복된 `attackIds`가 존재하던 문제 수정
* [Xbox] 기절(knocked) 상태에서의 킬에서 `killDistance`가 항상 정확하지 않던 문제 수정
* [Xbox] `LogPlayerTakeDamage` 이벤트에서 공격자의 체력과 위치가 이제 "0"이 아닌 다른 값을 표시합니다.

**새로운 데이터 (New Data):**
* `LogPlayerPosition.vehicle` 추가

## v7.3.0
**새로운 데이터 (New Data):**
* [PC] `division.bro.official.pc-2018-01`부터 시작하는 평생 스탯(Lifetime Stats)은 `/players/{accountId}/seasons/{seasonId}` 엔드포인트에서 `seasonId`로 `"lifetime"`을 사용하여 gameMode별로 확인할 수 있습니다.

## v7.2.0
**데이터 변경 사항 (Data Changes):**
* [PC] `roundsPlayed < 10`인 경우 `playerSeason.attributes.gameModeStats.{gameMode}.rankPoints`는 0이 됩니다.

**지원 중단됨 (Deprecated):**
* [PC] `participant.attributes.stats.rankPoints`

## v7.1.0
**새로운 데이터 (New Data):**
* [PC] `LogPlayerAttack.fireWeaponStackCount` 추가
* 이제 `platform-region` 외에 플랫폼별로도 `/seasons` 엔드포인트를 쿼리할 수 있습니다.

## v7.0.0
**새로운 데이터 (New Data):**
* [Xbox] 남미 지역에 대해 새로운 `xbox-sa` 리전 추가
* `status.data.type`, `status.data.id` 추가

**제거됨 (Removed):**
* `status.id`, `status.attributes` 제거

## v6.0.0
**새로운 데이터 (New Data):**
* [PC] `participant.attributes.stats.rankPoints`, `match.attributes.seasonState`, `LogMatchDefinition.SeasonState`, `playerSeason.attributes.gameModeStats.{gameMode}.bestRankPoint`, `playerSeason.attributes.gameModeStats.{gameMode}.dailyWins`, `playerSeason.attributes.gameModeStats.{gameMode}.rankPoints`, `playerSeason.attributes.gameModeStats.{gameMode}.swimDistance`, `playerSeason.attributes.gameModeStats.{gameMode}.weeklyWins`

**데이터 변경 사항 (Data Changes):**
* [PC] 10월 3일 이후의 매치 및 시즌 스탯은 글로벌 및 플랫폼별로 분류(shard)됩니다. 10월 3일 이전의 PC 데이터와 Xbox 데이터는 이전 URL 형식을 사용하여 계속 액세스할 수 있습니다.
* [PC] `division.bro.official.2018-09` 이후의 PC 시즌은 `division.bro.official.{Year-Month}`가 아닌 `division.bro.official.pc-{Year-Season number}` 형식입니다. 첫 시즌은 `division.bro.official.pc-2018-01`입니다.

**지원 중단됨 (Deprecated):**
* [PC] `participant.attributes.stats.killPoints`, `participant.attributes.stats.killPointsDelta`, `participant.attributes.stats.winPoints`, `participant.attributes.stats.winPointsDelta`, `playerSeason.attributes.gameModeStats.{gameMode}.killPoints`, `playerSeason.attributes.gameModeStats.{gameMode}.winPoints`

## v5.0.3
**버그 수정 (Bug Fix):**
* `/players/{accountId}/seasons/{seasonId}` 엔드포인트는 이제 플레이어가 해당 시즌 동안 플레이하지 않은 경우 404 오류 대신 빈 시즌 스탯을 반환합니다.

## v5.0.2
**버그 수정 (Bug Fixes):**
* [PC] 단일 원격 측정 파일 내에 중복된 `attackIds`가 존재하던 문제 수정
* [PC] 기절 상태에서의 킬에서 `killDistance`가 항상 정확하지 않던 문제 수정
* [PC] `LogPlayerTakeDamage` 이벤트에서 공격자의 체력과 위치가 이제 "0"이 아닌 다른 값을 표시합니다.

## v5.0.1
**버그 수정 (Bug Fix):**
* `/players/{accountId}/seasons/{seasonId}` 엔드포인트는 플레이어가 해당 시즌 동안 플레이하지 않은 경우 시즌 스탯에 대해 404 오류를 반환합니다.

## v5.0.0
**데이터 변경 사항 (Data Changes):**
* Match 객체의 `attributes.gameMode`에 커스텀 매치의 스쿼드 규모 및 시점이 추가됩니다. 예: `normal` -> `normal-squad-fpp`

## v4.0.0
**데이터 변경 사항 (Data Changes):**
* 원격 측정(Telemetry) 데이터가 gzip을 사용하여 압축됩니다.

## v3.2.0
**새로운 데이터 (New Data):**
* [Xbox] `Common`, `LogPlayerKill.damageReason`, `LogSwimEnd.swimDistance`, `LogWheelDestroy`

## v3.1.0
**새로운 데이터 (New Data):**
* 토너먼트(Tournaments) 엔드포인트 및 매치

## v3.0.0
**데이터 변경 사항 (Data Changes):**
* `LogPlayerTakeDamage` 이벤트의 빈 attacker 객체는 빈 값 대신 `null`이 됩니다.
* `LogPlayerAttack` 이벤트의 빈 vehicle 객체는 빈 값 대신 `null`이 됩니다.

## v2.0.0
**버그 수정 (Bug Fixes):**
* `participant.attributes.stats.timeSurvived` – int -> number
* `participant.attributes.stats.longestKill` – int -> number

**지원 중단됨 (Deprecated):**
* `player.attributes.createdAt`
* `player.attributes.updatedAt`

**제거됨 (Removed):**
* `(any).common.mapName` (LogMatchStart에서 사용 가능)
* `(any).common.matchId` (LogMatchDefinition에서 사용 가능)
* `(any)._V`
* `LogPlayerLogin.errorMessage`
* `LogPlayerLogin.result`

## v1.4.0
**새로운 데이터 (New Data):**
* `LogPlayerMakeGroggy`, `LogPlayerRevive`
* [PC] `LogWheelDestroy`, `LogSwimEnd.swimDistance`, `LogPlayerKill.damageReason`, `LogMatchStart.isCustomGame`, `LogMatchStart.isEventMode`

## v1.3.1
**버그 수정 (Bug Fixes):**
* 로스터(Rosters)에 가장 높은 참가자 순위가 표시됩니다.
* 7일 동안 플레이하지 않은 기존 플레이어의 경우 더 이상 404를 찾을 수 없음 오류가 반환되지 않습니다.

## v1.3.0
**새로운 데이터 (New Data):**
* 커스텀 매치 데이터
* `match.attributes`에 `isCustomMatch` 불리언(boolean) 플래그 추가
* [Xbox] `participant.attributes.stats`에 `swimDistance` 추가 (Xbox에 표시되지만 항상 0임)
* [Xbox] `LogSwimStart` 및 `LogSwimEnd` 원격 측정 이벤트 추가
* [Xbox] `LogArmorDestroy` 원격 측정 이벤트 추가
* [Xbox] `LogVehicleLeave` 원격 측정 이벤트에 `rideDistance` 및 `seatIndex` 필드 추가
* [Xbox] `LogVehicleRide` 원격 측정 이벤트에 `seatIndex` 추가

## v1.2.0
**새로운 데이터 (New Data):**
* [PC] `participant.attributes.stats`에 `swimDistance` 추가 (Xbox에 표시되지만 항상 0임)
* [PC] `LogSwimStart` 및 `LogSwimEnd` 원격 측정 이벤트 추가
* [PC] `LogArmorDestroy` 원격 측정 이벤트 추가
* [PC] `LogVehicleLeave` 원격 측정 이벤트에 `rideDistance` 및 `seatIndex` 필드 추가
* [PC] `LogVehicleRide` 원격 측정 이벤트에 `seatIndex` 추가

## v1.1.1
**버그 수정 (Bug fixes):**
* `participant.attributes.stats.killStreaks`가 이제 올바르게 채워집니다.
* `participant.attributes.stats.weaponsAcquired`가 이제 올바르게 채워집니다.

## v1.1.0
**버그 수정 (Bug fixes):**
* [Xbox] 이제 원격 측정 데이터의 키가 소문자입니다.
* [Xbox] PC 매치에 비해 매치가 더 이상 지연되지 않습니다.

**새로운 데이터 (New Data):**
* [Xbox] 이제 매치 기록에 `mapName`이 포함됩니다.
