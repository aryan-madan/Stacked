import gsap from 'gsap'

export function burst(x: number, y: number, root: HTMLElement) {
    const ring = document.createElement('div')
    ring.className = 'absolute rounded-full border-2 border-white pointer-events-none'
    ring.style.left = `${x}px`
    ring.style.top = `${y}px`
    ring.style.width = '12px'
    ring.style.height = '12px'
    ring.style.transform = 'translate(-50%,-50%)'
    root.appendChild(ring)
    gsap.to(ring, {
        width: 140,
        height: 140,
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
        onComplete: () => ring.remove(),
    })

    const count = 10
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
        const size = 5 + Math.random() * 6
        const el = document.createElement('div')
        el.className = 'absolute rounded-full bg-white pointer-events-none'
        el.style.width = `${size}px`
        el.style.height = `${size}px`
        el.style.left = `${x - size / 2}px`
        el.style.top = `${y - size / 2}px`
        root.appendChild(el)
        const distance = 50 + Math.random() * 30
        gsap.timeline({ onComplete: () => el.remove() })
            .to(el, { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, duration: 0.28, ease: 'power2.out' }, 0)
            .to(el, { y: '+=24', opacity: 0, duration: 0.22, ease: 'power2.in' }, 0.22)
    }
}