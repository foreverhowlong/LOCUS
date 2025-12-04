import { useEffect, useState } from 'react'
import { useSettingsStore } from '../store/useSettingsStore'
import { X, Key, Save } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { apiKey, provider, customBaseUrl, customModelName, geminiModelName, setApiKey, setProvider, setCustomConfig, setGeminiModel, loadSettings } = useSettingsStore()
  const [inputKey, setInputKey] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini' | 'anthropic' | 'custom'>('gemini')
  const [baseUrl, setBaseUrl] = useState('')
  const [modelName, setModelName] = useState('')
  const [geminiModel, setGeminiModelInput] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadSettings()
      setInputKey(apiKey || '')
      setSelectedProvider(provider)
      setBaseUrl(customBaseUrl || '')
      setModelName(customModelName || '')
      setGeminiModelInput(geminiModelName || 'gemini-1.5-flash')
    }
  }, [isOpen, apiKey, provider, customBaseUrl, customModelName, geminiModelName, loadSettings])

  const handleSave = async () => {
    await setApiKey(inputKey)
    await setProvider(selectedProvider)
    if (selectedProvider === 'custom') {
      await setCustomConfig(baseUrl, modelName)
    }
    if (selectedProvider === 'gemini') {
      await setGeminiModel(geminiModel)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-[400px] rounded-xl bg-white p-8 shadow-2xl ring-1 ring-stone-200 animate-in zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-charcoal">
             <Key size={20} />
             <h2 className="font-serif text-xl font-medium">API Configuration</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-charcoal">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
           {/* Provider Selection */}
           <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">LLM Provider</label>
              <div className="grid grid-cols-2 gap-2">
                {(['openai', 'gemini', 'anthropic', 'custom'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedProvider(p)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium capitalize transition-all
                      ${selectedProvider === p 
                        ? 'border-indigo-muted bg-indigo-muted text-white shadow-sm' 
                        : 'border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 hover:bg-stone-100'
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
           </div>

           {/* Gemini Config */}
           {selectedProvider === 'gemini' && (
             <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Gemini Model</label>
                <input 
                  type="text" 
                  value={geminiModel}
                  onChange={(e) => setGeminiModelInput(e.target.value)}
                  placeholder="gemini-1.5-flash"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 font-sans text-sm text-charcoal placeholder:text-stone-400 focus:border-indigo-muted focus:outline-none focus:ring-1 focus:ring-indigo-muted"
                />
             </div>
           )}

           {/* Custom Provider Config */}
           {selectedProvider === 'custom' && (
             <div className="space-y-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Base URL</label>
                  <input 
                    type="text" 
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="w-full rounded border border-stone-300 px-2 py-1 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Model Name</label>
                  <input 
                    type="text" 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="llama3, mistral, etc."
                    className="w-full rounded border border-stone-300 px-2 py-1 text-xs"
                  />
                </div>
             </div>
           )}

           {/* API Key Input */}
           <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">API Key</label>
              <input 
                type="password" 
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={`Enter your ${selectedProvider} key`}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-2 font-sans text-sm text-charcoal placeholder:text-stone-400 focus:border-indigo-muted focus:outline-none focus:ring-1 focus:ring-indigo-muted"
              />
              <p className="text-[10px] text-stone-400">
                Your key is stored locally on your device via secure storage.
              </p>
           </div>

           {/* Save Button */}
           <button 
             onClick={handleSave}
             className="flex w-full items-center justify-center space-x-2 rounded-lg bg-charcoal px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-stone-800 transition-all hover:shadow-md"
           >
             <Save size={16} />
             <span>Save Configuration</span>
           </button>
        </div>
      </div>
    </div>
  )
}
