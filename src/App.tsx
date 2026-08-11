import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Home from './pages/Home'
import List, { type ListHandle } from './pages/List'
import Input from './components/Input'
import Search from './components/Search'
import { load, save, loadView, saveView } from './helper/storage'
import type { PitHandle } from './components/Pit'
import type { Task } from './helper/task'

function diff(a: Task[], b: Task[]) {
  const bIds = new Set(b.map(t => t.id))
  const removed = a.filter(t => !bIds.has(t.id)).map(t => t.id)
  return { removed }
}

const swipe = 70
const zone = 140
const pullThreshold = 80

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(load)
  const [view, setView] = useState<'pit' | 'list'>(loadView)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(false)
  const [query, setQuery] = useState('')
  const home = useRef<PitHandle>(null)
  const list = useRef<ListHandle>(null)
  const past = useRef<Task[][]>([])
  const future = useRef<Task[][]>([])
  const tasksRef = useRef(tasks)
  const viewRef = useRef(view)
  const gesture = useRef({ x: 0, y: 0 })
  const pull = useRef({ id: -1, active: false, startY: 0 })
  const pullRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  tasksRef.current = tasks
  viewRef.current = view

  useEffect(() => {
    save(tasks)
  }, [tasks])

  useEffect(() => {
    saveView(view)
  }, [view])

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearch(true)
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

  function gestureDown(e: React.PointerEvent) {
    if (open || search) return
    const target = e.target as HTMLElement
    if (target.closest('[data-pill]') || target.tagName === 'BUTTON' || target.tagName === 'INPUT') return
    gesture.current = { x: e.clientX, y: e.clientY }
    if (e.clientY < zone) {
      pull.current = { id: e.pointerId, active: true, startY: e.clientY }
    }
  }

  function gestureMove(e: React.PointerEvent) {
    if (!pull.current.active || e.pointerId !== pull.current.id) return
    const dy = Math.max(0, e.clientY - pull.current.startY)
    const dampedY = Math.pow(dy, 0.85) * 1.5
    const progress = Math.min(Math.max(dy / pullThreshold, 0), 1)

    gsap.set(containerRef.current, {
      y: dampedY,
      borderTopLeftRadius: `${progress * 40}px`,
      borderTopRightRadius: `${progress * 40}px`
    })
    gsap.set(pullRef.current, { opacity: progress })
  }

  function gestureUp(e: React.PointerEvent) {
    if (pull.current.active && e.pointerId === pull.current.id) {
      const dy = e.clientY - pull.current.startY
      pull.current.active = false
      if (dy > pullThreshold) {
        gsap.to(containerRef.current, {
          y: 0,
          borderTopLeftRadius: '0px',
          borderTopRightRadius: '0px',
          duration: 0.3,
          ease: 'power2.out'
        })
        gsap.to(pullRef.current, { opacity: 0, duration: 0.2 })
        setOpen(true)
      } else {
        gsap.to(containerRef.current, {
          y: 0,
          borderTopLeftRadius: '0px',
          borderTopRightRadius: '0px',
          duration: 0.2,
          ease: 'power2.out'
        })
        gsap.to(pullRef.current, { opacity: 0, duration: 0.2 })
      }
      return
    }
    if (open || search) return
    const dx = e.clientX - gesture.current.x
    const dy = e.clientY - gesture.current.y
    if (Math.abs(dx) < swipe || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx < 0 && view === 'pit') toggle()
    if (dx > 0 && view === 'list') toggle()
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#121212]"
      onPointerDown={gestureDown}
      onPointerMove={gestureMove}
      onPointerUp={gestureUp}
    >
      <div
        ref={pullRef}
        className="fixed top-0 left-0 right-0 z-0 flex items-center justify-center text-white/40 text-sm tracking-wide select-none pointer-events-none opacity-0"
        style={{
          height: 'calc(50px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 12px)'
        }}
      >
        new task
      </div>

      <div
        ref={containerRef}
        className="w-full h-full bg-black overflow-hidden relative shadow-2xl z-10"
      >
        <Home ref={home} tasks={tasks} update={setTasks} record={record} filter={search ? query : ''} />
        {view === 'list' && (
          <div className="absolute inset-0 bg-black">
            <List ref={list} tasks={tasks} complete={complete} filter={search ? query : ''} />
          </div>
        )}
      </div>

      {open && <Input submit={t => { spawn(t); setOpen(false) }} close={() => setOpen(false)} />}
      {search && <Search query={query} change={setQuery} close={() => { setSearch(false); setQuery('') }} />}
    </div>
  )
}