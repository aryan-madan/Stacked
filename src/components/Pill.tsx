import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { Task } from '../helper/task'

type Props = {
    task: Task
    mount: (id: string, el: HTMLDivElement | null) => void
    explode: (id: string) => void
}

const hold = 600
const threshold = 6

export default function Pill({ task, mount, explode }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const timer = useRef<number>()
    const origin = useRef({ x: 0, y: 0 })

    useEffect(() => {
        mount(task.id, ref.current)
        return () => mount(task.id, null)
    }, [])

    function start(e: React.PointerEvent) {
        origin.current = { x: e.clientX, y: e.clientY }
        timer.current = window.setTimeout(() => explode(task.id), hold)
    }

    function move(e: React.PointerEvent) {
        const dx = e.clientX - origin.current.x
        const dy = e.clientY - origin.current.y
        if (Math.hypot(dx, dy) > threshold) cancel()
    }

    function cancel() {
        window.clearTimeout(timer.current)
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