import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { ColumnInfo, Row } from './types'

export type ExportFormat = 'csv' | 'xlsx' | 'json'

// Exports rows in the order given, so callers pass the visible, filtered, sorted rows
// and the columns in their current display order.
export function exportRows(
  format: ExportFormat,
  columns: ColumnInfo[],
  rows: Row[],
  fileStem: string,
): void {
  const headers = columns.map((column) => column.title)
  const cells = rows.map((row) => columns.map((column) => row[column.key] ?? null))
  const fileName = `${fileStem}.${format}`

  switch (format) {
    case 'csv': {
      // The BOM makes Excel read the file as UTF-8.
      const text = '﻿' + Papa.unparse({ fields: headers, data: cells })
      saveBlob(new Blob([text], { type: 'text/csv;charset=utf-8' }), fileName)
      break
    }
    case 'xlsx': {
      const sheet = XLSX.utils.aoa_to_sheet([headers, ...cells])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, sheet, 'Data')
      const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
      saveBlob(
        new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        fileName,
      )
      break
    }
    case 'json': {
      const records = rows.map((row) =>
        Object.fromEntries(columns.map((column) => [column.title, row[column.key] ?? null])),
      )
      saveBlob(new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' }), fileName)
      break
    }
  }
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
