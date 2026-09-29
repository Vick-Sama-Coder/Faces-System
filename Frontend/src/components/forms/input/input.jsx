import './input.css'

function Input ({ type, icon, labelId, labelName, className, value, placeholder, ...rest }) {
return(
    <>
        <p><label htmlFor={labelId}>{labelName}</label></p>
        <label className='icony' htmlFor={labelId}>{icon}</label>
        <input className={className} type={type} id={labelId} value={value} placeholder={placeholder} {...rest} />
    </>
)
}
export default Input