import './button.css'

function Button({children, btnClick}){
    return(
        <div>
            <button onClick={btnClick} className="btnclass">
            {children}
        </button>
        </div>
    )
}
export default Button