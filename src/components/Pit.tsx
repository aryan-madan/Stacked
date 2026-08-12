import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react'
import Matter from 'matter-js'
import gsap from 'gsap'
import Pill from './Pill'
import { burst } from '../helper/burst'
import type { Task } from '../helper/task'
import { impact } from '../helper/haptic'
import { watchTilt } from '../helper/motion'

const margin = 48

type Props = {
    tasks: Task[]
    update: React.Dispatch<React.SetStateAction<Task[]>>
    record?: () => void
    filter?: string
    onToggleView?: () => void
}

export type PitHandle = {
    explode: (id: string) => void
    hide: (after?: () => void) => void
    show: () => void
    vanish: (ids: string[], after?: () => void) => void
}

const Pit = forwardRef<PitHandle, Props>(function Pit({ tasks, update, record, filter, onToggleView }, ref) {
    const container = useRef<HTMLDivElement>(null)
    const hint = useRef<HTMLDivElement>(null)
    const engine = useRef(Matter.Engine.create())
    const bodies = useRef<Record<string, Matter.Body>>({})
    const elements = useRef<Record<string, HTMLDivElement>>({})
    const outside = useRef<Record<string, number>>({})
    const removing = useRef<Record<string, boolean>>({})
    const lastSave = useRef(0)
    const tasksRef = useRef(tasks)
    const tiltX = useRef(0)
    const tiltY = useRef(0)

    const lastBgTap = useRef<number>(0)
    const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    function handleBackgroundTap(e: React.PointerEvent) {
        if ((e.target as HTMLElement).closest('[data-pill-item="true"]')) {
            return
        }
        const now = Date.now()
        if (now - lastBgTap.current < 300) {
            if (tapTimer.current) clearTimeout(tapTimer.current)
            lastBgTap.current = 0
            onToggleView?.()
        } else {
            lastBgTap.current = now
            tapTimer.current = setTimeout(() => {
                lastBgTap.current = 0
            }, 300)
        }
    }

    useEffect(() => {
        let mounted = true
        let unsub: (() => void) | undefined
        watchTilt((x, y) => {
            tiltX.current = tiltX.current * 0.75 + x * 0.25
            tiltY.current = tiltY.current * 0.75 + y * 0.25
            engine.current.gravity.x = tiltX.current
            engine.current.gravity.y = tiltY.current
        }).then(fn => {
            if (mounted) unsub = fn
            else fn()
        })
        return () => {
            mounted = false
            unsub?.()
        }
    }, [])

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
            restitution: 0.25,
            friction: 0.4,
            frictionAir: 0.008,
            density: 0.0015,
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
        impact()
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
        engine.current.gravity.scale = 0.001
        engine.current.gravity.y = 1.0
        engine.current.positionIterations = 10
        engine.current.velocityIterations = 10

        const thickness = 200
        let width = window.innerWidth
        let height = window.innerHeight

        const bottomWall = Matter.Bodies.rectangle(width / 2, height + thickness / 2, width * 2, thickness, {
            isStatic: true,
            restitution: 0.2,
            friction: 0.5,
        })
        const leftWall = Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height * 4, {
            isStatic: true,
            restitution: 0.2,
            friction: 0.5,
        })
        const rightWall = Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height * 4, {
            isStatic: true,
            restitution: 0.2,
            friction: 0.5,
        })

        Matter.Composite.add(world, [bottomWall, leftWall, rightWall])

        const handleResize = () => {
            width = window.innerWidth
            height = window.innerHeight
            Matter.Body.setPosition(bottomWall, { x: width / 2, y: height + thickness / 2 })
            Matter.Body.setPosition(leftWall, { x: -thickness / 2, y: height / 2 })
            Matter.Body.setPosition(rightWall, { x: width + thickness / 2, y: height / 2 })
        }

        window.addEventListener('resize', handleResize)

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

                const escapedTop = body.position.y < -pad

                if (escapedTop) {
                    if (!outside.current[id]) outside.current[id] = now
                    else if (now - outside.current[id] > 1000) {
                        Matter.Body.setPosition(body, { x: width / 2, y: margin + el.offsetHeight })
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

        return () => {
            window.removeEventListener('resize', handleResize)
            gsap.ticker.remove(sync)
            Matter.Runner.stop(runner)
            Matter.Composite.clear(world, false)
            Matter.Engine.clear(engine.current)
            bodies.current = {}
            outside.current = {}
        }
    }, [createBody, update])

    return (
        <div ref={container} onPointerDown={handleBackgroundTap} className="relative w-screen h-screen bg-black overflow-hidden">
            <div
                ref={hint}
                className={`absolute inset-0 flex items-center justify-center pointer-events-none text-white/25 text-sm tracking-wide text-center px-8 ${tasks.length === 0 ? 'opacity-100' : 'opacity-0'}`}
            >
                <span className="pointer-coarse:hidden">press ⌘K to add a task</span>
                <span className="hidden pointer-coarse:inline">pull down to add a task</span>
            </div>
            {tasks.map(task => {
                const match = !filter || task.text.toLowerCase().includes(filter.toLowerCase())
                return (
                    <div key={task.id} data-pill-item="true" className="contents">
                        <Pill task={task} mount={mount} explode={explode} dim={!match} />
                    </div>
                )
            })}
        </div>
    )
})

export default Pit