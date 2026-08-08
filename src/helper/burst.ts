import gsap from 'gsap'

export function burst(x: number, y: number, root: HTMLElement) {
    const flash = document.createElement('div')
    flash.className = 'absolute rounded-full bg-white pointer-events-none'
    flash.style.left = `${x}px`
    flash.style.top = `${y}px`
    flash.style.width = '20px'
    flash.style.height = '20px'
    flash.style.transform = 'translate(-50%,-50%)'
    root.appendChild(flash)
    gsap.to(flash, {
        width: 90,
        height: 90,
        opacity: 0,
        duration: 0.35,
        ease: 'power3.out',
        onComplete: () => flash.remove(),
    })

    const count = 12
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div')
        const size = 5 + Math.random() * 7
        piece.className = 'absolute rounded-full bg-white pointer-events-none'
        piece.style.left = `${x}px`
        piece.style.top = `${y}px`
        piece.style.width = `${size}px`
        piece.style.height = `${size}px`
        root.appendChild(piece)
        const angle = Math.random() * Math.PI * 2
        const speed = 60 + Math.random() * 60
        const targetX = Math.cos(angle) * speed
        const peakY = Math.sin(angle) * speed * 0.6
        gsap.timeline({ onComplete: () => piece.remove() })
            .to(piece, { x: targetX, y: peakY, duration: 0.25, ease: 'power2.out' })
            .to(piece, { y: peakY + 70, opacity: 0, duration: 0.4, ease: 'power1.in' })
    }
}