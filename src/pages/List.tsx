import { useRef } from 'react'
import { burst } from '../helper/burst'
import type { Task } from '../helper/task'

type Props = {
    tasks: Task[]
    complete: (id: string) => void
}

export default function List({ tasks, complete }: Props) {
    const root = useRef<HTMLDivElement>(null)

    function check(id: string, e: React.MouseEvent<HTMLButtonElement>) {
        const rect = e.currentTarget.getBoundingClientRect()
        const parent = root.current?.getBoundingClientRect()
        if (parent && root.current) {
            burst(rect.left - parent.left + rect.width / 2, rect.top - parent.top + rect.height / 2, root.current)
        }
        complete(id)
    }

    return (
        <div ref={root} className="relative w-screen h-screen text-white p-16 overflow-auto">
            <div className="max-w-md mx-auto flex flex-col gap-4">
                {tasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 text-lg">
                        <button
                            onClick={e => check(task.id, e)}
                            className="w-5 h-5 rounded-full border border-white/40 hover:border-white transition shrink-0"
                        />
                        {task.text}
                    </div>
                ))}
            </div>
        </div>
    )
}