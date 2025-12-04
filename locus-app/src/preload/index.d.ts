import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getSettings: (key: string) => Promise<any>
      setSettings: (key: string, value: any) => Promise<void>
    }
  }
}
