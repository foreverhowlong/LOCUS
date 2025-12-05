import { useEffect, useRef, useState, useCallback } from 'react'
import ePub from 'epubjs'
import type { Book, Rendition } from 'epubjs'
import { useBookStore } from '../store/useBookStore'
import { ChevronLeft, ChevronRight, BookOpen, X, List, Settings, Sparkles, Send } from 'lucide-react'
import { ActionMenu } from './ActionMenu'
import { TableOfContents } from './TableOfContents'
import { SettingsModal } from './SettingsModal'
import { streamAIResponse } from '../services/AIService'
import { getLensPrompt, SYSTEM_PROMPT_BASE } from '../services/PromptEngineering'
import { useSettingsStore } from '../store/useSettingsStore'
// @ts-ignore
import ReactMarkdown from 'react-markdown'
// @ts-ignore
import remarkGfm from 'remark-gfm'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function Reader() {
  const { 
    bookData, setMetadata, setLocation, metadata, 
    setSelection, setLens, activeLens, activeSelection,
    setToc, isTocOpen, setTocOpen 
  } = useBookStore()
  
  const { apiKey, provider, customBaseUrl, customModelName, geminiModelName } = useSettingsStore()
  
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [isSettingsOpen, setSettingsOpen] = useState(false)
  
  // AI & Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [streamingContent, setStreamingContent] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [userInput, setUserInput] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory, streamingContent])
  
  // Helper to call AI Service
  const callAI = async (messages: ChatMessage[]) => {
      if (!apiKey) return
      setIsAiLoading(true)
      setStreamingContent('')
      
      const systemPrompt = SYSTEM_PROMPT_BASE
      
      const request = {
          provider,
          apiKey,
          baseUrl: customBaseUrl,
          model: provider === 'custom' ? customModelName : geminiModelName,
          systemPrompt,
          messages: messages
      }

      let fullResponse = ''
      try {
          for await (const chunk of streamAIResponse(request)) {
              setStreamingContent(prev => prev + chunk)
              fullResponse += chunk
          }
          // Append complete assistant message to history
          setChatHistory(prev => [...prev, { role: 'assistant', content: fullResponse }])
          setStreamingContent('')
      } catch (e) {
          console.error(e)
          setChatHistory(prev => [...prev, { role: 'assistant', content: "Error connecting to the Passionate Professor." }])
      } finally {
          setIsAiLoading(false)
      }
  }

  // Trigger AI when Lens is selected
  useEffect(() => {
    if (activeLens && activeSelection && apiKey) {
       // Start new session
       const prompt = getLensPrompt(activeLens, activeSelection.text, metadata?.title || 'Unknown Book')
       const initialMessage: ChatMessage = { role: 'user', content: prompt }
       
       setChatHistory([initialMessage])
       callAI([initialMessage])
    } else if (activeLens && !apiKey) {
        setChatHistory([{ role: 'assistant', content: "Please configure your API Key in Settings to consult the Professor." }])
    }
  }, [activeLens, activeSelection, apiKey, provider, customBaseUrl, customModelName, geminiModelName, metadata])

  const handleSendMessage = async () => {
      if (!userInput.trim() || isAiLoading) return
      
      const newUserMsg: ChatMessage = { role: 'user', content: userInput }
      const newHistory = [...chatHistory, newUserMsg]
      
      setChatHistory(newHistory)
      setUserInput('')
      
      await callAI(newHistory)
  }

  useEffect(() => {
    if (!bookData || !viewerRef.current) return
    console.log('Initializing Reader with book data...')

    // Initialize Book
    const book = ePub(bookData as ArrayBuffer)
    bookRef.current = book

    // Render
    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      manager: 'default',
      allowScriptedContent: true, 
    })
    renditionRef.current = rendition

    // Display
    rendition.display().then(() => {
        console.log('Book rendered successfully')
    }).catch(err => {
        console.error('Error rendering book:', err)
    })

    // Theme / Styling
    rendition.themes.register('neoclassic', {
      body: { 
        'font-family': '"Crimson Pro", serif', 
        'color': '#333333',
        'background-color': '#F9F7F1',
        'user-select': 'auto'
      },
      '::selection': {
        'background': '#E6E8EB',
        'color': '#333333'
      }
    })
    rendition.themes.select('neoclassic')

    book.loaded.metadata.then((meta) => {
      setMetadata({
        title: meta.title,
        creator: meta.creator,
        language: meta.language,
      })
    })

    // Get Navigation (TOC)
    book.loaded.navigation.then((navigation) => {
      setToc(navigation.toc)
    })

    // --- Event Handling Refactor ---

    // We use hooks to attach listeners directly to the iframe document
    rendition.hooks.content.register((contents: any) => {
        const doc = contents.document
        
        // 1. Selection Handling (Fix Flickering)
        // Listen for mouseup to detect end of selection drag
        doc.addEventListener('mouseup', (_: MouseEvent) => {
            const selection = doc.getSelection()
            
            // If we have a valid text selection
            if (selection && selection.toString().trim().length > 0) {
                 const range = selection.getRangeAt(0)
                 const rect = range.getBoundingClientRect()
                 const iframe = viewerRef.current?.querySelector('iframe')
                 
                 if (iframe) {
                    const iframeRect = iframe.getBoundingClientRect()
                    
                    // Calculate position
                    setMenuPos({
                      x: rect.left + iframeRect.left + rect.width / 2,
                      y: rect.top + iframeRect.top
                    })
                    
                    // Get CFI for persistence
                    const cfi = contents.cfiFromRange(range)
                    
                    setSelection({
                      cfi: cfi,
                      text: selection.toString()
                    })
                    
                    setLens(null)
                 }
            } else {
                // If clicked without selecting, clear menu
                setMenuPos(null)
            }
        })

        // 2. Keyboard Navigation (Fix Focus Trap)
        // Forward key events from iframe to main window handler
        doc.addEventListener('keydown', (e: KeyboardEvent) => {
            // Custom event to bubble up or just call handler directly if accessible
            // We'll dispatch to main window
            const event = new KeyboardEvent('keydown', {
                key: e.key,
                code: e.code,
                bubbles: true,
                cancelable: true
            })
            document.dispatchEvent(event)
        })
    })

    rendition.on('relocated', (location: any) => {
      setLocation(location.start.cfi)
      setMenuPos(null)
    })

    return () => {
      if (book) {
        book.destroy()
      }
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [bookData, setMetadata, setLocation, setSelection, setLens, setToc])

  // Updated Global Key Handler
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Input Guard
    const activeTag = document.activeElement?.tagName
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
      return
    }

    if (renditionRef.current) {
      if (event.key === 'ArrowLeft') {
        renditionRef.current.prev()
      } else if (event.key === 'ArrowRight') {
        renditionRef.current.next()
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => {
        window.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  const handleLensSelect = (lens: string) => {
    setLens(lens)
    setMenuPos(null)
  }
  
  const clearLens = () => {
      setLens(null)
      setSelection(null)
      setChatHistory([])
      setStreamingContent('')
  }

  const prevPage = () => renditionRef.current?.prev()
  const nextPage = () => renditionRef.current?.next()

  const handleTocNavigate = (href: string) => {
    renditionRef.current?.display(href)
    setTocOpen(false) 
  }

  // Updated Lantern Logic
  const handleLantern = async () => {
      if (!renditionRef.current) return
      
      try {
          // Get current visible range
          const visibleRange = renditionRef.current.getRange(renditionRef.current.location.start.cfi)
          let textContext = ""
          
          if (visibleRange) {
             textContext = visibleRange.toString()
          }
          
          // Fallback: specific to epubjs if range is tricky
          if (!textContext || textContext.length < 50) {
             // Try getting text from the view manager
             // @ts-ignore
             const contents = renditionRef.current.getContents()[0]
             if (contents) {
                 textContext = contents.document.body.innerText
             }
          }

          setSelection({
              cfi: renditionRef.current.location.start.cfi,
              text: textContext || "Page Context"
          })
          setLens('discovery')
          
      } catch (e) {
          console.error("Error getting text for Lantern:", e)
      }
  }


  return (
    <div className="flex h-screen w-full bg-porcelain overflow-hidden">
      {/* Reader Area - 65% */}
      <div className="relative h-full w-[65%] flex flex-col border-r border-stone-300/50 shadow-sm transition-all duration-500 ease-in-out">
          {/* Header */}
          <div className="flex h-12 w-full items-center justify-between px-6 pt-4 text-stone-500">
             <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setTocOpen(!isTocOpen)} 
                  className="rounded-full p-1 hover:bg-stone-200/50 hover:text-charcoal transition"
                  title="Table of Contents"
                >
                  <List size={20} />
                </button>
                <button 
                  onClick={() => setSettingsOpen(true)} 
                  className="rounded-full p-1 hover:bg-stone-200/50 hover:text-charcoal transition"
                  title="Settings"
                >
                  <Settings size={20} />
                </button>
                <div className="h-4 w-px bg-stone-300 mx-2" />
                <BookOpen size={16} />
                <span className="font-sans text-xs font-medium tracking-wide uppercase truncate max-w-[200px]">
                  {metadata?.title || 'Loading...'}
                </span>
             </div>
          </div>

          {/* Viewer */}
          <div className="relative flex-1 w-full overflow-hidden">
             <div ref={viewerRef} className="h-full w-full px-12 pb-8" />
             
             <button 
                onClick={prevPage}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-stone-400 hover:bg-stone-200/50 hover:text-charcoal transition"
             >
               <ChevronLeft size={24} />
             </button>
             <button 
                 onClick={nextPage}
                 className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-stone-400 hover:bg-stone-200/50 hover:text-charcoal transition"
             >
               <ChevronRight size={24} />
             </button>
             
             {/* Lantern Discovery Button (Subtle) */}
             <button
                 onClick={handleLantern}
                 className="absolute bottom-4 right-6 z-30 flex items-center space-x-2 rounded-lg p-2 text-stone-400 hover:bg-stone-200/50 hover:text-indigo-muted transition-all duration-300 group"
                 title="Discovery Lens (Scan Page)"
             >
                 <span className="text-[10px] font-medium uppercase tracking-widest opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    Scan Page
                 </span>
                 <Sparkles size={18} className="opacity-70 group-hover:opacity-100" />
             </button>

             {/* Action Menu */}
             <ActionMenu position={menuPos} onSelect={handleLensSelect} />

             {/* Table of Contents */}
             <TableOfContents onNavigate={handleTocNavigate} />
             
             {/* Settings Modal */}
             <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
          </div>
      </div>

      {/* Sidebar - 35% */}
      <div className="h-full w-[35%] bg-[#F5F5F7] border-l border-white/50 flex flex-col shadow-inner">
         {/* Sidebar Content */}
         {activeLens && activeSelection ? (
             <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-100/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-muted bg-indigo-muted/10 px-2 py-1 rounded-md">
                            {activeLens}
                        </span>
                    </div>
                    <button onClick={clearLens} className="text-stone-400 hover:text-charcoal transition-colors p-1 hover:bg-stone-200 rounded-full">
                        <X size={16} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Selected Context Card */}
                    <div className="relative rounded-lg bg-white p-5 shadow-sm border border-stone-100">
                         <div className="absolute left-0 top-4 h-8 w-1 rounded-r-full bg-indigo-muted" />
                         <p className="font-serif text-lg leading-relaxed text-charcoal/90 italic pl-2">
                            "{activeSelection.text}"
                         </p>
                    </div>

                    {/* Chat History */}
                    <div className="space-y-6">
                        {chatHistory.map((msg, index) => (
                            (index === 0 && msg.role === 'user') ? null : (
                                <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[90%] ${msg.role === 'user' ? 'bg-stone-200 px-3 py-2 rounded-lg text-sm text-charcoal' : 'prose prose-stone prose-sm max-w-none font-sans text-charcoal prose-headings:font-serif prose-headings:font-medium prose-p:leading-relaxed prose-strong:text-indigo-muted prose-a:text-indigo-muted'}`}>
                                         {msg.role === 'user' ? (
                                             msg.content
                                         ) : (
                                             <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                             </ReactMarkdown>
                                         )}
                                    </div>
                                </div>
                            )
                        ))}
                        
                        {/* Streaming Content */}
                        {streamingContent && (
                             <div className="flex flex-col items-start">
                                <div className="prose prose-stone prose-sm max-w-none font-sans text-charcoal prose-headings:font-serif prose-headings:font-medium prose-p:leading-relaxed prose-strong:text-indigo-muted prose-a:text-indigo-muted">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {streamingContent}
                                    </ReactMarkdown>
                                </div>
                             </div>
                        )}

                        {isAiLoading && !streamingContent && (
                             <div className="flex items-center space-x-3 text-indigo-muted animate-pulse p-2">
                                <div className="h-2 w-2 rounded-full bg-indigo-muted" />
                                <span className="text-xs font-medium tracking-wide uppercase">Consulting the Codex...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>
                
                 {/* Input Area */}
                 <div className="p-4 bg-white border-t border-stone-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <div className="relative flex items-center">
                        <input 
                            type="text" 
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Ask a follow-up question..." 
                            className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 pr-10 font-sans text-sm text-charcoal placeholder:text-stone-400 focus:border-indigo-muted focus:outline-none focus:ring-1 focus:ring-indigo-muted transition-all"
                        />
                        <button 
                            onClick={handleSendMessage}
                            disabled={!userInput.trim() || isAiLoading}
                            className="absolute right-2 p-2 text-indigo-muted hover:bg-stone-100 rounded-full disabled:opacity-50 transition"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                 </div>
             </div>
         ) : (
             <div className="flex flex-col h-full p-10 items-center justify-center text-center space-y-6 opacity-60">
                <div className="p-4 bg-stone-200/50 rounded-full">
                  <BookOpen size={32} className="text-stone-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-serif text-xl font-medium text-charcoal">Marginalia</h2>
                  <p className="font-sans text-sm text-stone-500 max-w-[200px] mx-auto leading-relaxed">
                    Highlight text or use the Discovery Lens <Sparkles size={12} className="inline" /> to unlock the hermeneutic lenses.
                  </p>
                </div>
             </div>
         )}
      </div>
    </div>
  )
}