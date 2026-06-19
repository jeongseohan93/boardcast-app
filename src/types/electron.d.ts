export {}

declare global {
  interface Window {
    electronAPI: {
      openOAuthWindow: (url: string) => Promise<void>
      onOAuthCode: (callback: (code: string, state: string) => void) => void
      removeOAuthListener: () => void
      openExternal: (url: string) => Promise<void>
      showNotification: (title: string, body: string) => Promise<void>
      secureStore: {
        set: (key: string, value: string) => Promise<void>
        get: (key: string) => Promise<string | null>
        delete: (key: string) => Promise<void>
      }
      store: {
        set: (key: string, value: unknown) => Promise<void>
        get: (key: string) => Promise<unknown>
        delete: (key: string) => Promise<void>
      }
      getVersion: () => Promise<string>
      getServerPort: () => Promise<number>
      addFirewallRule: () => Promise<{ ok: boolean; error?: string }>
    }
  }
}
