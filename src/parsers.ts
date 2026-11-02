import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { parquetReadObjects, type AsyncBuffer } from 'hyparquet'
import type { CellValue, Dataset } from './types'

export interface ParsedFile {
  sheetNames: string[]
  getSheet(name: string): Dataset
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  switch (extension) {
    case 'csv':
      return single(parseCsv(await file.text()))
    case 'xlsx':
    case 'xls':
      return parseWorkbook(new Uint8Array(await file.arrayBuffer()))
    case 'parquet':
      return single(await parseParquet(file))
    default:
      throw new Error(`Unsupported file type ".${extension}". Use CSV, Excel, or Parquet.`)
  }
}

function single(dataset: Dataset): ParsedFile {
  return { sheetNames: [''], getSheet: () => dataset }
}

function parseCsv(text: string): Dataset {
  // Strip a UTF-8 byte order mark, which Excel often writes at the start of CSV files.
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ''), { skipEmptyLines: 'greedy' })
  const [header = [], ...body] = result.data
  return buildDataset(header, body)
}

function parseWorkbook(data: Uint8Array): ParsedFile {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true })
  return {
    sheetNames: workbook.SheetNames,
    getSheet(name) {
      const sheet = workbook.Sheets[name]
      if (!sheet) throw new Error(`Sheet "${name}" not found.`)
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: null,
        blankrows: false,
        raw: true,
      })
      const [header = [], ...body] = rows
      return buildDataset(header, body)
    },
  }
}

async function parseParquet(file: File): Promise<Dataset> {
  const buffer = await file.arrayBuffer()
  const asyncBuffer: AsyncBuffer = {
    byteLength: buffer.byteLength,
    slice: (start, end) => buffer.slice(start, end),
  }
  const objects = await parquetReadObjects({ file: asyncBuffer })
  const names = Object.keys(objects[0] ?? {})
  return buildDataset(
    names,
    objects.map((object) => names.map((name) => object[name])),
  )
}

// Turns a header row and raw body rows into a Dataset with normalized cell values.
function buildDataset(headerRow: unknown[], bodyRows: unknown[][]): Dataset {
  // A reduce, not Math.max(...spread), because spreading large row counts overflows the stack.
  const width = bodyRows.reduce((max, row) => Math.max(max, row.length), headerRow.length)
  const seenTitles = new Map<string, number>()

  const columns = Array.from({ length: width }, (_, index) => {
    const base = String(headerRow[index] ?? '').trim() || `Column ${index + 1}`
    const count = seenTitles.get(base) ?? 0
    seenTitles.set(base, count + 1)
    return {
      key: `c${index}`,
      title: count ? `${base} (${count + 1})` : base,
    }
  })

  const rows = bodyRows.map((values) => {
    const row: Record<string, CellValue> = {}
    columns.forEach((column, index) => {
      row[column.key] = normalizeValue(values[index])
    })
    return row
  })

  return { columns, rows }
}

function normalizeValue(value: unknown): CellValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'bigint') return Number(value)
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (value instanceof Uint8Array) return `<${value.byteLength} bytes>`
  return JSON.stringify(value, (_key, nested) =>
    typeof nested === 'bigint' ? Number(nested) : nested,
  )
}
