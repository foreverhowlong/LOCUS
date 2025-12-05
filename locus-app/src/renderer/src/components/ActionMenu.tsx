import { useState } from 'react'
import { 
  PenLine, 
  Library, 
  Languages, 
  Hourglass, 
  Globe, 
  BrainCircuit, 
  Scaling, 
  MessageSquareQuote 
} from 'lucide-react'

interface ActionMenuProps {
  position: { x: number; y: number } | null
  onSelect: (lens: string) => void
}

export function ActionMenu({ position, onSelect }: ActionMenuProps) {
  const [hoveredLens, setHoveredLens] = useState<string | null>(null)

  if (!position) return null

  const lenses = [
    { id: 'note', label: 'Note', icon: PenLine, desc: "Write a personal note" },
    { id: 'intertextuality', label: 'Genealogy', icon: Library, desc: "Trace quotes, allusions, & references" },
    { id: 'philology', label: 'Roots', icon: Languages, desc: "Analyze etymology & original terms" },
    { id: 'history', label: 'Context', icon: Hourglass, desc: "Historical & political background" },
    { id: 'culture', label: 'Culture', icon: Globe, desc: "Mythology, art, & geography" },
    { id: 'logic', label: 'Logic', icon: BrainCircuit, desc: "Reconstruct arguments & premises" },
    { id: 'syntax', label: 'Syntax', icon: Scaling, desc: "Break down sentence structure" },
    { id: 'reception', label: 'Reception', icon: MessageSquareQuote, desc: "History of interpretation" },
  ]

  const activeDesc = lenses.find(l => l.id === hoveredLens)?.desc || "Select a lens to analyze text"

  return (
    <div 
       onMouseDown={(e) => e.preventDefault()}
       className="fixed z-50 flex flex-col overflow-hidden rounded-xl bg-charcoal p-2 shadow-2xl transition-all duration-200 ease-out border border-stone-700"
       style={{ 
         top: position.y + 20, // Position slightly below selection for better visibility
         // Clamp to screen width (Menu width approx 260px)
         left: Math.min(window.innerWidth - 280, Math.max(20, position.x - 130))
       }}
    >
       {/* Grid Layout */}
       <div className="grid grid-cols-2 gap-1 mb-2">
          {lenses.map((lens) => (
            <button
              key={lens.id}
              onClick={(e) => { e.stopPropagation(); onSelect(lens.id) }}
              onMouseEnter={() => setHoveredLens(lens.id)}
              onMouseLeave={() => setHoveredLens(null)}
              className="flex items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium text-stone-300 transition hover:bg-stone-700 hover:text-white text-left w-32"
            >
               <lens.icon size={14} className="shrink-0" />
               <span>{lens.label}</span>
            </button>
          ))}
       </div>

       {/* Info Footer */}
       <div className="border-t border-stone-700 pt-2 px-1">
          <p className="text-[10px] text-stone-400 font-sans text-center leading-tight">
            {activeDesc}
          </p>
       </div>
    </div>
  )
}
