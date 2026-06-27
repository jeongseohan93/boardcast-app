# 알려진 문제 (Known Issues)

다음은 저희가 파악하고 있는 API 문제 목록입니다. 여기에 나열되지 않은 버그를 발견하시면 [pubgapi@pubg.com](mailto:pubgapi@pubg.com)으로 이메일을 보내 신고해 주세요.

*참고: 이 페이지에서는 이러한 문제에 대한 진행 상황(업데이트)을 제공하지 않습니다. 문제가 해결되면 이 페이지에서 제거되고 변경 로그(changelog)에 추가됩니다.*

---

## 철자 오류 (Misspellings)
원격 측정(telemetry) 데이터에서 다음 항목들의 철자가 잘못 입력되었습니다.
* `Item.ItemID: Cowbar_C`
* `Item.ItemID: ItemAmmo12GuageC`
* `Vehicle.FeulPercent`
* `ItemPackage.itemPackageId.Carapackage_RedBox_C`
* `damageReason.SimlateAIBeKilled`

## 시즌 스탯 누락 (Missing Season Stats)
* **[PC]** `division.bro.official.2018-04` 이전 시즌의 데이터는 사용할 수 없습니다.

## 투척 무기에 대한 로그 이벤트 누락 (Missing Log Events for Throwable Items)
* 버려진(dropped) 수류탄 및 연막탄의 수가 획득한(picked up) 아이템의 수를 초과하는 경우가 가끔 발생할 수 있습니다.

## 스콜피온 및 플레어건의 하위 카테고리 오류 (Item_Weapon_vz61Skorpion_C and Item_Weapon_FlareGun_C are listed with the subCategory "Main")
* 로그 이벤트의 원격 측정에서 `Item_Weapon_vz61Skorpion_C` 및 `Item_Weapon_FlareGun_C`의 `subCategory`가 "Handgun"이 아닌 "Main"으로 표시됩니다.

## participant 객체의 거리 값 부정확 (Inaccurate Values for "swimDistance", "rideDistance", and "walkDistance" in the participant object)
* 플레이어의 `participant.attributes.stats`에 있는 거리 값(`swimDistance`, `rideDistance`, `walkDistance`)이 `GameResult` 객체의 값과 다를 때가 있습니다. 이 경우 `GameResult`의 값을 정확한 것으로 간주해야 합니다. 
* `GameResult` 객체는 `LogPlayerKillV2.victimGameResult` 및 `LogMatchEnd.results.gameResultOnFinished`에서 찾을 수 있습니다.
