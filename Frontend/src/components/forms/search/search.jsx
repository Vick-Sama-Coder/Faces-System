import './search.css'
//import { SearchIcon } from 'lucide-react'

function Search(searchId, nameId, placeholderInfo){
    return(
        <div className="search-flex">
            
        <input  className='search-comp' type="search" name={nameId}  placeholder={placeholderInfo} id={searchId} />
        </div>
        
    )
}

export default Search