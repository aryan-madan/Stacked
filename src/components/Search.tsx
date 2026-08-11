import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Props = {
    query: string
    change: (value: string) => void
    close: () => void
}

const swipe = 60

export default function Search({ query, change, close }: Props) {
    const field = useRef<HTMLInputElement>(null)
    const panel = useRef<HTMLDivElement>(null)
    const overlay = useRef<HTMLDivElement>(null)
    const start = useRef({ x: 0, y: 0 })

    useEffect(() => {
        field.current?.focus()
        gsap.fromTo(panel.current, { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' })
    }, [])

    function dismiss() {
        gsap.to(panel.current, { y: -12, opacity: 0, duration: 0.15, ease: 'power1.in', onComplete: close })
    }

    function down(e: React.PointerEvent) {
        start.current = { x: e.clientX, y: e.clientY }
    }

    function up(e: React.PointerEvent) {
        const dy = e.clientY - start.current.y
        const dx = e.clientX - start.current.x
        if (dy < -swipe && Math.abs(dx) < swipe) dismiss()
    }

    return (
        <div
            ref={overlay}
            onClick={dismiss}
            className="fixed inset-0 z-50 flex justify-center items-start pt-8"
        >
            <div
                ref={panel}
                onPointerDown={down}
                onPointerUp={up}
                onClick={e => e.stopPropagation()}
                className="relative"
            >
                <input
                    ref={field}
                    value={query}
                    onChange={e => change(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') dismiss() }}
                    placeholder="search"
                    className="bg-white/10 backdrop-blur rounded-full px-5 py-2 text-white text-sm outline-none placeholder:text-white/30 w-52"
                />
            </div>
        </div>
    )
}