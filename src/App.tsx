import { useEffect, useRef, useState } from 'react'
import Home from './pages/Home'
import List, { type ListHandle } from './pages/List'
import Input from './components/Input'
import { load, save } from './helper/storage'
import type { PitHandle } from './components/Pit'
import type { Task } from './helper/task'

function diff(a: Task[], b: Task[]) {
  const bIds = new Set(b.map(t => t.id))
  const removed = a.filter(t => !bIds.has(t.id)).map(t => t.id)
  return { removed }
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(load)
  const [view, setView] = useState<'pit' | 'list'>('pit')
  const [open, setOpen] = useState(false)
  const home = useRef<PitHandle>(null)
  const list = useRef<ListHandle>(null)
  const past = useRef<Task[][]>([])
  const future = useRef<Task[][]>([])
  const tasksRef = useRef(tasks)
  const viewRef = useRef(view)
  tasksRef.current = tasks
  viewRef.current = view

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

  function record() {
    past.current.push(tasksRef.current)
    future.current = []
  }

  function animate(ids: string[], after: () => void) {
    if (!ids.length) {
      after()
      return
    }
    if (viewRef.current === 'list') {
      home.current?.vanish(ids, () => { })
      list.current?.vanish(ids, after)
    } else {
      home.current?.vanish(ids, after)
    }
  }

  function undo() {
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(tasksRef.current)
    const { removed } = diff(tasksRef.current, prev)
    animate(removed, () => setTasks(prev))
  }

  function redo() {
    const next = future.current.pop()
    if (!next) return
    past.current.push(tasksRef.current)
    const { removed } = diff(tasksRef.current, next)
    animate(removed, () => setTasks(next))
  }

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
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
    record()
    const id = crypto.randomUUID()
    setTasks(prev => [...prev, { id, text }])
  }

  function complete(id: string) {
    home.current?.explode(id)
  }

  return (
    <div className="relative w-screen h-screen">
      <Home ref={home} tasks={tasks} update={setTasks} record={record} />
      {view === 'list' && (
        <div className="absolute inset-0 bg-black">
          <List ref={list} tasks={tasks} complete={complete} />
        </div>
      )}
      {open && <Input submit={t => { spawn(t); setOpen(false) }} close={() => setOpen(false)} />}
    </div>
  )
}