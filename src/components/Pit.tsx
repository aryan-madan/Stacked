import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import gsap from 'gsap'
import Pill from './Pill'
import Input from './Input'
import { burst } from '../helper/burst'
import type { Task } from '../helper/task'
import { load, save } from '../helper/storage'

const margin = 48

export default function Pit() {
    const [tasks, setTasks] = useState<Task[]>(load)
    const [open, setOpen] = useState(false)
    const container = useRef<HTMLDivElement>(null)
    const engine = useRef(Matter.Engine.create())
    const bodies = useRef<Record<string, Matter.Body>>({})
    const elements = useRef<Record<string, HTMLDivElement>>({})

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
                onComplete: () => setTasks(prev => prev.filter(t => t.id !== id)),
            })
        } else {
            setTasks(prev => prev.filter(t => t.id !== id))
        }
    }

    useEffect(() => {
        save(tasks)
    }, [tasks])

    useEffect(() => {
        const world = engine.current.world
        engine.current.gravity.y = 1
        let walls: Matter.Body[] = []

        function build() {
            const width = window.innerWidth
            const height = window.innerHeight
            const thick = 100
            return [
                Matter.Bodies.rectangle(width / 2, height + thick / 2, width, thick, { isStatic: true }),
                Matter.Bodies.rectangle(width / 2, margin - thick / 2, width, thick, { isStatic: true }),
                Matter.Bodies.rectangle(margin - thick / 2, height / 2, thick, height * 2, { isStatic: true }),
                Matter.Bodies.rectangle(width - margin + thick / 2, height / 2, thick, height * 2, { isStatic: true }),
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
            for (const id in bodies.current) {
                const body = bodies.current[id]
                const el = elements.current[id]
                if (!el) continue
                gsap.set(el, {
                    left: body.position.x - el.offsetWidth / 2,
                    top: body.position.y - el.offsetHeight / 2,
                    rotate: body.angle * (180 / Math.PI),
                })
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
                setOpen(true)
            }
        }
        window.addEventListener('keydown', handle)
        return () => window.removeEventListener('keydown', handle)
    }, [])

    function spawn(text: string) {
        const id = crypto.randomUUID()
        setTasks(prev => [...prev, { id, text }])
    }

    function mount(id: string, el: HTMLDivElement | null) {
        if (el) {
            elements.current[id] = el
            if (!bodies.current[id]) {
                const width = el.offsetWidth
                const height = el.offsetHeight
                const min = margin + width / 2
                const max = window.innerWidth - margin - width / 2
                const x = min + Math.random() * Math.max(max - min, 0)
                const body = Matter.Bodies.rectangle(x, margin + height, width, height, {
                    chamfer: { radius: height / 2 },
                    restitution: 0.3,
                    friction: 0.4,
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