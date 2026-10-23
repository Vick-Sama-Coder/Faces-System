import './search.css'

function Search({ placeholderInfo, value, onChange, name, id }) {
    return (
        <div className="search-flex">
            <input
                className="search-comp"
                type="search"
                name={name}
                id={id}
                placeholder={placeholderInfo}
                value={value}
                onChange={onChange}
            />
        </div>
    )
}

export default Search
