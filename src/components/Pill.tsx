import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import type { Task } from '../helper/task'

type Props = {
    task: Task
    mount: (id: string, el: HTMLDivElement | null) => void
    explode: (id: string) => void
    dim?: boolean
}

const hold = 900
const threshold = 6

export default function Pill({ task, mount, explode, dim }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const timer = useRef<number | undefined>(undefined)
    const charge = useRef<gsap.core.Tween | undefined>(undefined)
    const origin = useRef({ x: 0, y: 0 })

    useLayoutEffect(() => {
        mount(task.id, ref.current)
        return () => mount(task.id, null)
    }, [task.id, mount])

    useEffect(() => {
        gsap.to(ref.current, {
            backgroundColor: dim ? 'rgba(255,255,255,0.15)' : '#ffffff',
            duration: 0.25,
            ease: 'power2.out',
        })
    }, [dim])

    function start(e: React.PointerEvent) {
        cancel()
        origin.current = { x: e.clientX, y: e.clientY }

        timer.current = window.setTimeout(() => explode(task.id), hold)
        charge.current = gsap.to(ref.current, {
            opacity: 0.25,
            duration: 0.12,
            repeat: -1,
            yoyo: true,
            ease: 'none',
            delay: 0.3,
        })
    }

    function move(e: React.PointerEvent) {
        const dx = e.clientX - origin.current.x
        const dy = e.clientY - origin.current.y
        if (Math.hypot(dx, dy) > threshold) cancel()
    }

    function cancel() {
        if (timer.current !== undefined) {
            window.clearTimeout(timer.current)
            timer.current = undefined
        }
        if (charge.current) {
            charge.current.kill()
            charge.current = undefined
        }
        gsap.to(ref.current, { opacity: 1, duration: 0.15 })
    }

    return (
        <div
            ref={ref}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            style={{ touchAction: 'none' }}
            className="absolute whitespace-nowrap px-7 py-4 rounded-full bg-white text-black text-lg font-medium select-none cursor-grab active:cursor-grabbing"
        >
            {task.text}
        </div>
    )
}