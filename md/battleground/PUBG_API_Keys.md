# API 키 (API Keys)

## 인증 (Authorization)
요청 시 `Authorization` 헤더를 통해 JSON Web Token(JWT)을 함께 보내야 합니다. API에 등록할 때 자동으로 생성되므로 JWT를 수동으로 만들 필요가 없습니다. [https://developer.pubg.com](https://developer.pubg.com)에 가입하여 분당 10회 요청 제한(rate limit)이 있는 무료 API 키를 받으세요. 속도 제한에 대한 자세한 내용은 Rate Limits(속도 제한) 페이지에서 확인할 수 있습니다.

JWT는 `Authorization` 헤더에 Bearer 토큰으로 전달되며 다음과 같은 형태입니다.
```http
Authorization: Bearer <api-key>
```

## 보안 고려 사항 (Security Considerations)
웹사이트/웹 애플리케이션을 개발할 때 API 키를 클라이언트 측(Client-side)에 저장해서는 절대 안 된다는 점을 명심하세요. API 호출은 반드시 안전한 서버 측(Server-side) 애플리케이션에서만 이루어져야 합니다.

## 타이틀 (Titles)
요청에 대한 TitleID(타이틀 ID)는 API 키에 의해 결정되며 `Authorization` 헤더를 통해 자동으로 전송됩니다. 일부 객체에는 반환된 데이터와 관련된 게임 타이틀을 명시하는 `titleID` 필드가 포함될 수 있습니다.
