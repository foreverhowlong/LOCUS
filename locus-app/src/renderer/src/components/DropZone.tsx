import { useCallback, useState } from 'react'
import { useBookStore } from '../store/useBookStore'
import { Upload } from 'lucide-react'

export function DropZone() {
  const { setBook, setLoading } = useBookStore()
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    console.log('File dropped:', file)

    if (file) {
      const fileName = file.name.toLowerCase()
      const isEpub = fileName.endsWith('.epub') || file.type === 'application/epub+zip'

      if (isEpub) {
        console.log('Valid EPUB detected, reading...')
        setLoading(true)
        const reader = new FileReader()
        
        reader.onload = (event) => {
          if (event.target?.result) {
            console.log('File read successful, setting book data...')
            setBook(event.target.result as ArrayBuffer)
            setLoading(false)
          }
        }
        
        reader.onerror = () => {
          console.error('Error reading file:', reader.error) // Log the actual error object
          setLoading(false)
        }

        reader.readAsArrayBuffer(file)
      } else {
        console.warn('Invalid file format. Please drop an .epub file.')
        alert('Please drop a valid .epub file.')
      }
    }
  }, [setBook, setLoading])

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  return (
    <div 
      onDrop={onDrop} 
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      className={`flex h-screen w-full flex-col items-center justify-center bg-porcelain text-charcoal transition-colors duration-300 ${isDragging ? 'bg-stone-100' : ''}`}
    >
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-6xl font-serif font-light tracking-tight text-charcoal">
          LOCUS
        </h1>
        <p className="font-sans text-sm tracking-widest text-stone-500 uppercase">
          Hermeneutic Engine
        </p>
      </div>

      <div 
        className={`
          group relative flex h-64 w-96 cursor-pointer flex-col items-center justify-center 
          rounded-2xl border-2 border-dashed transition-all duration-300
          ${isDragging 
            ? 'border-indigo-muted bg-white scale-105 shadow-lg' 
            : 'border-stone-300 bg-transparent hover:border-indigo-muted/50 hover:bg-white/30'
          }
        `}
      >
         <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute h-full w-full rounded-2xl bg-indigo-muted/5" />
         </div>

         <Upload 
            size={48} 
            className={`mb-4 transition-colors duration-300 ${isDragging ? 'text-indigo-muted' : 'text-stone-400 group-hover:text-indigo-muted'}`} 
         />
         <p className="font-serif text-xl text-charcoal">Open Digital Codex</p>
         <p className="mt-2 font-sans text-xs text-stone-500">Drag & Drop .epub file</p>
      </div>
    </div>
  )
}
