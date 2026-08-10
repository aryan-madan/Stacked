import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Task } from '../helper/task'

type Props = {
    tasks: Task[]
    complete: (id: string) => void
    filter?: string
}

export type ListHandle = {
    hide: (after?: () => void) => void
    vanish: (ids: string[], after?: () => void) => void
}

const List = forwardRef<ListHandle, Props>(function List({ tasks, complete, filter }, ref) {
    const root = useRef<HTMLDivElement>(null)
    const rows = useRef<Record<string, HTMLDivElement>>({})
    const known = useRef<Set<string>>(new Set())
    const [checked, setChecked] = useState<Record<string, boolean>>({})
    const [focused, setFocused] = useState(-1)

    useLayoutEffect(() => {
        gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
        const els = Object.values(rows.current)
        gsap.fromTo(
            els,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.45, stagger: 0.045, ease: 'power2.out', delay: 0.1 }
        )
        known.current = new Set(tasks.map(t => t.id))
    }, [])

    useLayoutEffect(() => {
        const current = new Set(tasks.map(t => t.id))
        tasks.forEach(task => {
            if (!known.current.has(task.id)) {
                const el = rows.current[task.id]
                if (el) {
                    gsap.fromTo(el, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' })
                }
            }
        })
        known.current = current
        setChecked(prev => {
            const next: Record<string, boolean> = {}
            current.forEach(id => {
                if (prev[id]) next[id] = true
            })
            return next
        })
    }, [tasks])

    useEffect(() => {
        if (focused > tasks.length - 1) setFocused(tasks.length ? tasks.length - 1 : -1)
    }, [tasks.length])

    useEffect(() => {
        function handle(e: KeyboardEvent) {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT') return
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setFocused(f => (f === -1 ? 0 : Math.min(f + 1, tasks.length - 1)))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setFocused(f => (f === -1 ? tasks.length - 1 : Math.max(f - 1, 0)))
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (focused < 0) return
                e.preventDefault()
                const task = tasks[focused]
                if (task) toggle(task.id)
            }
        }
        window.addEventListener('keydown', handle)
        return () => window.removeEventListener('keydown', handle)
    }, [tasks, focused])

    const hide = (after?: () => void) => {
        const els = Object.values(rows.current)
        gsap.to(els, { x: -30, opacity: 0, duration: 0.25, stagger: 0.03, ease: 'power2.in' })
        gsap.to(root.current, { opacity: 0, duration: 0.3, delay: 0.05, onComplete: () => after?.() })
    }

    function collapse(el: HTMLDivElement, done: () => void) {
        const height = el.offsetHeight
        gsap.timeline({ onComplete: done })
            .to(el, { scale: 1.02, duration: 0.12, ease: 'power1.out' })
            .to(el, { scale: 1, duration: 0.08 })
            .to(el, { scale: 0.92, opacity: 0, duration: 0.2, ease: 'power2.inOut' })
            .set(el, { height, overflow: 'hidden' })
            .to(el, { height: 0, paddingTop: 0, paddingBottom: 0, duration: 0.18, ease: 'power2.inOut' })
    }

    const vanish = (ids: string[], after?: () => void) => {
        if (!ids.length) {
            after?.()
            return
        }
        let remaining = ids.length
        ids.forEach(id => {
            const el = rows.current[id]
            if (!el) {
                remaining -= 1
                if (remaining === 0) after?.()
                return
            }
            collapse(el, () => {
                remaining -= 1
                if (remaining === 0) after?.()
            })
        })
    }

    useImperativeHandle(ref, () => ({ hide, vanish }))

    function toggle(id: string) {
        if (checked[id]) return
        setChecked(prev => ({ ...prev, [id]: true }))
        const el = rows.current[id]
        if (el) {
            window.setTimeout(() => collapse(el, () => complete(id)), 150)
        } else {
            complete(id)
        }
    }

    return (
        <div ref={root} className="w-screen h-screen text-white overflow-auto pt-[18vh] px-16 pb-16">
            <div className="max-w-md mx-auto">
                {tasks.length === 0 && (
                    <div className="text-white/25 text-sm tracking-wide py-12 text-center">
                        press ⌘K to add a task
                    </div>
                )}
                <div className="divide-y divide-white/10">
                    {tasks.map((task, i) => {
                        const match = !filter || task.text.toLowerCase().includes(filter.toLowerCase())
                        return (
                            <div
                                key={task.id}
                                ref={el => { if (el) rows.current[task.id] = el; else delete rows.current[task.id] }}
                                className={`flex items-center gap-4 py-4 px-3 -mx-3 transition-colors duration-150 ${focused === i ? 'bg-white/10' : ''}`}
                            >
                                <button
                                    onClick={() => toggle(task.id)}
                                    className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition ${checked[task.id] ? 'bg-white' : 'border border-white/40 hover:border-white'}`}
                                >
                                    {checked[task.id] && (
                                        <svg viewBox="0 0 24 24" className="w-3 h-3">
                                            <path d="M5 13l4 4L19 7" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>
                                <span
                                    className={`text-lg transition-opacity duration-300 ${checked[task.id] ? 'opacity-40 line-through' : match ? 'opacity-100' : 'opacity-30'}`}
                                >
                                    {task.text}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
})

export default List