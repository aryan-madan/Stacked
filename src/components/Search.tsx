import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Props = {
    query: string
    change: (value: string) => void
    close: () => void
    toggleView?: () => void
}

export default function Search({ query, change, close, toggleView }: Props) {
    const field = useRef<HTMLInputElement>(null)
    const panel = useRef<HTMLDivElement>(null)
    const overlay = useRef<HTMLDivElement>(null)
    const lastTap = useRef(0)

    useEffect(() => {
        field.current?.focus()
        gsap.fromTo(panel.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' })
    }, [])

    function dismiss() {
        gsap.to(panel.current, { y: 12, opacity: 0, duration: 0.15, ease: 'power1.in', onComplete: close })
    }

    function handleDoubleTap() {
        const now = Date.now()
        if (now - lastTap.current < 300) {
            toggleView?.()
        }
        lastTap.current = now
    }

    return (
        <div
            ref={overlay}
            onClick={dismiss}
            className="fixed inset-0 z-50 flex justify-center items-end pb-8 pointer-events-auto"
            style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
            <div
                ref={panel}
                onClick={e => {
                    e.stopPropagation()
                    handleDoubleTap()
                }}
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