// TabulatorFull includes the header filter module, which the default export leaves out.
import { TabulatorFull as Tabulator, type ColumnDefinition } from 'tabulator-tables'
import type { Dataset, Row } from './types'

// Called whenever filters change, with how many rows are currently visible.
export type FilterListener = (visibleRows: number) => void

export function createGrid(element: HTMLElement, dataset: Dataset, onFilter: FilterListener): Tabulator {
  const columns: ColumnDefinition[] = dataset.columns.map((column) => ({
    title: column.title,
    field: column.key,
    sorter: inferSorter(dataset.rows, column.key),
    headerFilter: 'input',
    headerFilterPlaceholder: 'filter',
    minWidth: 80,
  }))

  // Data loads after the constructor returns, so the listeners are attached before it runs.
  const table = new Tabulator(element, {
    data: dataset.rows,
    columns,
    height: '70vh',
    movableColumns: true,
    placeholder: 'No rows to display',
  })

  table.on('dataLoaded', (rows) => onFilter(rows.length))
  table.on('dataFiltered', (_filters, rows) => onFilter(rows.length))

  return table
}

// Sort numerically when every non-empty value in the column is a number, otherwise as text.
function inferSorter(rows: Row[], key: string): 'number' | 'string' {
  let hasValue = false
  for (const row of rows) {
    const value = row[key]
    if (value === null || value === '') continue
    hasValue = true
    if (typeof value === 'number') continue
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) continue
    return 'string'
  }
  return hasValue ? 'number' : 'string'
}
