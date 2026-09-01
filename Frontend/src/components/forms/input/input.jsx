import './input.css'

function Input ({ type, icon, labelId, labelName, className, value, placeholder }) {
return(
    <>
        <p><label htmlFor={labelId}>{labelName}</label></p>
        <label className='icon' htmlFor={labelId}>{icon}</label>
        <input className={className} type={type} id={labelId} value={value} placeholder={placeholder} />
    </>
)
}
export default Input