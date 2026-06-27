# CHZZK API - Authorization

치지직 Open API 사용과 인증에 관련된 문서입니다.
> ⚠️ **주의사항:** 가이드에 작성된 API 명세와 인증 플로우는 이후 개발 상황에 따라 변경될 수 있습니다.

---

## 1. 인증 코드 요청 및 발급

치지직 Access Token 발급을 위한 인증 코드(Authorization Code)를 요청합니다. 요청 `redirectUri`로 Access Token 발급을 위한 `code`와 `state`가 전달됩니다.

인증 코드를 요청할 도메인은 아래와 같으며, OPEN API와는 다른 별도의 도메인을 사용합니다.
> ⚠️ **주의사항:** 요청 `redirectUri`는 애플리케이션 등록 시 입력한 **로그인 리디렉션 URL**과 일치해야 합니다.

### URL Path
- **Method:** `GET`
- **URL:** `https://chzzk.naver.com/account-interlock`

### Request Parameters
| Key | Type | Required | Example | Description |
| :--- | :--- | :---: | :--- | :--- |
| `clientId` | String | * | `fefb6bbb-00c2-497c-afc2-XXXXXXXXXXXX` | 애플리케이션 클라이언트 ID |
| `redirectUri` | String | * | `http://localhost:8080/api/path` | 인증 코드를 전달받을 리디렉션 URL |
| `state` | String | * | `zxclDasdfA25` | 사이트 간 요청 위조(CSRF) 공격을 방지하기 위한 상태 토큰 |

### Response Parameters (Redirect URI로 전달됨)
| Key | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `code` | String | `ygKEQQk3p0DjUsBjJradJmXXXXXXXX` | Access Token 발급을 위한 인증 코드 (일회용) |
| `state` | String | `zxclDasdfA25` | 요청 시 전달한 `state` 값과 동일한 값 |

---

## 2. 치지직 Access Token 발급

Open API 사용 중, 유저 인증을 위한 토큰을 발급받습니다.
- **Access Token 만료기간:** 1일 (86,400초)
- **Refresh Token 만료기간:** 30일

### URL Path
- **Method:** `POST`
- **URL:** `/auth/v1/token`

### Request Body
| Key | Type | Required | Example | Description |
| :--- | :--- | :---: | :--- | :--- |
| `grantType` | String | * | `authorization_code` | 고정 값 |
| `clientId` | String | * | `fefb6bbb-00c2-497c-afc2-XXXXXXXXXXXX` | 애플리케이션 클라이언트 ID |
| `clientSecret` | String | * | `VeIMuc9XGle7PSxIVYNwPpI2OEk_9gXoW_XXXXXXXXX` | 애플리케이션 클라이언트 시크릿 |
| `code` | String | * | `ygKEQQk3p0DjUsBjJradJmXXXXXXXX` | 발급받은 인증 코드 |
| `state` | String | * | `zxclDasdfA25` | 인증 코드 요청 시 사용한 상태 토큰 |

### Response Body
| Key | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `accessToken` | String | `FFok65zQFQVcFvH2eJ7SS7SBFlTXt0EZ10L5XXXXXXXX` | API 호출 시 인증에 사용할 액세스 토큰 |
| `refreshToken` | String | `NWG05CKHAsz4k4d3PB0wQUV9ugGlp0YuibQ4XXXXXXXX` | 액세스 토큰 만료 시 재발급을 위한 리프레시 토큰 |
| `tokenType` | String | `Bearer` | 토큰 타입 (고정 값) |
| `expiresIn` | String | `86400` | 토큰 만료 시간 (초 단위, 1일) |

---

## 3. 치지직 Access Token 갱신

Access Token은 만료 주기를 가집니다. 해당 만료 주기가 지나면 해당 Access Token을 사용한 API 호출은 `401(INVALID_TOKEN)` 응답을 반환합니다.

Access Token이 만료되면, Refresh Token을 통하여 Access Token을 재발급받아 사용해야 합니다.
- **Refresh Token**은 Access Token보다 긴 만료기간을 가지며, **일회용**으로 사용됩니다.
- Refresh Token 또한 만료되면 Access Token 발급 과정(인증 코드 요청부터)을 통해 새로운 Access Token을 발급받아야 합니다.

### URL Path
- **Method:** `POST`
- **URL:** `/auth/v1/token`

### Request Body
| Key | Type | Required | Example | Description |
| :--- | :--- | :---: | :--- | :--- |
| `grantType` | String | * | `refresh_token` | 고정 값 |
| `refreshToken` | String | * | `NWG05CKHAsz4k4d3PB0wQUV9ugGlp0YuibQ4XXXXXXXX` | 이전에 발급받은 리프레시 토큰 |
| `clientId` | String | * | `fefb6bbb-00c2-497c-afc2-XXXXXXXXXXXX` | 애플리케이션 클라이언트 ID |
| `clientSecret` | String | * | `VeIMuc9XGle7PSxIVYNwPpI2OEk_9gXoW_XXXXXXXXX` | 애플리케이션 클라이언트 시크릿 |

### Response Body
| Key | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `accessToken` | String | `motTJ-NZ-fev3cmaTMydzYk_zyw524C9ZYdNXXXXXXXX` | 새로 발급된 액세스 토큰 |
| `refreshToken` | String | `EDpM_1RxiOwhbNBpNUbiuEZOrb7Dbd6Y7rivXXXXXXXX` | 새로 발급된 리프레시 토큰 (기존 토큰 폐기) |
| `tokenType` | String | `Bearer` | 토큰 타입 (고정 값) |
| `expiresIn` | String | `86400` | 토큰 만료 시간 (초 단위) |
| `scope` | String | `채널 조회` | 허용된 권한 범위 |

---

## 4. 치지직 Access Token 삭제

유저가 로그아웃하는 등, 해당 Access Token, Refresh Token의 revoke(폐기)가 필요할 경우 호출합니다. 
요청한 Token과 동일한 인증 과정을 거친 모든 Token이 제거됩니다. (`clientId`와 `user`가 동일한 Token)

### URL Path
- **Method:** `POST`
- **URL:** `/auth/v1/token/revoke`

### Request Body
| Key | Type | Required | Example | Description |
| :--- | :--- | :---: | :--- | :--- |
| `clientId` | String | * | `fefb6bbb-00c2-497c-afc2-XXXXXXXXXXXX` | 애플리케이션 클라이언트 ID |
| `clientSecret` | String | * | `VeIMuc9XGle7PSxIVYNwPpI2OEk_9gXoW_XXXXXXXXX` | 애플리케이션 클라이언트 시크릿 |
| `token` | String | * | `motTJ-NZ-fev3cmaTMydzYk_zyw524C9ZYdNXXXXXXXX` | 폐기할 토큰 (Access Token 또는 Refresh Token) |
| `tokenTypeHint` | String | | `access_token` 또는 `refresh_token` | 제공한 토큰의 유형 힌트 (기본값: `access_token`) |
