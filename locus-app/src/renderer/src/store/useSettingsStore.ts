import { create } from 'zustand'

interface SettingsState {
  apiKey: string | null
  provider: 'openai' | 'gemini' | 'anthropic' | 'custom'
  customBaseUrl: string | null
  customModelName: string | null
  geminiModelName: string | null // New field for Gemini Model
  setApiKey: (key: string) => Promise<void>
  setProvider: (provider: 'openai' | 'gemini' | 'anthropic' | 'custom') => Promise<void>
  setCustomConfig: (baseUrl: string, modelName: string) => Promise<void>
  setGeminiModel: (modelName: string) => Promise<void> // New setter
  loadSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  apiKey: null,
  provider: 'gemini',
  customBaseUrl: null,
  customModelName: null,
  geminiModelName: 'gemini-1.5-flash', // Default
  setApiKey: async (key) => {
    await window.api.setSettings('apiKey', key)
    set({ apiKey: key })
  },
  setProvider: async (provider) => {
    await window.api.setSettings('provider', provider)
    set({ provider })
  },
  setCustomConfig: async (baseUrl, modelName) => {
    await window.api.setSettings('customBaseUrl', baseUrl)
    await window.api.setSettings('customModelName', modelName)
    set({ customBaseUrl: baseUrl, customModelName: modelName })
  },
  setGeminiModel: async (modelName) => {
    await window.api.setSettings('geminiModelName', modelName)
    set({ geminiModelName: modelName })
  },
  loadSettings: async () => {
    const apiKey = await window.api.getSettings('apiKey')
    const provider = await window.api.getSettings('provider')
    const customBaseUrl = await window.api.getSettings('customBaseUrl')
    const customModelName = await window.api.getSettings('customModelName')
    const geminiModelName = await window.api.getSettings('geminiModelName')
    set({ 
      apiKey: apiKey || null, 
      provider: provider || 'gemini',
      customBaseUrl: customBaseUrl || null,
      customModelName: customModelName || null,
      geminiModelName: geminiModelName || 'gemini-1.5-flash'
    })
  },
}))
