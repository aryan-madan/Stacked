import type { Task } from './task'

const key = 'stacked'

export function load(): Task[] {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export function save(tasks: Task[]) {
    localStorage.setItem(key, JSON.stringify(tasks))
}