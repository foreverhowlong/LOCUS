import { useBookStore, TOCItem } from '../store/useBookStore'
import { X } from 'lucide-react'

interface TableOfContentsProps {
  onNavigate: (href: string) => void
}

const renderTocItems = (items: TOCItem[], onNavigate: (href: string) => void, level: number = 0) => {
  return (
    <ul className={`pl-${level * 4}`}>
      {items.map((item) => (
        <li key={item.id} className="py-1">
          <button
            onClick={() => onNavigate(item.href)}
            className="text-charcoal hover:text-indigo-muted text-left w-full font-serif text-lg transition-colors"
            style={{ fontSize: `${1.1 - level * 0.1}rem` }} // Slightly smaller for sub-levels
          >
            {item.label}
          </button>
          {item.subitems && item.subitems.length > 0 && (
            renderTocItems(item.subitems, onNavigate, level + 1)
          )}
        </li>
      ))}
    </ul>
  )
}

export function TableOfContents({ onNavigate }: TableOfContentsProps) {
  const { toc, isTocOpen, setTocOpen } = useBookStore()

  if (!isTocOpen || toc.length === 0) return null

  return (
    <div 
      className="absolute top-0 left-0 w-[65%] h-full bg-porcelain shadow-xl z-40 transition-transform duration-300 ease-out p-8 overflow-y-auto"
      style={{ transform: isTocOpen ? 'translateX(0)' : 'translateX(-100%)' }}
    >
      <h2 className="font-serif text-3xl font-light text-charcoal mb-6">Navigator's Map</h2>
      <div className="border-t border-b border-stone-300/50 py-4">
        {renderTocItems(toc, onNavigate)}
      </div>
      <button 
        onClick={() => setTocOpen(false)} 
        className="absolute top-4 right-4 text-stone-500 hover:text-charcoal transition-colors"
      >
        <X size={24} />
      </button>
    </div>
  )
}
