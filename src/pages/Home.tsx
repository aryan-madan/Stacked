import { forwardRef } from 'react'
import Pit from '../components/Pit'
import type { Task } from '../helper/task'

type Props = {
    tasks: Task[]
    update: React.Dispatch<React.SetStateAction<Task[]>>
}

const Home = forwardRef<{ explode: (id: string) => void }, Props>(function Home({ tasks, update }, ref) {
    return <Pit ref={ref} tasks={tasks} update={update} />
})

export default Home