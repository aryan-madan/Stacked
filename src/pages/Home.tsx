import Pit from '../components/Pit'
import type { Task } from '../helper/task'

type Props = {
    tasks: Task[]
    update: React.Dispatch<React.SetStateAction<Task[]>>
}

export default function Home({ tasks, update }: Props) {
    return <Pit tasks={tasks} update={update} />
}