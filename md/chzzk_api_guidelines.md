# CHZZK API - 참고사항

치지직 개발자 센터 및 Open API 이용 시 알아야 할 규격을 설명합니다.

> ⚠️ **주의사항:** 최근 90일간 API Scope 사용량이 0인 애플리케이션은 삭제됩니다.

---

## 1. 애플리케이션 ID 및 이름

애플리케이션 등록 시 ID 및 이름에 'chzzk', '치지직', 'naver', '네이버' 등 공식 서비스명이 포함될 수 없습니다. 또한, 부적절한 단어가 포함될 경우 애플리케이션이 정지될 수 있으니 유의해 주세요.

---

## 2. Open API 도메인

```text
https://openapi.chzzk.naver.com
```

---

## 3. API 호출

특정 API Scope를 호출하려면 Access Token 또는 Client 인증이 필요합니다. Access Token 인증이 필요한 API Scope 호출 시 `Authorization` 헤더에 `Bearer`와 함께 Access Token을 지정해야 합니다.

> ⚠️ **주의사항:** Access Token 인증 API 사용 시 `Bearer`를 반드시 명시해야 하며, `Bearer`와 Access Token 사이에 **공백( )**을 빠뜨리지 않도록 주의해야 합니다.

### Access Token 인증 API (Request Header)
| Key | Type | Example |
| :--- | :--- | :--- |
| `Authorization` | String | `Bearer FFok65zQFQVcFvH2eJ7SS7SBFlTXt0EZ10L5XXXXXXXX` |
| `Content-Type` | String | `application/json` |

### Client 인증 API (Request Header)
| Key | Type | Example |
| :--- | :--- | :--- |
| `Client-Id` | String | `fefb6bbb-00c2-497c-afc2-XXXXXXXXXXXX` |
| `Client-Secret` | String | `VeIMuc9XGle7PSxIVYNwPpI2OEk_9gXoW_XXXXXXXXX` |
| `Content-Type` | String | `application/json` |

---

## 4. API 공통 응답 구조

### 성공 시
```json
{
    "code": 200,
    "message": null,
    "content": {
        "responseBody"
    }
}
```

### 실패 시
```json
{
    "code": "integer",
    "message": "string"
}
```

---

## 5. Error Code

| HTTP Code | Error Message | Description |
| :--- | :--- | :--- |
| `400` | 잘못된 값을 입력했습니다. | 요청 파라미터 에러 |
| `401` | `UNAUTHORIZED` | 필요 인증 정보 없음 |
| `401` | `INVALID_CLIENT` | Client 정보 비정상 |
| `401` | `INVALID_TOKEN` | 존재하지 않는 token, 기한 만료 <br> (Access Token, Refresh_token) <br> - 만료된 Access Token <br> - 만료된 Refresh Token <br> - Delete 요청된 Access Token <br> - 존재하지 않는 Token |
| `403` | `FORBIDDEN` | 호출 권한 없음 |
| `404` | `NOT_FOUND` | 검색 결과 없음 |
| `429` | `TOO_MANY_REQUESTS` | Quota 제한 초과 |
| `500` | `INTERNAL_SERVER_ERROR` | 서버 내부 에러 |
