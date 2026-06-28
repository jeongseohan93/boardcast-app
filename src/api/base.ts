/**
 * [API 기반 설정]
 *
 * 모든 도메인 API 모듈이 공유하는 axios 인스턴스를 생성하고 설정한다.
 *
 * baseURL:
 *   Electron에서 window.location.hostname은 'localhost'로 고정되지 않을 수 있어
 *   런타임에서 동적으로 읽는다. 서버는 항상 포트 3001에서 실행된다.
 *
 * 인터셉터:
 *   API 에러가 발생하면 콘솔에 [상태코드, URL, 응답 바디]를 출력하고
 *   Promise.reject로 다시 throw해 호출 측이 catch할 수 있게 한다.
 *   성공 응답은 그대로 통과.
 */

import axios from 'axios'

const host = typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'

/** 로컬 Express 서버 베이스 URL */
export const BASE_URL = `http://${host}:3001`

/**
 * 공용 axios 인스턴스.
 * 모든 도메인 API 파일은 이 인스턴스를 import해서 사용한다.
 */
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('[API]', err.response?.status, err.config?.url, err.response?.data)
    return Promise.reject(err)
  }
)
