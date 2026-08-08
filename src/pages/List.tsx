import type { Task } from '../helper/task'

type Props = {
    tasks: Task[]
    update: React.Dispatch<React.SetStateAction<Task[]>>
}

export default function List({ tasks, update }: Props) {
    function done(id: string) {
        update(prev => prev.filter(t => t.id !== id))
    }

    return (
        <div className="w-screen h-screen text-white p-16 overflow-auto">
            <div className="max-w-md mx-auto flex flex-col gap-4">
                {tasks.map(task => (
                    <label key={task.id} className="flex items-center gap-3 text-lg cursor-pointer">
                        <input type="checkbox" onChange={() => done(task.id)} className="w-4 h-4" />
                        {task.text}
                    </label>
                ))}
            </div>
        </div>
    )
}