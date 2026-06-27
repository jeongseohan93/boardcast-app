# 샘플 (SAMPLES)

**참고:** 샘플링 비율은 플랫폼마다 독립적이며 어떠한 시간 간격에도 일정하지 않습니다.

## 서버 (Server)
* **기본 URL:** `https://api.pubg.com/shards/{platform}`
* **계산된 URL 예시:** `https://api.pubg.com/shards/steam`

### 서버 변수 (Server Variables)
* `platform`: `console`, `kakao`, `steam`

---

## 샘플 (SAMPLES)

### `GET /samples`
샘플 매치 목록을 가져옵니다.

---

## 모델 (Models)

### 샘플 객체 (Sample Object)
샘플 객체는 매치의 ID를 포함합니다.
* `type` *(string)*: 이 객체 유형의 식별자 (`"match"`)
* `id` *(string)*: 매치 ID - `/matches` 엔드포인트에서 전체 매치 객체를 조회하는 데 사용됩니다.
