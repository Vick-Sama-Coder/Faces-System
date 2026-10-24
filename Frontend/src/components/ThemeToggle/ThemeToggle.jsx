import { useEffect, useId, useRef, useState } from "react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useThemeStore } from "../../store/themeStore.js"
import "./ThemeToggle.css"

const OPTIONS = [
    { value: "system", label: "Sistema", Icon: Monitor },
    { value: "light", label: "Claro", Icon: Sun },
    { value: "dark", label: "Escuro", Icon: Moon }
]

function ThemeToggle({ variant = "header" }) {
    const preference = useThemeStore((state) => state.preference)
    const resolvedTheme = useThemeStore((state) => state.resolvedTheme)
    const setPreference = useThemeStore((state) => state.setPreference)
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const buttonRef = useRef(null)
    const menuId = useId()

    const selected = OPTIONS.find((option) => option.value === preference) || OPTIONS[0]
    const CurrentIcon = selected.Icon

    useEffect(() => {
        if (!open) return undefined

        function handlePointerDown(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false)
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setOpen(false)
                buttonRef.current?.focus()
            }
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [open])

    function chooseTheme(value) {
        setPreference(value)
        setOpen(false)
        buttonRef.current?.focus()
    }

    return (
        <div
            ref={rootRef}
            className={`theme-toggle ${variant === "floating" ? "theme-toggle-floating" : ""}${open ? " is-open" : ""}`}
        >
            <button
                ref={buttonRef}
                type="button"
                className="theme-toggle-button"
                onClick={() => setOpen((isOpen) => !isOpen)}
                aria-label={`Tema: ${selected.label}. Alterar preferência de tema.`}
                aria-expanded={open}
                aria-controls={menuId}
                title={`Tema: ${selected.label}`}
            >
                <CurrentIcon size={18} strokeWidth={2.1} aria-hidden="true" />
            </button>

            {open && (
                <div
                    className="theme-menu"
                    id={menuId}
                    role="group"
                    aria-label="Preferência de tema"
                >
                    <span className="theme-menu-title">Aparência</span>

                    {OPTIONS.map(({ value, label, Icon }) => {
                        const isActive = preference === value
                        return (
                            <button
                                key={value}
                                type="button"
                                className={`theme-option${isActive ? " is-active" : ""}`}
                                onClick={() => chooseTheme(value)}
                                aria-pressed={isActive}
                            >
                                <Icon size={16} aria-hidden="true" />
                                <span>{label}</span>
                                {isActive && <Check size={15} className="theme-option-check" aria-hidden="true" />}
                            </button>
                        )
                    })}

                    <span className="theme-menu-current" aria-live="polite">
                        A usar {resolvedTheme === "dark" ? "escuro" : "claro"}
                    </span>
                </div>
            )}
        </div>
    )
}

export default ThemeToggle
