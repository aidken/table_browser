import 'tabulator-tables/dist/css/tabulator.min.css'
import './style.css'
import type { Tabulator } from 'tabulator-tables'
import { parseFile, type ParsedFile } from './parsers'
import { createGrid } from './grid'
import { exportRows, type ExportFormat } from './download'
import type { ColumnInfo, Dataset, Row } from './types'

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Missing #${id} in index.html`)
  return node as T
}

const status = element<HTMLParagraphElement>('status')
const dropZone = element<HTMLElement>('drop-zone')
const viewer = element<HTMLElement>('viewer')
const fileInput = element<HTMLInputElement>('file-input')
const fileName = element<HTMLElement>('file-name')
const sheetControl = element<HTMLLabelElement>('sheet-control')
const sheetSelect = element<HTMLSelectElement>('sheet-select')
const rowCount = element<HTMLElement>('row-count')
const formatSelect = element<HTMLSelectElement>('format-select')
const downloadButton = element<HTMLButtonElement>('download-button')
const restoreButton = element<HTMLButtonElement>('restore-button')
const resetButton = element<HTMLButtonElement>('reset-button')
const gridElement = element<HTMLElement>('grid')

let parsed: ParsedFile | null = null
let currentFile = ''
let currentDataset: Dataset | null = null
let table: Tabulator | null = null

function showStatus(message: string, isError = false): void {
  status.textContent = message
  status.classList.toggle('error', isError)
}

async function openFile(file: File): Promise<void> {
  showStatus(`Reading ${file.name}…`)
  try {
    parsed = await parseFile(file)
  } catch (error) {
    showStatus(error instanceof Error ? error.message : 'Could not read that file.', true)
    return
  }

  currentFile = file.name
  fileName.textContent = file.name
  sheetSelect.replaceChildren(
    ...parsed.sheetNames.map((name) => new Option(name, name)),
  )
  sheetControl.hidden = parsed.sheetNames.length < 2

  dropZone.hidden = true
  viewer.hidden = false
  showStatus('')
  loadSheet(parsed.sheetNames[0])
}

function loadSheet(name: string): void {
  if (!parsed) return
  currentDataset = parsed.getSheet(name)
  sheetSelect.value = name
  mountGrid(currentDataset)
}

// Builds a fresh grid from the original data, so sorts, filters, and column moves start over.
function mountGrid(dataset: Dataset): void {
  table?.destroy()
  table = createGrid(gridElement, dataset, (visibleRows) => {
    rowCount.textContent = `${visibleRows.toLocaleString()} of ${dataset.rows.length.toLocaleString()} rows`
  })
}

function restore(): void {
  if (currentDataset) mountGrid(currentDataset)
}

// Exports the rows and columns the user currently sees: filtered, sorted, and reordered.
function downloadView(): void {
  if (!table || !currentDataset) return

  const titles = new Map<string, string>(currentDataset.columns.map((column) => [column.key, column.title]))
  const columns: ColumnInfo[] = table.getColumns().map((column) => {
    const key = column.getField()
    return { key, title: titles.get(key) ?? key }
  })
  const rows = table.getData('active') as Row[]
  const sheet = sheetControl.hidden ? '' : `-${sheetSelect.value}`
  const stem = `${currentFile.replace(/\.[^.]+$/, '')}${sheet}`

  exportRows(formatSelect.value as ExportFormat, columns, rows, stem)
}

function reset(): void {
  table?.destroy()
  table = null
  parsed = null
  currentDataset = null
  fileInput.value = ''
  viewer.hidden = true
  dropZone.hidden = false
  showStatus('')
}

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  if (file) void openFile(file)
})

// Accept drops anywhere on the page, including after a file is already open.
window.addEventListener('dragover', (event) => event.preventDefault())
window.addEventListener('drop', (event) => {
  event.preventDefault()
  const file = event.dataTransfer?.files[0]
  if (file) void openFile(file)
})

sheetSelect.addEventListener('change', () => loadSheet(sheetSelect.value))
downloadButton.addEventListener('click', downloadView)
restoreButton.addEventListener('click', restore)
resetButton.addEventListener('click', reset)
