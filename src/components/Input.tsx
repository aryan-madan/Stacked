import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

type Props = {
    submit: (text: string) => void
    close: () => void
}

export default function Input({ submit, close }: Props) {
    const [value, setValue] = useState('')
    const field = useRef<HTMLInputElement>(null)
    const overlay = useRef<HTMLDivElement>(null)
    const panel = useRef<HTMLFormElement>(null)

    useEffect(() => {
        field.current?.focus()
        gsap.fromTo(overlay.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
        gsap.fromTo(
            panel.current,
            { scale: 0.9, y: 12, opacity: 0 },
            { scale: 1, y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' }
        )
    }, [])

    function dismiss() {
        gsap.to(panel.current, { scale: 0.9, y: 12, opacity: 0, duration: 0.15, ease: 'power1.in' })
        gsap.to(overlay.current, { opacity: 0, duration: 0.15, onComplete: close })
    }

    function send(e: React.FormEvent) {
        e.preventDefault()
        const text = value.trim()
        if (text) submit(text)
    }

    return (
        <div ref={overlay} className="absolute inset-0 flex items-center justify-center bg-black">
            <form ref={panel} onSubmit={send} className="w-full max-w-md px-6">
                <input
                    ref={field}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') dismiss() }}
                    placeholder="What needs doing?"
                    className="w-full bg-transparent border-b border-white/30 text-white text-xl py-2 outline-none placeholder:text-white/30"
                />
            </form>
        </div>
    )
}