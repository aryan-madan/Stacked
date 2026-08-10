import type { Task } from './task'

const key = 'stacked'
const viewKey = 'stackedview'

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

export function loadView(): 'pit' | 'list' {
    const raw = localStorage.getItem(viewKey)
    return raw === 'list' ? 'list' : 'pit'
}

export function saveView(view: 'pit' | 'list') {
    localStorage.setItem(viewKey, view)
}