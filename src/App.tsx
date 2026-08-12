import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Home from './components/Pit'
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
  const pull = useRef({ id: -1, active: false, startY: 0 })
  const pullRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdPos = useRef({ x: 0, y: 0 })
  tasksRef.current = tasks
  viewRef.current = view

  useEffect(() => {
    save(tasks)
  }, [tasks])

  useEffect(() => {
    saveView(view)
  }, [view])

  useEffect(() => {
    if (!open && !search) return

    window.history.pushState({ modal: open ? 'input' : 'search' }, '')

    const handlePopState = () => {
      if (open) setOpen(false)
      if (search) {
        setSearch(false)
        setQuery('')
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open, search])

  function closeInput() {
    setOpen(false)
    if (window.history.state?.modal === 'input') {
      window.history.back()
    }
  }

  function closeSearch() {
    setSearch(false)
    setQuery('')
    if (window.history.state?.modal === 'search') {
      window.history.back()
    }
  }

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

  function beginPull() {
    gsap.set(pullRef.current, { opacity: 0, y: -12, xPercent: -50 })
  }

  function movePull(progress: number) {
    const dy = progress * pullThreshold
    const dampedY = Math.pow(dy, 0.85) * 1.5
    const cappedProgress = Math.min(progress, 1)
    gsap.set(containerRef.current, {
      y: dampedY,
      borderTopLeftRadius: `${cappedProgress * 40}px`,
      borderTopRightRadius: `${cappedProgress * 40}px`,
    })
    gsap.set(pullRef.current, { opacity: cappedProgress, y: -12 + cappedProgress * 12, xPercent: -50 })
  }

  function endPull(committed: boolean) {
    gsap.to(containerRef.current, {
      y: 0,
      borderTopLeftRadius: '0px',
      borderTopRightRadius: '0px',
      duration: committed ? 0.3 : 0.2,
      ease: 'power2.out',
    })
    if (committed) {
      gsap.timeline()
        .to(pullRef.current, { scale: 1.1, xPercent: -50, duration: 0.1, ease: 'power1.out' })
        .to(pullRef.current, { scale: 1, opacity: 0, y: -12, xPercent: -50, duration: 0.2, ease: 'power2.in' })
      setOpen(true)
    } else {
      gsap.to(pullRef.current, { opacity: 0, y: -12, xPercent: -50, duration: 0.2, ease: 'power2.out' })
    }
  }

  function gestureDown(e: React.PointerEvent) {
    if (open || search) return
    const target = e.target as HTMLElement
    if (target.closest('[data-pill]') || target.tagName === 'BUTTON' || target.tagName === 'INPUT') return

    const isMobile = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window

    // Only allow long-press search on desktop or list view, disable on mobile pit view to prevent keyboard resize bugs
    if (!isMobile || view !== 'pit') {
      holdPos.current = { x: e.clientX, y: e.clientY }
      if (holdTimer.current) clearTimeout(holdTimer.current)
      holdTimer.current = setTimeout(() => {
        setSearch(true)
        if (pull.current.active) {
          pull.current.active = false
          endPull(false)
        }
      }, 450)
    }

    if (view === 'pit' && e.clientY < zone) {
      pull.current = { id: e.pointerId, active: true, startY: e.clientY }
      beginPull()
    }
  }

  function gestureMove(e: React.PointerEvent) {
    if (holdTimer.current) {
      const dx = Math.abs(e.clientX - holdPos.current.x)
      const dy = Math.abs(e.clientY - holdPos.current.y)
      if (dx > 10 || dy > 10) {
        clearTimeout(holdTimer.current)
        holdTimer.current = null
      }
    }
    if (!pull.current.active || e.pointerId !== pull.current.id) return
    const dy = Math.max(0, e.clientY - pull.current.startY)
    const progress = dy / pullThreshold
    movePull(progress)
  }

  function gestureUp(e: React.PointerEvent) {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    if (pull.current.active && e.pointerId === pull.current.id) {
      const dy = e.clientY - pull.current.startY
      pull.current.active = false
      endPull(dy > pullThreshold)
      return
    }
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#121212]"
      onPointerDown={gestureDown}
      onPointerMove={gestureMove}
      onPointerUp={gestureUp}
      onPointerCancel={gestureUp}
    >
      <div
        ref={pullRef}
        className="fixed left-1/2 z-50 pointer-events-none opacity-0 text-white/30 text-sm font-medium tracking-wide select-none outline-none border-none"
        style={{ top: 'max(16px, env(safe-area-inset-top))' }}
      >
        new task
      </div>

      <div
        ref={containerRef}
        className="w-full h-full bg-black overflow-hidden relative shadow-2xl z-10"
      >
        <img
          src="/assets/logo.svg"
          alt="Logo"
          className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-none mix-blend-difference h-6 w-auto"
          style={{ top: 'calc(max(2.5rem, env(safe-area-inset-top)) + 0.75rem)' }}
        />
        <Home ref={home} tasks={tasks} update={setTasks} record={record} filter={query} onToggleView={toggle} />
        {view === 'list' && (
          <div className="absolute inset-0 bg-black">
            <List
              ref={list}
              tasks={tasks}
              complete={complete}
              filter={query}
              pullStart={beginPull}
              pullMove={movePull}
              pullEnd={endPull}
              onToggleView={toggle}
            />
          </div>
        )}
      </div>

      {open && <Input submit={t => { spawn(t); closeInput() }} close={closeInput} toggleView={toggle} />}
      {search && <Search query={query} change={setQuery} close={closeSearch} toggleView={toggle} />}
    </div>
  )
}