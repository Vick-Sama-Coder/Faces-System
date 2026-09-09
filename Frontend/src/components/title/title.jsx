import "./title.css"
function Title({title, classname}){
    return(
        <div className={classname}>
            <h1>{title}</h1>
        </div>
    )
}
export default Title