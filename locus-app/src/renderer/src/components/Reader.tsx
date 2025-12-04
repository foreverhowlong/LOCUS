import { useEffect, useRef, useState } from 'react'
import ePub from 'epubjs'
import type { Book, Rendition } from 'epubjs'
import { useBookStore } from '../store/useBookStore'
import { ChevronLeft, ChevronRight, BookOpen, X } from 'lucide-react'
import { ActionMenu } from './ActionMenu'

export function Reader() {
  const { bookData, setMetadata, setLocation, metadata, setSelection, setLens, activeLens, activeSelection } = useBookStore()
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)

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
    }
  }, [bookData, setMetadata, setLocation, setSelection, setLens])

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

  return (
    <div className="flex h-screen w-full bg-porcelain overflow-hidden">
      {/* Reader Area - 65% */}
      <div className="relative h-full w-[65%] flex flex-col border-r border-stone-300/50 shadow-sm transition-all duration-500 ease-in-out">
          {/* Header */}
          <div className="flex h-12 w-full items-center justify-between px-6 pt-4 text-stone-500">
             <div className="flex items-center space-x-2">
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
          </div>
      </div>

      {/* Sidebar - 35% */}
      <div className="h-full w-[35%] bg-[#F5F5F7] border-l border-white/50 flex flex-col">
         {/* Sidebar Content */}
         {activeLens && activeSelection ? (
             <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between p-6 border-b border-stone-200 bg-white/50">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-muted bg-indigo-muted/10 px-2 py-1 rounded">
                            {activeLens}
                        </span>
                        <span className="text-xs text-stone-400">AI Analysis</span>
                    </div>
                    <button onClick={clearLens} className="text-stone-400 hover:text-charcoal">
                        <X size={16} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Selected Context */}
                    <div className="pl-4 border-l-2 border-indigo-muted/30">
                        <p className="font-serif text-lg italic text-charcoal/80">
                            "{activeSelection.text}"
                        </p>
                    </div>

                    {/* AI Response Placeholder */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2 text-indigo-muted">
                            <div className="h-2 w-2 rounded-full bg-indigo-muted animate-pulse" />
                            <span className="text-xs font-medium">The Professor is thinking...</span>
                        </div>
                        <div className="h-20 rounded bg-stone-200/50 animate-pulse" />
                        <div className="h-32 rounded bg-stone-200/50 animate-pulse" />
                    </div>
                </div>
                
                 {/* Input Area */}
                 <div className="p-4 bg-white border-t border-stone-200">
                    <input 
                        type="text" 
                        placeholder="Ask a follow-up question..." 
                        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 font-sans text-sm focus:border-indigo-muted focus:outline-none focus:ring-1 focus:ring-indigo-muted"
                    />
                 </div>
             </div>
         ) : (
             <div className="flex flex-col h-full p-8">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="font-serif text-lg font-medium text-charcoal">Marginalia</h2>
                </div>
                
                <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                    <p className="font-sans text-sm text-stone-500 italic text-center">
                    "Reading is a creative act."
                    </p>
                    <div className="mt-4 text-center">
                    <p className="text-xs text-stone-400">Highlight text to begin exegesis.</p>
                    </div>
                </div>
             </div>
         )}
      </div>
    </div>
  )
}