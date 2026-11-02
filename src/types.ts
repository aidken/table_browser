export type CellValue = string | number | boolean | null

// Each row is keyed by ColumnInfo.key. Keys are generic ("c0", "c1", ...) so that
// odd header names (dots, duplicates, blanks) never clash with Tabulator's field lookup.
export type Row = Record<string, CellValue>

export interface ColumnInfo {
  key: string
  title: string
}

export interface Dataset {
  columns: ColumnInfo[]
  rows: Row[]
}
