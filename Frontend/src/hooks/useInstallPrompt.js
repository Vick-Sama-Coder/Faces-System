import { useSyncExternalStore } from "react"
import {
    getInstallServerSnapshot,
    getInstallSnapshot,
    subscribeInstallPrompt
} from "../services/installPrompt.js"

export function useInstallPrompt() {
    return useSyncExternalStore(
        subscribeInstallPrompt,
        getInstallSnapshot,
        getInstallServerSnapshot
    )
}
