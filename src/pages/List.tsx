import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Task } from '../helper/task'
import { success } from '../helper/haptic'

type Props = {
    tasks: Task[]
    complete: (id: string) => void
    filter?: string
    pullStart?: () => void
    pullMove?: (progress: number) => void
    pullEnd?: (committed: boolean) => void
    onToggleView?: () => void
}

export type ListHandle = {
    hide: (after?: () => void) => void
    vanish: (ids: string[], after?: () => void) => void
}

const List = forwardRef<ListHandle, Props>(function List({ tasks, complete, filter, pullStart, pullMove, pullEnd, onToggleView }, ref) {
    const root = useRef<HTMLDivElement>(null)
    const rows = useRef<Record<string, HTMLDivElement>>({})
    const known = useRef<Set<string>>(new Set())
    const lastTap = useRef<Record<string, number>>({})
    const [checked, setChecked] = useState<Record<string, boolean>>({})
    const [focusedId, setFocusedId] = useState<string | null>(null)

    const pulling = useRef(false)
    const startY = useRef(0)
    const currentDy = useRef(0)

    const pullThreshold = 80
    const scrollSlack = 2
    const doubleTap = 300

    const lastBgTap = useRef<number>(0)
    const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    function handleBackgroundTap(e: React.PointerEvent) {
        if ((e.target as HTMLElement).closest('[data-task-row="true"]')) {
            return
        }
        const now = Date.now()
        if (now - lastBgTap.current < 300) {
            if (tapTimer.current) clearTimeout(tapTimer.current)
            lastBgTap.current = 0
            onToggleView?.()
        } else {
            lastBgTap.current = now
            tapTimer.current = setTimeout(() => {
                lastBgTap.current = 0
            }, 300)
        }
    }

    useEffect(() => {
        const el = root.current
        if (!el) return

        function handleTouchStart(e: TouchEvent) {
            if (el && el.scrollTop > scrollSlack) return
            const touch = e.touches[0]
            if (!touch) return
            pulling.current = true
            startY.current = touch.clientY
            currentDy.current = 0
            pullStart?.()
        }

        function handleTouchMove(e: TouchEvent) {
            if (!pulling.current) return
            const touch = e.touches[0]
            if (!touch) return
            const dy = touch.clientY - startY.current

            if (dy > 0 && el && el.scrollTop <= scrollSlack) {
                if (e.cancelable) e.preventDefault()
                currentDy.current = dy
                const progress = Math.max(0, dy / pullThreshold)
                pullMove?.(progress)
            } else if (dy < -10) {
                pulling.current = false
                currentDy.current = 0
                pullEnd?.(false)
            }
        }

        function handleTouchEnd() {
            if (!pulling.current) return
            pulling.current = false
            const committed = currentDy.current > pullThreshold
            currentDy.current = 0
            pullEnd?.(committed)
        }

        el.addEventListener('touchstart', handleTouchStart, { passive: true })
        el.addEventListener('touchmove', handleTouchMove, { passive: false })
        el.addEventListener('touchend', handleTouchEnd)
        el.addEventListener('touchcancel', handleTouchEnd)

        return () => {
            el.removeEventListener('touchstart', handleTouchStart)
            el.removeEventListener('touchmove', handleTouchMove)
            el.removeEventListener('touchend', handleTouchEnd)
            el.removeEventListener('touchcancel', handleTouchEnd)
        }
    }, [pullStart, pullMove, pullEnd])

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
        let newlyAddedId: string | null = null

        tasks.forEach(task => {
            if (!known.current.has(task.id)) {
                newlyAddedId = task.id
                const el = rows.current[task.id]
                if (el) {
                    gsap.fromTo(el, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.6)' })
                }
            }
        })

        known.current = current

        if (newlyAddedId) {
            setFocusedId(newlyAddedId)
        } else if (focusedId && !current.has(focusedId)) {
            setFocusedId(null)
        }

        setChecked(prev => {
            const next: Record<string, boolean> = {}
            current.forEach(id => {
                if (prev[id]) next[id] = true
            })
            return next
        })
    }, [tasks])

    useEffect(() => {
        function handle(e: KeyboardEvent) {
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT') return
            if (!tasks.length) return

            const currentIndex = tasks.findIndex(t => t.id === focusedId)

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, tasks.length - 1)
                setFocusedId(tasks[nextIndex].id)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                const nextIndex = currentIndex === -1 ? tasks.length - 1 : Math.max(currentIndex - 1, 0)
                setFocusedId(tasks[nextIndex].id)
            } else if (e.key === 'Enter' || e.key === ' ') {
                if (currentIndex < 0) return
                e.preventDefault()
                const task = tasks[currentIndex]
                if (task) toggle(task.id)
            }
        }
        window.addEventListener('keydown', handle)
        return () => window.removeEventListener('keydown', handle)
    }, [tasks, focusedId])

    const hide = (after?: () => void) => {
        const els = Object.values(rows.current)
        gsap.to(els, { x: -30, opacity: 0, duration: 0.25, stagger: 0.03, ease: 'power2.in' })
        gsap.to(root.current, { opacity: 0, duration: 0.3, delay: 0.05, onComplete: () => after?.() })
    }

    function collapse(el: HTMLDivElement, done: () => void) {
        gsap.timeline({ onComplete: done })
            .to(el, { scale: 1.02, duration: 0.12, ease: 'power1.out' })
            .to(el, { scale: 1, duration: 0.08 })
            .set(el, { transformOrigin: 'top center' })
            .to(el, { scale: 0.95, opacity: 0, duration: 0.15, ease: 'power2.in' }, 'collapse')
            .set(el, { overflow: 'hidden' })
            .to(el, {
                height: 0,
                paddingTop: 0,
                paddingBottom: 0,
                marginTop: 0,
                marginBottom: 0,
                duration: 0.22,
                ease: 'power3.inOut'
            }, 'collapse+=0.05')
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
        success()
        const el = rows.current[id]
        if (el) {
            window.setTimeout(() => collapse(el, () => complete(id)), 150)
        } else {
            complete(id)
        }
    }

    function rowTap(id: string) {
        const now = Date.now()
        const prev = lastTap.current[id] || 0
        if (now - prev < doubleTap) {
            lastTap.current[id] = 0
            toggle(id)
        } else {
            lastTap.current[id] = now
            setFocusedId(id)
        }
    }

    return (
        <div
            ref={root}
            onPointerDown={handleBackgroundTap}
            className="w-screen h-screen text-white overflow-auto pt-[18vh] px-6 sm:px-16 pb-16 overscroll-none"
            style={{ paddingTop: 'max(18vh, env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="max-w-md mx-auto">
                {tasks.length === 0 && (
                    <div className="fixed inset-0 flex items-center justify-center pointer-events-none text-white/25 text-sm tracking-wide text-center px-8">
                        <span className="pointer-coarse:hidden">press ⌘K to add a task</span>
                        <span className="hidden pointer-coarse:inline">pull down to add a task</span>
                    </div>
                )}
                <div className="flex flex-col">
                    {tasks.map((task) => {
                        const match = !filter || task.text.toLowerCase().includes(filter.toLowerCase())
                        const isFocused = focusedId === task.id
                        return (
                            <div
                                key={task.id}
                                data-task-row="true"
                                ref={el => { if (el) rows.current[task.id] = el; else delete rows.current[task.id] }}
                                onClick={() => rowTap(task.id)}
                                className={`flex items-center gap-4 py-3.5 px-4 rounded-xl transition-colors duration-150 select-none ${isFocused
                                    ? 'bg-white text-black shadow-lg shadow-black/20'
                                    : 'hover:bg-white/[0.05] text-white'
                                    }`}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        toggle(task.id)
                                    }}
                                    className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center transition-colors duration-150 ${checked[task.id]
                                        ? isFocused ? 'bg-black text-white' : 'bg-white text-black'
                                        : isFocused ? 'border border-black/40 hover:border-black' : 'border border-white/40 hover:border-white'
                                        }`}
                                >
                                    {checked[task.id] && (
                                        <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current" fill="none">
                                            <path d="M5 13l4 4L19 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>
                                <span
                                    className={`text-lg transition-opacity duration-300 ${checked[task.id]
                                        ? 'opacity-40 line-through'
                                        : match ? 'opacity-100' : 'opacity-30'
                                        }`}
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