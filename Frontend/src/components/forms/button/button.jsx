import './button.css'

function Button({children}){
    return(
        <div>
            <button className="btnclass">
            {children}
        </button>
        </div>
    )
}
export default Button