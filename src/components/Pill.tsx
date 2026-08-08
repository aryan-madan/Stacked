import { useEffect, useRef } from 'react'
import type { Task } from '../types/task'

type Props = {
    task: Task
    mount: (id: string, el: HTMLDivElement | null) => void
}

export default function Pill({ task, mount }: Props) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        mount(task.id, ref.current)
        return () => mount(task.id, null)
    }, [])

    return (
        <div
            ref={ref}
            className="absolute whitespace-nowrap px-5 py-2 rounded-full bg-white text-black text-sm font-medium select-none cursor-grab active:cursor-grabbing"
        >
            {task.text}
        </div>
    )
}