import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import Matter from 'matter-js'
import gsap from 'gsap'
import Pill from './Pill'
import { burst } from '../helper/burst'
import type { Task } from '../helper/task'

const margin = 48

type Props = {
    tasks: Task[]
    update: React.Dispatch<React.SetStateAction<Task[]>>
    record?: () => void
    filter?: string
}

export type PitHandle = {
    explode: (id: string) => void
    hide: (after?: () => void) => void
    show: () => void
    vanish: (ids: string[], after?: () => void) => void
}

const Pit = forwardRef<PitHandle, Props>(function Pit({ tasks, update, record, filter }, ref) {
    const container = useRef<HTMLDivElement>(null)
    const hint = useRef<HTMLDivElement>(null)
    const engine = useRef(Matter.Engine.create())
    const bodies = useRef<Record<string, Matter.Body>>({})
    const elements = useRef<Record<string, HTMLDivElement>>({})
    const outside = useRef<Record<string, number>>({})
    const removing = useRef<Record<string, boolean>>({})
    const lastSave = useRef(0)
    const tasksRef = useRef(tasks)
    tasksRef.current = tasks

    const createBody = useCallback((id: string) => {
        if (removing.current[id]) return
        const el = elements.current[id]
        if (!el || bodies.current[id]) return
        const width = el.offsetWidth || 120
        const height = el.offsetHeight || 48
        const task = tasksRef.current.find(t => t.id === id)
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
        gsap.set(el, { left: x - width / 2, top: y - height / 2, rotate: 0 })
        gsap.killTweensOf(el)
        gsap.fromTo(el, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.7)' })
    }, [])

    const mount = useCallback((id: string, el: HTMLDivElement | null) => {
        if (el) {
            elements.current[id] = el
            createBody(id)
        } else {
            if (bodies.current[id]) {
                Matter.Composite.remove(engine.current.world, bodies.current[id])
                delete bodies.current[id]
            }
            delete elements.current[id]
            delete removing.current[id]
        }
    }, [createBody])

    function explode(id: string) {
        record?.()
        removing.current[id] = true
        const body = bodies.current[id]
        const el = elements.current[id]
        const angle = body ? body.angle * (180 / Math.PI) : 0
        if (body && container.current) {
            burst(body.position.x, body.position.y, container.current, engine.current.world)
            Matter.Composite.remove(engine.current.world, body)
        }
        delete bodies.current[id]
        if (el) {
            gsap.killTweensOf(el)
            gsap.set(el, { rotate: angle })
            gsap.to(el, {
                scale: 0,
                opacity: 0,
                rotate: angle,
                duration: 0.3,
                ease: 'back.in(1.4)',
                onComplete: () => update(prev => prev.filter(t => t.id !== id)),
            })
        } else {
            update(prev => prev.filter(t => t.id !== id))
        }
    }

    const vanish = useCallback((ids: string[], after?: () => void) => {
        if (!ids.length) {
            after?.()
            return
        }
        let remaining = ids.length
        ids.forEach(id => {
            removing.current[id] = true
            const body = bodies.current[id]
            const el = elements.current[id]
            if (body) {
                Matter.Composite.remove(engine.current.world, body)
                delete bodies.current[id]
            }
            if (el) {
                gsap.killTweensOf(el)
                gsap.timeline({
                    onComplete: () => {
                        remaining -= 1
                        if (remaining === 0) after?.()
                    },
                })
                    .to(el, { scale: 1.08, duration: 0.08, ease: 'power1.out' })
                    .to(el, { scale: 0, opacity: 0, duration: 0.22, ease: 'power2.in' })
            } else {
                remaining -= 1
                if (remaining === 0) after?.()
            }
        })
    }, [])

    const hide = useCallback((after?: () => void) => {
        const ids = Object.keys(bodies.current)
        if (!ids.length) {
            after?.()
            return
        }
        ids.forEach(id => Matter.Body.setStatic(bodies.current[id], true))
        ids.forEach((id, i) => {
            const el = elements.current[id]
            if (!el) return
            gsap.killTweensOf(el)
            gsap.to(el, { y: 260, opacity: 0, duration: 0.4, delay: i * 0.02, ease: 'power2.in' })
        })
        window.setTimeout(() => after?.(), 400 + ids.length * 20)
    }, [])

    const show = useCallback(() => {
        for (const id in bodies.current) {
            const body = bodies.current[id]
            const el = elements.current[id]
            if (!el) continue
            Matter.Body.setPosition(body, { x: body.position.x, y: -el.offsetHeight })
            Matter.Body.setVelocity(body, { x: 0, y: 0 })
            Matter.Body.setStatic(body, false)
            gsap.killTweensOf(el)
            gsap.set(el, { y: 0, opacity: 0 })
            gsap.to(el, { opacity: 1, duration: 0.25 })
        }
    }, [])

    useImperativeHandle(ref, () => ({ explode, hide, show, vanish }))

    useEffect(() => {
        gsap.to(hint.current, { opacity: tasks.length === 0 ? 1 : 0, duration: 0.4, ease: 'power2.out' })
    }, [tasks.length])

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

        for (const id in elements.current) {
            createBody(id)
        }

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
            for (const id in elements.current) {
                if (!bodies.current[id] && !removing.current[id]) {
                    createBody(id)
                }
            }
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
            const width = window.innerWidth
            const height = window.innerHeight
            for (const id in bodies.current) {
                const body = bodies.current[id]
                const el = elements.current[id]
                if (!el) continue
                const halfWidth = el.offsetWidth / 2
                const halfHeight = el.offsetHeight / 2
                const x = Math.min(Math.max(body.position.x, halfWidth), width - halfWidth)
                const y = Math.min(body.position.y, height - halfHeight)
                Matter.Body.setPosition(body, { x, y })
                Matter.Body.setVelocity(body, { x: 0, y: 0 })
            }
        }
        window.addEventListener('resize', resize)

        return () => {
            window.removeEventListener('resize', resize)
            gsap.ticker.remove(sync)
            Matter.Runner.stop(runner)
            Matter.Composite.clear(world, false)
            Matter.Engine.clear(engine.current)
            bodies.current = {}
            outside.current = {}
        }
    }, [createBody, update])

    return (
        <div ref={container} className="relative w-screen h-screen bg-black overflow-hidden">
            <div
                ref={hint}
                className={`absolute inset-0 flex items-center justify-center pointer-events-none text-white/25 text-sm tracking-wide ${tasks.length === 0 ? 'opacity-100' : 'opacity-0'}`}
            >
                press ⌘K to add a task
            </div>
            {tasks.map(task => {
                const match = !filter || task.text.toLowerCase().includes(filter.toLowerCase())
                return <Pill key={task.id} task={task} mount={mount} explode={explode} dim={!match} />
            })}
        </div>
    )
})

export default Pit