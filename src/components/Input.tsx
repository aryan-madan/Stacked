import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

type Props = {
    submit: (text: string) => void
    close: () => void
    toggleView?: () => void
}

const limit = 140

export default function Input({ submit, close, toggleView }: Props) {
    const [value, setValue] = useState('')
    const field = useRef<HTMLInputElement>(null)
    const overlay = useRef<HTMLDivElement>(null)
    const panel = useRef<HTMLFormElement>(null)
    const lastTap = useRef(0)

    useEffect(() => {
        field.current?.focus()
        gsap.fromTo(overlay.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' })
        gsap.fromTo(
            panel.current,
            { scale: 0.9, y: 12, opacity: 0 },
            { scale: 1, y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' }
        )

        window.history.pushState({ modal: 'input' }, '')

        const handlePopState = () => {
            dismiss()
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
            if (window.history.state?.modal === 'input') {
                window.history.back()
            }
        }
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]"
        >
            <form
                ref={panel}
                onSubmit={send}
                onClick={e => {
                    e.stopPropagation()
                    handleDoubleTap()
                }}
                className="w-full max-w-md px-6"
            >
                <input
                    ref={field}
                    value={value}
                    maxLength={limit}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') dismiss() }}
                    placeholder="What needs doing?"
                    className="w-full bg-transparent border-b border-white/30 text-white text-xl py-2 outline-none placeholder:text-white/30"
                />
            </form>
        </div>
    )
}