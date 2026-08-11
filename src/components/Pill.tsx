import { useEffect, useLayoutEffect, useRef, useState } from 'react'
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

function getResponsiveStyles(length: number, viewportWidth: number) {
    const isDesktop = viewportWidth >= 768

    if (isDesktop) {
        if (length > 100) return 'text-xs px-5 py-3 max-w-[60vw]'
        if (length > 60) return 'text-sm px-6 py-3.5 max-w-[70vw]'
        return 'text-lg px-7 py-4 max-w-[80vw]'
    }

    if (length > 60) return 'text-[11px] px-4 py-2.5 max-w-[85vw]'
    if (length > 40) return 'text-xs px-5 py-3 max-w-[85vw]'
    if (length > 25) return 'text-sm px-6 py-3.5 max-w-[85vw]'
    return 'text-base px-7 py-4 max-w-[85vw]'
}

export default function Pill({ task, mount, explode, dim }: Props) {
    const ref = useRef<HTMLDivElement>(null)
    const timer = useRef<number | undefined>(undefined)
    const charge = useRef<gsap.core.Tween | undefined>(undefined)
    const origin = useRef({ x: 0, y: 0 })
    const [vw, setVw] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024)

    useEffect(() => {
        function handleResize() {
            setVw(window.innerWidth)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

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

    const dynamicClasses = getResponsiveStyles(task.text.length, vw)

    return (
        <div
            ref={ref}
            data-pill="true"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            style={{ touchAction: 'none' }}
            className={`absolute rounded-full bg-white text-black font-medium select-none cursor-grab active:cursor-grabbing whitespace-nowrap overflow-hidden text-ellipsis ${dynamicClasses}`}
        >
            {task.text}
        </div>
    )
}