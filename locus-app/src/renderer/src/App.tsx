import { useBookStore } from './store/useBookStore'
import { Reader } from './components/Reader'
import { DropZone } from './components/DropZone'

function App() {
  const { bookData } = useBookStore()

  if (bookData) {
    return <Reader />
  }

  return <DropZone />
}

export default App
