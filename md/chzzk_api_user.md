markdown_content = """# CHZZK API - User (유저)

유저 API로 로그인 유저의 치지직 채널 정보를 조회할 수 있습니다.

> **참고:** 유저 API를 호출하려면 사용자 계정으로 인증하여 얻은 Access Token이 필요합니다.
> - **API Scope:** 유저 정보 조회

---

## 1. 유저 정보 조회

유저의 채널 정보를 조회할 수 있습니다.  
치지직의 모든 유저는 채널을 소유합니다. **채널 ID(`channelId`)**는 채널의 고유 식별자이며, **유저의 고유 식별자**로 사용할 수 있습니다.

### HTTP Request
- **Method:** `GET`
- **URL:** `/open/v1/users/me`

### Request Header
| Key | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | String | `Bearer FFok65zQFQVcFvH2eJ7SS7SBFlTXt0EZ10L5XXXXXXXX` | 발급받은 사용자 Access Token |
| `Content-Type` | String | `application/json` | 고정 |

### Response Body
| Key | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `channelId` | String | `909501f048b44cf0d5c1d28XXXXXXXX` | 유저의 채널 고유 식별자 (유저 식별자로 활용 가능) |
| `channelName` | String | `치지직유저 3121` | 유저의 채널 이름 (닉네임) |

---

### API 응답 예시 (공통 규격 포함)