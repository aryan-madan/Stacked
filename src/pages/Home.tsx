import { forwardRef } from 'react'
import Pit, { type PitHandle } from '../components/Pit'
import type { Task } from '../helper/task'

type Props = {
    tasks: Task[]
    update: React.Dispatch<React.SetStateAction<Task[]>>
    record?: () => void
    filter?: string
}

const Home = forwardRef<PitHandle, Props>(function Home({ tasks, update, record, filter }, ref) {
    return <Pit ref={ref} tasks={tasks} update={update} record={record} filter={filter} />
})

export default Home