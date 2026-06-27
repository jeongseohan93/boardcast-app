markdown_content = """# 치지직 Webhook Event 가이드

치지직 Webhook을 이용하여 이벤트 알림(Notification Message)을 받는 방법을 안내하기 위한 가이드 문서입니다.

---

## 1.1 Event Subscription

이벤트 발생 알림을 받기 위해 이벤트를 구독할 수 있는 기능을 제공합니다.  
Webhook을 이용하여 이벤트 알림(Notification Message)을 받는 방법을 우선적으로 제공하고 있습니다.  
치지직 개발자 센터 사용 신청과 이벤트 알림을 받을 Webhook URL 등록이 완료되어 있는지 확인해 주세요.

---

## 1.2 Handling Webhook Event

POST 요청을 통해 등록된 Webhook URL로 이벤트가 전송됩니다.

* **HTTPS 필수:** Webhook URL은 반드시 SSL 사용과 443 port가 열려있어야 합니다.
* **빠른 응답 필요:** Webhook POST 요청 응답은 반드시 수 초 이내에 응답이 전달되어야 하며, 메시지 발송이 제대로 처리되지 않았다고 판단되면 최대 3번의 메시지 재발송이 이루어집니다. (자세한 retry 관련 설명은 [1.4.1 Retry Policy](#141-retry-policy) 참조)
* **상태 코드:** Webhook POST 요청 응답 상태 코드는 `2XX` 형태의 코드여야 합니다. 그 외는 모두 실패로 간주합니다.

### 1.2.1 Request Header

| Header | Description |
| :--- | :--- |
| **Chzzk-Event-Message-Id** | 메시지 식별자 ID |
| **Chzzk-Event-Message-Timestamp** | 메시지 발송 시각 UTC datetime (RFC 3339) |
| **Chzzk-Event-Message-Signature** | HMAC signature, 치지직에서 보낸 메시지가 맞는지 검증 용도로 사용 필요 |
| **Chzzk-Event-Message-Type** | message type 유형 (현재 `notification` 값으로만 제공) |
| **Chzzk-Event-Message-Data-Type** | 이벤트 데이터 유형 (참조 : [1.3 Event Types](#13-event-types)) |
| **Chzzk-Event-Message-Version** | message 형식 버전 (`message.version` 값과 일치, 참조 : [1.2.2 Notification Message](#122-notification-message)) |
| **Chzzk-Event-Message-Data-Version** | eventType에 따른 data 형식 버전 (`message.event.version` 값과 일치, 참조 : [1.2.2 Notification Message](#122-notification-message)) |
| **Chzzk-Event-Message-Retry** | 이벤트 재발송 횟수<br>정상적인 경우 보통 한 번의 메시지만 발송하지만, 알림을 수신받는 곳에서 정상적으로 응답하지 않는다고 판단했을 경우 다시 한번 이벤트를 재발송함. `Chzzk-Event-Message-Id` 헤더에 같은 id의 메시지가 여러 차례 재발송될 수 있음 (참조 : [1.4.1 Retry Policy](#141-retry-policy))<br>*Note: 재발송 경우에만 Retry 헤더를 전달함* |

### 1.2.2 Notification Message

Webhook URL로 POST 요청을 전송하게 됩니다. Request body를 JSON parsing 하여 사용합니다.  
JSON parsing을 완료할 경우 다음과 같은 형태의 메시지를 응답받습니다.

#### 예) 메시지 형태
* **Chzzk-Event-Message-Type:** `notification`