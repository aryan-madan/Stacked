import { useEffect, useState } from 'react'
import Home from './pages/Home'
import List from './pages/List'
import { load, save } from './helper/storage'
import type { Task } from './helper/task'

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(load)
  const [view, setView] = useState<'pit' | 'list'>('pit')

  useEffect(() => {
    save(tasks)
  }, [tasks])

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT') return
      if (e.key === 'Tab') {
        e.preventDefault()
        setView(v => (v === 'pit' ? 'list' : 'pit'))
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  return (
    <div className="relative w-screen h-screen">
      <Home tasks={tasks} update={setTasks} />
      {view === 'list' && (
        <div className="absolute inset-0 bg-black">
          <List tasks={tasks} update={setTasks} />
        </div>
      )}
    </div>
  )
}