import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { Task } from '../helper/task'

type Props = {
    task: Task
    mount: (id: string, el: HTMLDivElement | null) => void
    explode: (id: string) => void
}

const hold = 900
const threshold = 6

export default function Pill({ task, mount, explode }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const timer = useRef<number>()
    const charge = useRef<gsap.core.Tween>()
    const origin = useRef({ x: 0, y: 0 })

    useEffect(() => {
        mount(task.id, ref.current)
        return () => mount(task.id, null)
    }, [])

    function start(e: React.PointerEvent) {
        origin.current = { x: e.clientX, y: e.clientY }
        timer.current = window.setTimeout(() => explode(task.id), hold)
        charge.current = gsap.to(ref.current, {
            opacity: 0.25,
            duration: 0.12,
            repeat: -1,
            yoyo: true,
            ease: 'none',
        })
    }

    function move(e: React.PointerEvent) {
        const dx = e.clientX - origin.current.x
        const dy = e.clientY - origin.current.y
        if (Math.hypot(dx, dy) > threshold) cancel()
    }

    function cancel() {
        window.clearTimeout(timer.current)
        charge.current?.kill()
        gsap.to(ref.current, { opacity: 1, duration: 0.2 })
    }

    return (
        <div
            ref={ref}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            className="absolute whitespace-nowrap px-7 py-4 rounded-full bg-white text-black text-lg font-medium select-none cursor-grab active:cursor-grabbing"
        >
            {task.text}
        </div>
    )
}