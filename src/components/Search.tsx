import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Props = {
    query: string
    change: (value: string) => void
    close: () => void
}

export default function Search({ query, change, close }: Props) {
    const field = useRef<HTMLInputElement>(null)
    const panel = useRef<HTMLDivElement>(null)

    useEffect(() => {
        field.current?.focus()
        gsap.fromTo(panel.current, { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: 'power2.out' })
    }, [])

    function dismiss() {
        gsap.to(panel.current, { y: -12, opacity: 0, duration: 0.15, ease: 'power1.in', onComplete: close })
    }

    return (
        <div ref={panel} className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
            <input
                ref={field}
                value={query}
                onChange={e => change(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') dismiss() }}
                placeholder="search"
                className="bg-white/10 backdrop-blur rounded-full px-5 py-2 text-white text-sm outline-none placeholder:text-white/30 w-52"
            />
        </div>
    )
}