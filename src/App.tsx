import { useEffect, useRef, useState } from 'react'
import Home from './pages/Home'
import List, { type ListHandle } from './pages/List'
import Input from './components/Input'
import { load, save } from './helper/storage'
import type { PitHandle } from './components/Pit'
import type { Task } from './helper/task'

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(load)
  const [view, setView] = useState<'pit' | 'list'>('pit')
  const [open, setOpen] = useState(false)
  const home = useRef<PitHandle>(null)
  const list = useRef<ListHandle>(null)

  useEffect(() => {
    save(tasks)
  }, [tasks])

  function toggle() {
    if (view === 'pit') {
      home.current?.hide(() => setView('list'))
    } else {
      list.current?.hide(() => {
        setView('pit')
        home.current?.show()
      })
    }
  }

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        return
      }
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT') return
      if (e.key === 'Tab') {
        e.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handle, { capture: true })
    return () => window.removeEventListener('keydown', handle, { capture: true })
  }, [view])

  function spawn(text: string) {
    const id = crypto.randomUUID()
    setTasks(prev => [...prev, { id, text }])
  }

  function complete(id: string) {
    home.current?.explode(id)
  }

  return (
    <div className="relative w-screen h-screen">
      <Home ref={home} tasks={tasks} update={setTasks} />
      {view === 'list' && (
        <div className="absolute inset-0 bg-black">
          <List ref={list} tasks={tasks} complete={complete} />
        </div>
      )}
      {open && <Input submit={t => { spawn(t); setOpen(false) }} close={() => setOpen(false)} />}
    </div>
  )
}