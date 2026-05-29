# CRM CSV Sanitizer

Business-safe web app to sanitize raw lead CSVs into a strict fixed schema for CRM import.

## What It Does

- Upload one or multiple `.csv` files in one shot.
- Auto-detects header row (checks first 10 rows).
- Validates mandatory fields with alias support:
  - `full_name`
  - `phone_number`
  - `campaign_id`
  - `platform`
- Sanitizes key fields:
  - Phone number -> keeps last 10 digits
  - Campaign ID -> keeps numeric digits only
  - Email -> generated from sanitized phone (`<phone>@gmail.com`)
  - City -> extracted from mapped city/address column
- Produces a strict output schema and per-file logs.

## Multi-file Download Behavior

- Each processed file keeps its own **Download** button.
- When 2+ files are processed, **Download Combined Sanitized** appears.
- **Download Combined Sanitized** creates one combined CSV (Excel-openable) where rows are sorted by:
  1. `campaign_name` (primary)
  2. `ad_name` (fallback when campaign name is missing)
- Sort order is ascending (`A -> Z`).

## Time Filter (created_time)

- A time-only filter widget is available in the dashboard.
- If time is selected (example `10:00`), only rows with `created_time` time `>= 10:00` are included.
- Date is ignored for filtering; only the time part from `created_time` is used.
- If no time is selected (`None (All)`), all rows are included.
- This applies to both:
  - individual sanitized file downloads
  - combined sanitized download

## Output Schema Notes

- Output column order is fixed and enforced.
- The schema intentionally includes a duplicate `Coloumn 10` header to match the expected downstream format.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

The app is configured to build without external font fetch requirements.

## Scripts

- `npm run dev` - start development server
- `npm run lint` - run ESLint
- `npm run build` - create production build
- `npm run start` - run production server
