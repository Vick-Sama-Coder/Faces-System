import './input.css'

//`error` mostra a mensagem de validacao por campo; `icon`/`labelName` opcionais
function Input ({ type, icon, labelId, labelName, className, value, placeholder, error, ...rest }) {
const ehSubmit = type === "submit" || type === "button";

return(
    <>
        {labelName && <p><label htmlFor={labelId}>{labelName}</label></p>}
        {icon && <label className='icony' htmlFor={labelId}>{icon}</label>}
        <input
            className={`${className || ""}${error ? " input-invalido" : ""}`}
            type={type}
            id={labelId}
            value={ehSubmit ? undefined : value}
            defaultValue={ehSubmit ? value : undefined}
            placeholder={placeholder}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error && labelId ? `${labelId}-erro` : undefined}
            {...rest}
        />
        {error && <span className="field-error" id={labelId ? `${labelId}-erro` : undefined} role="alert">{error}</span>}
    </>
)
}
export default Input