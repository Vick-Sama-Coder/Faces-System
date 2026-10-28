import { useCallback, useSyncExternalStore } from "react"

/**
 * Observa uma media query e devolve `true` enquanto ela corresponder.
 * Usa `useSyncExternalStore` para ficar sincronizado sem efeitos manuais.
 */
export function useMediaQuery(query) {
    const subscribe = useCallback((onChange) => {
        const mediaQuery = window.matchMedia(query)
        mediaQuery.addEventListener("change", onChange)
        return () => mediaQuery.removeEventListener("change", onChange)
    }, [query])

    const getSnapshot = useCallback(
        () => window.matchMedia(query).matches,
        [query]
    )

    return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
