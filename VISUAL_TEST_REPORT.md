# QR Scanner — Visual Test Report v2

**Date:** 2026-03-19
**Environment:** Windows 11, Chrome, Node.js 25.2.1, Docker Desktop, PostgreSQL 16 (Docker)
**Stack:** Next.js 16.1.7 · React 19.1.0 · Prisma 7.5.0 · Tailwind 4.2.1 · ESLint 9 · Vitest 3

---

## Test 1: Scanner Screen — Active Scanning
**Screenshot ID:** ss_1204gvke9
**URL:** http://localhost:3000
**Result:** ✅ PASS

**Verified:**
- Green "Scanning" status dot with label (top-left)
- Full-viewport camera feed covering entire screen (100dvh, object-cover)
- 4 animated corner brackets centered with scan line sweeping down
- Semi-transparent dark overlay outside scan region
- "View History" navigation button at bottom with backdrop-blur
- No horizontal scroll, no layout overflow

---

## Test 2: History Screen — Populated Cards
**Screenshot ID:** ss_5275r3g6l
**URL:** http://localhost:3000/history
**Result:** ✅ PASS

**Verified:**
- Header: back arrow + "Scan History" heading + SSE status dot + refresh button
- Blue "QR" badges on QR_CODE scans, amber "EAN-13" badge on barcode
- URL values rendered as blue underlined tappable links
- Non-URL value (5901234123457) rendered as plain white text
- Relative timestamps ("about 1 hour ago")
- Copy button (clipboard icon) on each card
- "Device info" expandable chevrons on cards with device data
- Consistent card spacing (gap-3), rounded borders

---

## Test 3: Type Filter — EAN-13 Only
**Screenshot ID:** ss_6954431mu
**URL:** http://localhost:3000/history (EAN-13 filter)
**Result:** ✅ PASS

**Verified:**
- Dropdown shows "EAN-13" selected
- Only 1 card visible (barcode scan), QR cards hidden
- Clear button (✕) appeared next to filter
- Green "Live" SSE connection indicator

---

## Test 4: Search Filter — "github"
**Screenshot ID:** ss_4514gfrpl
**URL:** http://localhost:3000/history (search: "github")
**Result:** ✅ PASS

**Verified:**
- Search input shows "github" text
- Only 1 matching card (github.com URL)
- Non-matching cards correctly filtered out
- Clear button (✕) present
- Debounced search (300ms) works

---

## Test 5: Device Info Expand
**Screenshot ID:** ss_5188lo6gu
**URL:** http://localhost:3000/history
**Result:** ✅ PASS

**Verified:**
- Chevron rotated to ˅ (down) on expanded card
- Browser: Safari 17
- OS: iOS 17.4
- Screen: 390×844
- Info in subtle rounded background container
- Other cards remain collapsed with › chevron

---

## Test 6: Scanner at Mobile Width (375px)
**Screenshot ID:** ss_5798p49sz
**URL:** http://localhost:3000 (375×812 viewport)
**Result:** ✅ PASS

**Verified:**
- Full-bleed camera, no horizontal scroll
- Scan overlay centered vertically
- Buttons visible and tappable
- Status indicator readable at small size

---

## Test 7: Duplicate Scan Dedup (409)
**Method:** JavaScript fetch in DevTools console
**Result:** ✅ PASS

**Verified:**
- First POST same value: 201 Created
- Second POST same value (within 3s): 409 Conflict
- Dedup window prevents duplicate database entries

---

## Test 8: Long Value Truncation (235 chars)
**Screenshot ID:** ss_7300s106a
**URL:** http://localhost:3000/history (after inserting 235-char URL)
**Result:** ✅ PASS

**Verified:**
- 235-character URL truncated with "…" at ~80 chars
- No layout break, text wraps with break-all
- Card stays contained within its border
- Full value accessible via title attribute (hover tooltip)

---

## Test 9: CSV Export
**Method:** JavaScript fetch to /api/scans/export
**Result:** ✅ PASS

**Verified:**
- Status: 200
- Content-Type: text/csv; charset=utf-8
- Content-Disposition: attachment; filename="scans-export.csv"
- Header row: id,value,type,timestamp,browser,os
- 7 rows total (1 header + 6 data rows)

---

## Test 10: GET /api/scans with Pagination
**Screenshot ID:** ss_4414bukb9
**URL:** http://localhost:3000/api/scans?limit=3
**Result:** ✅ PASS

**Verified:**
- Returns exactly 3 scans (limit working)
- hasMore: true (more pages exist)
- nextCursor present for next page
- All fields present: id, value, type, rawType, timestamp, createdAt, deviceInfo

---

## Test 11: Console Error Check
**Method:** Chrome DevTools console (read_console_messages, errors only)
**Result:** ✅ PASS (zero app errors)

**Findings:**
- Only warnings: React hydration mismatch from browser extensions (data-lt-installed from LanguageTool) — not our code
- Fixed by adding suppressHydrationWarning to <html> tag
- Zero console.error() from application code
- Zero unhandled promise rejections

---

## Summary

| # | Test | Result |
|---|------|--------|
| 1 | Scanner — Active scanning with overlay | ✅ PASS |
| 2 | History — Populated scan cards | ✅ PASS |
| 3 | History — Type filter (EAN-13) | ✅ PASS |
| 4 | History — Search filter ("github") | ✅ PASS |
| 5 | History — Device info expand | ✅ PASS |
| 6 | Scanner — Mobile width (375px) | ✅ PASS |
| 7 | API — Duplicate dedup (201 then 409) | ✅ PASS |
| 8 | History — Long value truncation (235 chars) | ✅ PASS |
| 9 | API — CSV export download | ✅ PASS |
| 10 | API — GET /api/scans pagination | ✅ PASS |
| 11 | Console — Zero app errors | ✅ PASS |

**11/11 tests passing.** No regressions found after Next.js 16, React 19, Prisma 7, Tailwind 4, and ESLint 9 upgrade.

---

*Report generated during post-upgrade visual testing on 2026-03-19*
