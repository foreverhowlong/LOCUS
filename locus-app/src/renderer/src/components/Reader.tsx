import { useEffect, useRef, useState, useCallback } from 'react'
import ePub from 'epubjs'
import type { Book, Rendition } from 'epubjs'
import { useBookStore } from '../store/useBookStore'
import { ChevronLeft, ChevronRight, BookOpen, X, List, Settings } from 'lucide-react' // Added Settings icon
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
  
  const [aiResponse, setAiResponse] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  
  // Trigger AI when Lens is selected
  useEffect(() => {
    if (activeLens && activeSelection && apiKey) {
      const fetchAI = async () => {
        setIsAiLoading(true)
        setAiResponse('')
        
        const systemPrompt = SYSTEM_PROMPT_BASE
        const userPrompt = getLensPrompt(activeLens, activeSelection.text, metadata?.title || 'Unknown Book')
        
        const request = {
            provider,
            apiKey,
            baseUrl: customBaseUrl,
            model: provider === 'custom' ? customModelName : geminiModelName,
            systemPrompt,
            userPrompt
        }

        try {
            for await (const chunk of streamAIResponse(request)) {
                setAiResponse(prev => prev + chunk)
            }
        } catch (e) {
            console.error(e)
            setAiResponse("Error connecting to the Passionate Professor.")
        } finally {
            setIsAiLoading(false)
        }
      }
      fetchAI()
    } else if (activeLens && !apiKey) {
        setAiResponse("Please configure your API Key in Settings to consult the Professor.")
    }
  }, [activeLens, activeSelection, apiKey, provider, customBaseUrl, customModelName, geminiModelName, metadata])

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
      allowScriptedContent: true, // Allow scripts for interactivity
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


    // Selection Handling
    rendition.on('selected', (cfiRange: string, contents: any) => {
      const range = contents.range(cfiRange)
      const rect = range.getBoundingClientRect()
      const iframe = viewerRef.current?.querySelector('iframe')
      
      if (iframe) {
        const iframeRect = iframe.getBoundingClientRect()
        setMenuPos({
          x: rect.left + iframeRect.left + rect.width / 2,
          y: rect.top + iframeRect.top
        })
        
        setSelection({
          cfi: cfiRange,
          text: range.toString()
        })
        
        // Clear existing lens when new selection is made
        setLens(null)
      }
    })

    rendition.on('relocated', (location: any) => {
      setLocation(location.start.cfi)
      setMenuPos(null)
    })

    rendition.on('click', () => {
      setMenuPos(null)
    })

    return () => {
      if (book) {
        book.destroy()
      }
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [bookData, setMetadata, setLocation, setSelection, setLens, setToc])

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (renditionRef.current) {
      if (event.key === 'ArrowLeft') {
        renditionRef.current.prev()
      } else if (event.key === 'ArrowRight') {
        renditionRef.current.next()
      }
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  const handleLensSelect = (lens: string) => {
    setLens(lens)
    setMenuPos(null)
  }
  
  const clearLens = () => {
      setLens(null)
      setSelection(null)
      // Ideally clear selection in epubjs too: renditionRef.current?.getContents()[0].window.getSelection().removeAllRanges()
      // But accessing contents is tricky without reference.
  }

  const prevPage = () => renditionRef.current?.prev()
  const nextPage = () => renditionRef.current?.next()

  const handleTocNavigate = (href: string) => {
    renditionRef.current?.display(href)
    setTocOpen(false) // Close TOC after navigation
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

                    {/* AI Response */}
                    <div className="space-y-4">
                        {isAiLoading && !aiResponse && (
                             <div className="flex items-center space-x-3 text-indigo-muted animate-pulse p-2">
                                <div className="h-2 w-2 rounded-full bg-indigo-muted" />
                                <span className="text-xs font-medium tracking-wide uppercase">Consulting the Codex...</span>
                            </div>
                        )}
                        
                        {aiResponse ? (
                            <div className="prose prose-stone prose-sm max-w-none font-sans text-charcoal prose-headings:font-serif prose-headings:font-medium prose-p:leading-relaxed prose-strong:text-indigo-muted prose-a:text-indigo-muted hover:prose-a:text-indigo-600">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {aiResponse}
                                </ReactMarkdown>
                            </div>
                        ) : null}
                    </div>
                </div>
                
                 {/* Input Area */}
                 <div className="p-4 bg-white border-t border-stone-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <input 
                        type="text" 
                        placeholder="Ask a follow-up question..." 
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 font-sans text-sm text-charcoal placeholder:text-stone-400 focus:border-indigo-muted focus:outline-none focus:ring-1 focus:ring-indigo-muted transition-all"
                    />
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
                    Highlight text in the book to unlock the hermeneutic lenses.
                  </p>
                </div>
             </div>
         )}
      </div>
    </div>
  )
}