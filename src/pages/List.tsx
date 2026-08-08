import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { Task } from '../helper/task'

type Props = {
    tasks: Task[]
    complete: (id: string) => void
}

export type ListHandle = {
    hide: (after?: () => void) => void
}

const List = forwardRef<ListHandle, Props>(function List({ tasks, complete }, ref) {
    const root = useRef<HTMLDivElement>(null)
    const rows = useRef<Record<string, HTMLDivElement>>({})
    const [checked, setChecked] = useState<Record<string, boolean>>({})

    useLayoutEffect(() => {
        gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' })
        const els = Object.values(rows.current)
        gsap.fromTo(
            els,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.45, stagger: 0.045, ease: 'power2.out', delay: 0.1 }
        )
    }, [])

    const hide = (after?: () => void) => {
        const els = Object.values(rows.current)
        gsap.to(els, { x: -30, opacity: 0, duration: 0.25, stagger: 0.03, ease: 'power2.in' })
        gsap.to(root.current, { opacity: 0, duration: 0.3, delay: 0.05, onComplete: () => after?.() })
    }

    useImperativeHandle(ref, () => ({ hide }))

    function toggle(id: string) {
        if (checked[id]) return
        setChecked(prev => ({ ...prev, [id]: true }))
        const el = rows.current[id]
        if (el) {
            const height = el.offsetHeight
            gsap.set(el, { height, overflow: 'hidden' })
            gsap.timeline()
                .to(el, { scale: 1.02, duration: 0.15, ease: 'power1.out' })
                .to(el, { scale: 1, duration: 0.1 })
                .to(el, {
                    height: 0,
                    paddingTop: 0,
                    paddingBottom: 0,
                    opacity: 0,
                    duration: 0.35,
                    delay: 0.15,
                    ease: 'power2.inOut',
                    onComplete: () => complete(id),
                })
        } else {
            complete(id)
        }
    }

    return (
        <div ref={root} className="w-screen h-screen text-white p-16 overflow-auto">
            <div className="max-w-md mx-auto divide-y divide-white/10">
                {tasks.map(task => (
                    <div
                        key={task.id}
                        ref={el => { if (el) rows.current[task.id] = el; else delete rows.current[task.id] }}
                        className="flex items-center gap-4 py-4"
                    >
                        <button
                            onClick={() => toggle(task.id)}
                            className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition ${checked[task.id] ? 'bg-white border-white' : 'border-white/40 hover:border-white'}`}
                        >
                            {checked[task.id] && (
                                <svg viewBox="0 0 24 24" className="w-3 h-3">
                                    <path d="M5 13l4 4L19 7" stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                        <span className={`text-lg transition ${checked[task.id] ? 'opacity-40 line-through' : ''}`}>{task.text}</span>
                    </div>
                ))}
            </div>
        </div>
    )
})

export default List