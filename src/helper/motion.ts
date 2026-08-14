import { Motion } from '@capacitor/motion'
import { Capacitor } from '@capacitor/core'

const max = 9.8
const deadzone = 0.15

function applyDeadzone(value: number): number {
    const abs = Math.abs(value)
    if (abs < deadzone) return 0
    const remapped = (abs - deadzone) / (1 - deadzone)
    return Math.sign(value) * remapped
}

export async function watchTilt(change: (x: number, y: number) => void): Promise<() => void> {
    if (Capacitor.isNativePlatform()) {
        const listener = await Motion.addListener('accel', event => {
            const rawX = event.accelerationIncludingGravity.x
            const rawY = event.accelerationIncludingGravity.y

            const normX = Math.max(-max, Math.min(max, -rawX)) / max
            const normY = Math.max(-max, Math.min(max, rawY)) / max

            const finalX = applyDeadzone(normX)
            const finalY = applyDeadzone(normY)

            change(finalX, finalY)
        })

        return () => {
            listener.remove()
        }
    }

    if (typeof window === 'undefined') return () => { }

    function handleMotion(e: DeviceMotionEvent) {
        const acc = e.accelerationIncludingGravity
        if (!acc) return

        let rawX = acc.x || 0
        let rawY = acc.y || 0

        const isIOS = typeof (DeviceMotionEvent as any).requestPermission === 'function'
        if (isIOS) {
            rawX = -rawX
            rawY = -rawY
        }

        const normX = Math.max(-max, Math.min(max, -rawX)) / max
        const normY = Math.max(-max, Math.min(max, rawY)) / max

        const finalX = applyDeadzone(normX)
        const finalY = applyDeadzone(normY)

        change(finalX, finalY)
    }

    if (
        typeof DeviceMotionEvent !== 'undefined' &&
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
        try {
            const res = await (DeviceMotionEvent as any).requestPermission()
            if (res === 'granted') {
                window.addEventListener('devicemotion', handleMotion)
                return () => window.removeEventListener('devicemotion', handleMotion)
            }
        } catch {
        }
    } else if ('DeviceMotionEvent' in window && navigator.maxTouchPoints > 0) {
        window.addEventListener('devicemotion', handleMotion)
        return () => window.removeEventListener('devicemotion', handleMotion)
    }

    return () => { }
}