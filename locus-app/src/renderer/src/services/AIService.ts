interface AIRequest {
  provider: 'openai' | 'gemini' | 'anthropic' | 'custom'
  apiKey: string | null
  baseUrl?: string | null
  model?: string | null
  systemPrompt: string
  userPrompt?: string
  messages?: { role: string; content: string }[]
}

export async function* streamAIResponse(request: AIRequest): AsyncGenerator<string, void, unknown> {
  const { provider, apiKey, baseUrl, model, systemPrompt, userPrompt, messages } = request

  if (!apiKey && provider !== 'custom') {
    yield "Error: API Key is missing. Please configure it in Settings."
    return
  }

  // Normalize messages
  const conversation = messages || []
  if (userPrompt) {
      conversation.push({ role: 'user', content: userPrompt })
  }

  try {
    if (provider === 'openai' || provider === 'custom') {
      yield* streamOpenAICompatible(apiKey || '', baseUrl, model, systemPrompt, conversation)
    } else if (provider === 'gemini') {
        yield* streamGemini(apiKey || '', model || 'gemini-1.5-flash', systemPrompt, conversation)
    } else if (provider === 'anthropic') {
        yield "Anthropic integration is coming soon."
    }
  } catch (error: any) {
    console.error("AI Service Error:", error)
    yield `

Error: ${error.message || "Failed to connect to AI provider."}`
  }
}

async function* streamOpenAICompatible(
  apiKey: string, 
  baseUrl: string | null | undefined, 
  model: string | null | undefined, 
  systemPrompt: string, 
  messages: { role: string; content: string }[]
): AsyncGenerator<string, void, unknown> {
  
  const url = baseUrl ? `${baseUrl}/chat/completions` : 'https://api.openai.com/v1/chat/completions'
  const targetModel = model || 'gpt-4o'

  const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
  ]

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: targetModel,
      messages: apiMessages,
      stream: true
    })
  })

  if (!response.ok) {
      const errText = await response.text()
      throw new Error(`API Error (${response.status}): ${errText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("Response body is not readable")

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') return
            try {
                const json = JSON.parse(data)
                const content = json.choices[0]?.delta?.content
                if (content) yield content
            } catch (e) {
                // Ignore parse errors for partial chunks
            }
        }
    }
  }
}

async function* streamGemini(apiKey: string, model: string, systemPrompt: string, messages: { role: string; content: string }[]): AsyncGenerator<string, void, unknown> {
    // For Gemini MVP, we will concatenate the conversation into a single prompt to ensure context is preserved
    // without handling the complex multi-turn JSON structure of the REST API yet.
    
    let fullPrompt = systemPrompt + "\n\n"
    for (const msg of messages) {
        fullPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`
    }
    fullPrompt += "ASSISTANT:"

    const staticUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const staticResponse = await fetch(staticUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
             contents: [{ parts: [{ text: fullPrompt }] }]
        })
    })
    
    if (!staticResponse.ok) {
         throw new Error(`Gemini API Error: ${staticResponse.status}`)
    }
    
    const data = await staticResponse.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) yield text
}
