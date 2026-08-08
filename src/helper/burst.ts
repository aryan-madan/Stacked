import Matter from 'matter-js'
import gsap from 'gsap'

const life = 900
const fade = 350

export function burst(x: number, y: number, root: HTMLElement, world: Matter.World) {
    const count = 12
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3
        const size = 5 + Math.random() * 7
        const speed = 6 + Math.random() * 6

        const body = Matter.Bodies.circle(x, y, size / 2, {
            restitution: 0.45,
            friction: 0.35,
            frictionAir: 0.012,
            density: 0.0008,
        })
        Matter.Body.setVelocity(body, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed - 5 })
        Matter.Composite.add(world, body)

        const el = document.createElement('div')
        el.className = 'absolute rounded-full bg-white pointer-events-none'
        el.style.width = `${size}px`
        el.style.height = `${size}px`
        root.appendChild(el)

        const start = performance.now()
        function tick() {
            const t = performance.now() - start
            gsap.set(el, {
                left: body.position.x - size / 2,
                top: body.position.y - size / 2,
                rotate: body.angle * (180 / Math.PI),
            })
            if (t > life - fade) {
                el.style.opacity = `${Math.max(0, 1 - (t - (life - fade)) / fade)}`
            }
            if (t > life) {
                gsap.ticker.remove(tick)
                Matter.Composite.remove(world, body)
                el.remove()
            }
        }
        gsap.ticker.add(tick)
    }
}