import gsap from 'gsap'

export function burst(x: number, y: number, root: HTMLElement) {
    const count = 10
    for (let i = 0; i < count; i++) {
        const shard = document.createElement('div')
        shard.className = 'absolute w-2 h-2 rounded-full bg-white pointer-events-none'
        shard.style.left = `${x}px`
        shard.style.top = `${y}px`
        root.appendChild(shard)
        const angle = (Math.PI * 2 * i) / count
        const distance = 60 + Math.random() * 40
        gsap.to(shard, {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            opacity: 0,
            scale: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: () => shard.remove(),
        })
    }
}