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
  if (!position) return null

  const lenses = [
    { id: 'note', label: 'Note', icon: PenLine },
    { id: 'intertextuality', label: 'Genealogy', icon: Library },
    { id: 'philology', label: 'Roots', icon: Languages },
    { id: 'history', label: 'Context', icon: Hourglass },
    { id: 'culture', label: 'Culture', icon: Globe },
    { id: 'logic', label: 'Logic', icon: BrainCircuit },
    { id: 'syntax', label: 'Syntax', icon: Scaling },
    { id: 'reception', label: 'Reception', icon: MessageSquareQuote },
  ]

  return (
    <div 
       className="fixed z-50 flex flex-row items-center overflow-hidden rounded-full bg-charcoal p-1 shadow-xl transition-all duration-200 ease-out"
       style={{ 
         top: position.y - 60, // Position above the selection
         left: Math.max(20, position.x - 150) // Center-ish, keeping on screen
       }}
    >
       <div className="flex space-x-1 overflow-x-auto px-1 scrollbar-hide max-w-[90vw]">
          {lenses.map((lens) => (
            <button
              key={lens.id}
              onClick={(e) => { e.stopPropagation(); onSelect(lens.id) }}
              className="flex items-center space-x-2 rounded-full px-3 py-2 text-xs font-medium text-stone-300 transition hover:bg-stone-700 hover:text-white shrink-0 whitespace-nowrap"
            >
               <lens.icon size={14} />
               <span>{lens.label}</span>
            </button>
          ))}
       </div>
    </div>
  )
}
