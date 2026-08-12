import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

export async function tap() {
    if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light })
    } else if (navigator.vibrate) {
        navigator.vibrate(10)
    }
}

export async function impact() {
    if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium })
    } else if (navigator.vibrate) {
        navigator.vibrate(25)
    }
}

export async function success() {
    if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Success })
    } else if (navigator.vibrate) {
        navigator.vibrate([10, 30, 10])
    }
}