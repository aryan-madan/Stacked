import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import gsap from 'gsap'
import Pill from './Pill'
import Input from './Input'
import { burst } from '../helper/burst'
import type { Task } from '../helper/task'

const margin = 48

type Props = {
    tasks: Task[]
    update: React.Dispatch<React.SetStateAction<Task[]>>
}

export default function Pit({ tasks, update }: Props) {
    const [open, setOpen] = useState(false)
    const container = useRef<HTMLDivElement>(null)
    const engine = useRef(Matter.Engine.create())
    const bodies = useRef<Record<string, Matter.Body>>({})
    const elements = useRef<Record<string, HTMLDivElement>>({})
    const outside = useRef<Record<string, number>>({})
    const lastSave = useRef(0)

    function explode(id: string) {
        const body = bodies.current[id]
        const el = elements.current[id]
        if (body && container.current) {
            burst(body.position.x, body.position.y, container.current)
            Matter.Composite.remove(engine.current.world, body)
        }
        delete bodies.current[id]
        if (el) {
            gsap.to(el, {
                scale: 0,
                opacity: 0,
                duration: 0.2,
                ease: 'power1.in',
                onComplete: () => update(prev => prev.filter(t => t.id !== id)),
            })
        } else {
            update(prev => prev.filter(t => t.id !== id))
        }
    }

    useEffect(() => {
        const world = engine.current.world
        engine.current.gravity.y = 1
        engine.current.positionIterations = 10
        engine.current.velocityIterations = 10
        let walls: Matter.Body[] = []

        function build() {
            const width = window.innerWidth
            const height = window.innerHeight
            const thick = 100
            return [
                Matter.Bodies.rectangle(width / 2, height + thick / 2, width, thick, { isStatic: true }),
                Matter.Bodies.rectangle(-thick / 2, height / 2, thick, height * 2, { isStatic: true }),
                Matter.Bodies.rectangle(width + thick / 2, height / 2, thick, height * 2, { isStatic: true }),
            ]
        }

        walls = build()
        Matter.Composite.add(world, walls)

        const mouse = Matter.Mouse.create(container.current!)
        const constraint = Matter.MouseConstraint.create(engine.current, {
            mouse,
            constraint: { stiffness: 0.2, render: { visible: false } },
        })
        Matter.Composite.add(world, constraint)

        const runner = Matter.Runner.create()
        Matter.Runner.run(runner, engine.current)

        function sync() {
            const pad = 120
            const now = Date.now()
            let dirty = false
            for (const id in bodies.current) {
                const body = bodies.current[id]
                const el = elements.current[id]
                if (!el) continue
                const escaped = body.position.y < -pad
                if (escaped) {
                    if (!outside.current[id]) outside.current[id] = now
                    else if (now - outside.current[id] > 1000) {
                        Matter.Body.setPosition(body, { x: window.innerWidth / 2, y: margin + el.offsetHeight })
                        Matter.Body.setVelocity(body, { x: 0, y: 0 })
                        delete outside.current[id]
                        gsap.fromTo(el, { scale: 0.4 }, { scale: 1, duration: 0.4, ease: 'back.out(1.7)' })
                    }
                } else {
                    delete outside.current[id]
                }
                gsap.set(el, {
                    left: body.position.x - el.offsetWidth / 2,
                    top: body.position.y - el.offsetHeight / 2,
                    rotate: body.angle * (180 / Math.PI),
                })
                if (body.speed > 0.05) dirty = true
            }
            if (dirty && now - lastSave.current > 500) {
                lastSave.current = now
                update(prev => prev.map(t => {
                    const body = bodies.current[t.id]
                    return body ? { ...t, x: body.position.x, y: body.position.y } : t
                }))
            }
        }
        gsap.ticker.add(sync)

        function resize() {
            Matter.Composite.remove(world, walls)
            walls = build()
            Matter.Composite.add(world, walls)
        }
        window.addEventListener('resize', resize)

        return () => {
            window.removeEventListener('resize', resize)
            gsap.ticker.remove(sync)
            Matter.Runner.stop(runner)
            Matter.Composite.clear(world, false)
            Matter.Engine.clear(engine.current)
        }
    }, [])

    useEffect(() => {
        function handle(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                e.stopPropagation()
                setOpen(true)
            }
        }
        window.addEventListener('keydown', handle, { capture: true })
        return () => window.removeEventListener('keydown', handle, { capture: true })
    }, [])

    function spawn(text: string) {
        const id = crypto.randomUUID()
        update(prev => [...prev, { id, text }])
    }

    function mount(id: string, el: HTMLDivElement | null) {
        if (el) {
            elements.current[id] = el
            if (!bodies.current[id]) {
                const width = el.offsetWidth
                const height = el.offsetHeight
                const task = tasks.find(t => t.id === id)
                let x = margin + width / 2 + Math.random() * (window.innerWidth - margin * 2 - width)
                let y = margin + height
                if (task?.x !== undefined && task?.y !== undefined) {
                    x = task.x
                    y = task.y
                }
                const body = Matter.Bodies.rectangle(x, y, width, height, {
                    chamfer: { radius: height / 2 },
                    restitution: 0.2,
                    friction: 0.5,
                    density: 0.001,
                    label: id,
                })
                bodies.current[id] = body
                Matter.Composite.add(engine.current.world, body)
            }
        } else {
            delete elements.current[id]
        }
    }

    return (
        <div ref={container} className="relative w-screen h-screen bg-black overflow-hidden">
            {tasks.map(task => (
                <Pill key={task.id} task={task} mount={mount} explode={explode} />
            ))}
            {open && <Input submit={t => { spawn(t); setOpen(false) }} close={() => setOpen(false)} />}
        </div>
    )
}