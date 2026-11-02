# table_browser

Open a CSV, Excel, or Parquet file in your browser, sort and filter it, reorder columns, and download the result. Files never leave your computer.

Live app: <https://aidken.github.io/table_browser/>

## Features

- Load `.csv`, `.xlsx`, `.xls`, or `.parquet` files by dropping them on the page or choosing them.
- Excel workbooks with several sheets get a sheet picker.
- Click a header to sort. Type in the boxes under the headers to filter.
- Drag column headers to reorder columns.
- Download the rows you see (filtered, sorted, and in the current column order) as CSV, Excel (.xlsx), or JSON.

## Tech

- [TypeScript](https://www.typescriptlang.org/) and [Vite](https://vite.dev/)
- [Tabulator](https://tabulator.info/) for the data grid
- [PapaParse](https://www.papaparse.com/) for CSV, [SheetJS](https://sheetjs.com/) for Excel, and [hyparquet](https://github.com/hyparam/hyparquet) for Parquet

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev        # start the dev server
npm run build      # type-check and build to dist/
npm run preview    # serve the built dist/ locally
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes `dist/` to GitHub Pages.

One-time setup: in the repository settings, open **Pages** and set **Source** to **GitHub Actions**.

The Vite `base` in `vite.config.ts` must match the repository name (`/table_browser/`).
