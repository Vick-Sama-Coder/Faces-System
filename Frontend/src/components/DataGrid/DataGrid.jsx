import { useMemo } from "react"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community"
import { Inbox, Loader2 } from "lucide-react"
import "./DataGrid.css"

ModuleRegistry.registerModules([AllCommunityModule])

const facesGridTheme = themeQuartz.withParams({
    accentColor: "#6D35C8",
    backgroundColor: "#FFFFFF",
    foregroundColor: "#17151F",
    borderColor: "#E5E3EA",
    browserColorScheme: "light",
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    headerBackgroundColor: "#FAF9FC",
    headerTextColor: "#6F6B78",
    headerFontFamily: "Manrope, sans-serif",
    headerFontSize: 12,
    headerFontWeight: 700,
    rowHeight: 60,
    headerHeight: 46,
    wrapperBorderRadius: 16,
    rowHoverColor: "#FAF8FE",
    selectedRowBackgroundColor: "#F5F2FC",
    oddRowBackgroundColor: "#FFFFFF",
    cellHorizontalPadding: 16,
    borderRadius: 10,
    paginationPanelHeight: 54,
    iconButtonColor: "#6F6B78",
    iconButtonHoverColor: "#6D35C8",
    iconButtonHoverBackgroundColor: "#F5F2FC"
})

const defaultColDef = {
    flex: 1,
    minWidth: 110,
    sortable: true,
    resizable: true,
    filter: true,
    suppressMovable: true
}

const localeText = {
    page: "Página",
    to: "a",
    of: "de",
    next: "Seguinte",
    last: "Última",
    first: "Primeira",
    previous: "Anterior",
    loadingOoo: "A carregar...",
    noRowsToShow: "Sem registos",
    pageSizeSelectorLabel: "Registos por página:",
    ariaSearchFilterValues: "Pesquisar valores do filtro"
}

function GridSkeleton() {
    return (
        <div className="faces-grid-skeleton" aria-label="A carregar dados">
            <div className="faces-grid-skeleton-head">
                {Array.from({ length: 6 }).map((_, index) => (
                    <span key={`head-${index}`} />
                ))}
            </div>
            {Array.from({ length: 6 }).map((_, row) => (
                <div className="faces-grid-skeleton-row" key={`row-${row}`}>
                    {Array.from({ length: 6 }).map((_, col) => (
                        <span key={`cell-${row}-${col}`} />
                    ))}
                </div>
            ))}
            <div className="faces-grid-skeleton-loading">
                <Loader2 size={16} />
                A carregar dados...
            </div>
        </div>
    )
}

function DataGrid({
    rowData = [],
    columnDefs = [],
    loading = false,
    onGridReady,
    onRowDoubleClicked,
    emptyTitle = "Sem registos",
    emptyMessage = "Ainda não existem dados para apresentar.",
    emptyIcon: EmptyIcon = Inbox,
    emptyAction,
    pageSize = 10,
    className = ""
}) {
    const getRowId = useMemo(() => (params) => String(params.data?.id ?? params.rowIndex), [])
    const hasRows = rowData.length > 0

    if (loading && !hasRows) {
        return (
            <div className={`faces-grid-shell ${className}`.trim()}>
                <GridSkeleton />
            </div>
        )
    }

    if (!loading && !hasRows) {
        return (
            <div className={`faces-grid-shell ${className}`.trim()}>
                <div className="faces-grid-empty">
                    <span className="faces-grid-empty-icon">
                        <EmptyIcon size={30} strokeWidth={1.8} />
                    </span>
                    <strong>{emptyTitle}</strong>
                    <p>{emptyMessage}</p>
                    {emptyAction && <div className="faces-grid-empty-action">{emptyAction}</div>}
                </div>
            </div>
        )
    }

    return (
        <div className={`faces-grid-shell ${onRowDoubleClicked ? "row-clickable" : ""} ${className}`.trim()}>
            <div className="faces-grid">
                <AgGridReact
                    theme={facesGridTheme}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    getRowId={getRowId}
                    loading={loading}
                    pagination
                    paginationPageSize={pageSize}
                    paginationPageSizeSelector={[10, 20, 50]}
                    localeText={localeText}
                    onGridReady={onGridReady}
                    onRowDoubleClicked={onRowDoubleClicked}
                    suppressCellFocus
                    animateRows
                    ensureDomOrder
                    tooltipShowDelay={250}
                />
            </div>
        </div>
    )
}

export default DataGrid
