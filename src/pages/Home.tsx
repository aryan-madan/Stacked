import { forwardRef } from 'react'
import Pit, { type PitHandle } from '../components/Pit'
import type { Task } from '../helper/task'

type Props = {
    tasks: Task[]
    update: React.Dispatch<React.SetStateAction<Task[]>>
    record?: () => void
}

const Home = forwardRef<PitHandle, Props>(function Home({ tasks, update, record }, ref) {
    return <Pit ref={ref} tasks={tasks} update={update} record={record} />
})

export default Home