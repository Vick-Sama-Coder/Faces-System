import "./title.css"
import { Bell } from "lucide-react"
function Title({title, classname}){
    return(
        <div className={classname}>
            <h1>{title}</h1>
            <div><Bell/></div>
        </div>
    )
}
export default Title