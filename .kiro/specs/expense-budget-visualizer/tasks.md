# Implementation Plan: Expense & Budget Visualizer

## Overview

The core application is already functional. This plan covers three areas:

1. **Gap fixes** — requirements not yet satisfied by the existing `script.js` (validation limits, storage error handling, sort tie-breaking, chart guard).
2. **Testability refactoring** — extracting pure functions into `js/core.js` so Vitest/JSDOM can import and test them independently without needing a live browser.
3. **Test suite** — Vitest setup, unit tests, all 20 property-based tests (fast-check), and integration tests.

---

## Tasks

- [ ] 1. Fix validation gaps in `validateForm` and `initLimit`
  - [ ] 1.1 Add 100-character name-length check to `validateForm`
    - In `js/script.js`, after the empty-name check, add: if `name.trim().length > 100` call `showError('itemName', 'Nama maksimal 100 karakter.')` and set `valid = false`
    - The check must fire even when the name is non-empty, so place it as a second `if` (not `else if`)
    - _Requirements: 2.7, 12.3_

  - [ ] 1.2 Add amount maximum check to `validateForm`
    - After the existing positive-number check, add: if `Number(amount) > 999_999_999` call `showError('amount', 'Jumlah melebihi maksimum (999.999.999).')` and set `valid = false`
    - _Requirements: 2.8_

  - [ ] 1.3 Add invalid-limit feedback to `initLimit`
    - In the `setLimitBtn` click handler, when `isNaN(val) || val < 0`, call `showError` or display an inline warning (add a `<span id="limitError">` element to `index.html` beneath the limit input if not present, and write the message there); clear the message on a valid submit
    - _Requirements: 5.3_

- [ ] 2. Fix sort tie-breaking for non-date sorts
  - [ ] 2.1 Apply `createdAt` descending tie-break in `getSortedTransactions`
    - For `amount-desc`, `amount-asc`, and `category` cases, update the comparator to: primary key first; if primary returns `0`, fall back to `b.createdAt - a.createdAt`
    - Example: `case 'amount-desc': return clone.sort((a, b) => b.amount - a.amount || b.createdAt - a.createdAt);`
    - _Requirements: 6.6_

- [ ] 3. Add storage write error handling
  - [ ] 3.1 Wrap `saveTransactions()` and `saveLimit()` in try/catch; display a non-blocking banner on failure
    - Add a `showStorageError(message)` helper that inserts (or updates) a fixed-position `<div id="storageError">` banner in the DOM and auto-hides it after 4 seconds
    - Call it from `saveTransactions()` catch block with message "Gagal menyimpan data. Coba lagi." and from `saveLimit()` catch block
    - _Requirements: 1.7, 3.5_

- [ ] 4. Add Chart.js availability guard in `renderChart`
  - [ ] 4.1 Guard `renderChart` against missing Chart.js
    - At the top of `renderChart()`, add: `if (typeof Chart === 'undefined') { emptyEl.style.display = 'flex'; canvas.style.display = 'none'; return; }`
    - _Requirements: 7.3 (fallback for CDN failure)_

- [ ] 5. Extract pure functions into `js/core.js` for testability
  - [ ] 5.1 Create `js/core.js` and move pure/stateless functions there
    - Move (copy + export) the following functions to `js/core.js` using ES module `export`:
      - `formatCurrency`, `getTodayISO`, `escapeHtml`
      - `getMonthKey`, `formatMonthLabel`
      - `validateForm` (refactor to accept a DOM-free signature: `validateForm(name, amountStr, category, date)` → returns `{ valid: boolean, errors: { [fieldId]: string } }` instead of directly writing to DOM; update `script.js` to call the new signature and apply errors to DOM itself)
      - `getTotalSpent(transactions)` (accept array as parameter instead of reading module state)
      - `getSortedTransactions(transactions, sortKey)` (accept array + sort key as parameters)
      - `getCategoryTotals(transactions)` (accept array as parameter)
      - `getAvailableMonths(transactions)` (accept array as parameter)
      - `addTransaction(transactions, name, amount, category, date)` (accept array, return new array — pure, no side-effects; `script.js` handles push + save separately)
    - Add `export {}` to keep `js/core.js` a proper ES module
    - _Requirements: enables all property-based and unit tests_

  - [ ] 5.2 Update `js/script.js` to import from `js/core.js` and adapt call sites
    - Change `<script src="js/script.js">` in `index.html` to `<script type="module" src="js/script.js">` and add `import { ... } from './core.js';` at the top of `script.js`
    - Adapt every call site for the refactored `validateForm`, `getTotalSpent`, `getSortedTransactions`, `getCategoryTotals`, `getAvailableMonths` to pass state explicitly
    - Verify the app still runs correctly in the browser after the refactor
    - _Requirements: supports all testing tasks_

- [ ] 6. Set up Vitest and fast-check
  - [ ] 6.1 Initialise `package.json` and install dev dependencies
    - Run `npm init -y` in the project root
    - Install: `npm install --save-dev vitest@1.6.0 @vitest/coverage-v8@1.6.0 jsdom@24.1.1 fast-check@3.19.0`
    - _Requirements: test infrastructure_

  - [ ] 6.2 Create `vitest.config.js`
    - Create `vitest.config.js` at project root:
      ```js
      import { defineConfig } from 'vitest/config';
      export default defineConfig({
        test: {
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./tests/setup.js'],
        },
      });
      ```
    - Add `"test": "vitest --run"` and `"test:watch": "vitest"` scripts to `package.json`
    - _Requirements: test infrastructure_

  - [ ] 6.3 Create `tests/setup.js` with Chart.js mock and crypto polyfill
    - Create `tests/setup.js`:
      ```js
      import { vi } from 'vitest';
      // Mock Chart.js to avoid Canvas API dependency
      vi.mock('chart.js', () => ({
        Chart: vi.fn(() => ({ update: vi.fn(), destroy: vi.fn(), data: { labels: [], datasets: [{ data: [] }] } })),
      }));
      // Polyfill crypto.randomUUID for older jsdom
      if (!globalThis.crypto?.randomUUID) {
        const { webcrypto } = await import('node:crypto');
        globalThis.crypto = webcrypto;
      }
      ```
    - _Requirements: test infrastructure_

- [ ] 7. Write unit tests for pure functions
  - [ ] 7.1 `tests/unit/formatCurrency.test.js` — IDR formatting edge cases
    - Test: `formatCurrency(0)` → `"Rp 0"`
    - Test: `formatCurrency(1250000)` → `"Rp 1.250.000"`
    - Test: `formatCurrency(999999999)` → `"Rp 999.999.999"`
    - Test: output always starts with `"Rp "`
    - _Requirements: 4.1_

  - [ ]* 7.2 `tests/unit/validateForm.test.js` — example-based validation cases
    - Test: empty name → `valid: false`, error on `itemName`
    - Test: whitespace-only name → `valid: false`
    - Test: name > 100 chars → `valid: false`, error on `itemName`
    - Test: amount = "0" → `valid: false`; amount = "-5" → `valid: false`
    - Test: amount = "999999999" → `valid: true`; amount = "1000000000" → `valid: false`
    - Test: missing category → `valid: false`; missing date → `valid: false`
    - Test: all valid → `valid: true`, no errors
    - Test: two fields invalid simultaneously → both errors present in returned object
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8_

  - [ ]* 7.3 `tests/unit/escapeHtml.test.js` — HTML entity replacement
    - Test: `escapeHtml('<script>')` → `'&lt;script&gt;'`
    - Test: `escapeHtml("it's \"quoted\"")` → contains `&#039;` and `&quot;`
    - Test: `escapeHtml('no special chars')` → unchanged
    - Test: already-escaped string does not double-escape
    - _Requirements: 12.1, 12.2_

  - [ ]* 7.4 `tests/unit/getTotalSpent.test.js` — balance calculation
    - Test: empty array → `0`
    - Test: single transaction → equals its amount
    - Test: multiple transactions → correct arithmetic sum
    - _Requirements: 4.1, 4.3_

  - [ ]* 7.5 `tests/unit/getSortedTransactions.test.js` — sort correctness
    - Test: `date-desc` returns newest `createdAt` first
    - Test: `date-asc` returns oldest first
    - Test: `amount-desc` returns highest amount first; ties broken by `createdAt` desc
    - Test: `category` returns alphabetical category order; ties broken by `createdAt` desc
    - Test: original array unchanged after sort call
    - _Requirements: 6.3, 6.4, 6.6_

  - [ ]* 7.6 `tests/unit/getAvailableMonths.test.js` — month extraction
    - Test: empty array → `[]`
    - Test: transactions in multiple months → unique keys only, sorted descending
    - Test: all transactions in same month → one entry
    - _Requirements: 8.1_

  - [ ]* 7.7 `tests/unit/monthlySummary.test.js` — monthly aggregation
    - Test: filtered total equals sum of transactions in that month
    - Test: breakdown sorted highest-to-lowest amount
    - Test: transactions in other months excluded
    - _Requirements: 8.2, 8.3, 8.4_

  - [ ]* 7.8 `tests/unit/addTransaction.test.js` — transaction creation
    - Test: returned object has trimmed name, correct amount/category/date
    - Test: `id` is a non-empty string
    - Test: `createdAt` is a positive number
    - _Requirements: 1.2_

- [ ] 8. Write property-based tests (fast-check) — Properties 1–10
  - [ ]* 8.1 `tests/unit/prop_addTransaction.test.js` — Property 1: Transaction field preservation
    - **Property 1: Transaction field preservation**
    - Use `fc.record` with `fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)`, `fc.integer({ min: 1, max: 999_999_999 })`, `fc.constantFrom('Food','Transport','Fun','Lifestyle')`, and a valid date string
    - Assert: result has trimmed name, correct amount, category, date, non-empty `id`, positive `createdAt`
    - **Validates: Requirements 1.2**

  - [ ]* 8.2 `tests/unit/prop_storageRoundTrip.test.js` — Property 2: Storage round-trip
    - **Property 2: Storage round-trip for transactions**
    - Generate an array of valid transactions with `fc.array(transactionArbitrary)`
    - Serialize to `localStorage.setItem('ebv_transactions', JSON.stringify(arr))`, then parse back and deep-equal compare
    - **Validates: Requirements 1.3, 10.1**

  - [ ]* 8.3 `tests/unit/prop_validateForm.test.js` — Properties 3–6: Validation
    - **Property 3: Whitespace names rejected** — `fc.string().filter(s => s.trim() === '')` → `valid: false`, no transaction created
    - **Property 4: Invalid amounts rejected** — empty / non-numeric / zero / negative / >999,999,999 → `valid: false`
    - **Property 5: Name > 100 chars rejected** — `fc.string({ minLength: 101 })` → `valid: false`, error on `itemName`
    - **Property 6: Simultaneous multi-field errors** — generate subsets of invalid fields → all corresponding errors present simultaneously
    - **Validates: Requirements 2.1, 2.2, 2.6, 2.7, 2.8**

  - [ ]* 8.4 `tests/unit/prop_deleteTransaction.test.js` — Property 7: Delete removes only target
    - **Property 7: Delete removes only the targeted transaction**
    - Generate `fc.array(transactionArbitrary, { minLength: 1 })` and pick a random index
    - After `deleteTransaction`, assert: target absent, all others unchanged
    - **Validates: Requirements 3.2**

  - [ ]* 8.5 `tests/unit/prop_getTotalSpent.test.js` — Properties 8–9: Balance
    - **Property 8: Balance equals sum of all amounts** — `fc.array(fc.integer({ min: 1 }))` mapped to transactions; assert `getTotalSpent` equals `arr.reduce((s,t)=>s+t.amount, 0)`; empty array → `0`
    - **Property 9: IDR currency formatting** — `fc.integer({ min: 0, max: 999_999_999 })` → result starts with `"Rp "` and uses `.` as thousands separator
    - **Validates: Requirements 4.1, 4.3**

  - [ ]* 8.6 `tests/unit/prop_limitWarning.test.js` — Property 10: Spending limit warning predicate
    - **Property 10: Spending limit warning predicate**
    - Generate `(totalSpent, spendingLimit)` pairs covering all four cases: limit=0, total>limit, total<=limit, total=limit
    - Assert `#limitWarning` visibility and `over-limit` class on balance card match the predicate exactly
    - **Validates: Requirements 5.4, 5.5, 5.6**

- [ ] 9. Write property-based tests (fast-check) — Properties 11–20
  - [ ]* 9.1 `tests/unit/prop_getSortedTransactions.test.js` — Properties 11–12: Sort
    - **Property 11: Sort does not mutate source array** — snapshot original array reference and element order; after `getSortedTransactions`, assert original unchanged
    - **Property 12: Sort tie-breaking by creation timestamp** — generate transactions with identical sort keys; assert tied items appear `createdAt` descending
    - **Validates: Requirements 6.4, 6.6**

  - [ ]* 9.2 `tests/unit/prop_chartSingleton.test.js` — Property 13: Chart singleton identity
    - **Property 13: Chart singleton identity preserved on data change**
    - Set up JSDOM canvas mock; call `renderChart()` with initial data, capture `chartInstance` reference; add/delete a transaction (keeping list non-empty); call `renderChart()` again; assert reference is unchanged
    - **Validates: Requirements 7.2**

  - [ ]* 9.3 `tests/unit/prop_tooltipCallback.test.js` — Property 14: Tooltip label format
    - **Property 14: Tooltip label format**
    - Generate `fc.tuple(fc.integer({ min: 1, max: 999_999_999 }), fc.integer({ min: 1, max: 999_999_999 }))` as `(segmentValue, otherTotal)`
    - Extract the tooltip callback from the Chart config; call it with a ctx mock; assert result contains `"Rp "` and a `%` with one decimal place
    - **Validates: Requirements 7.7**

  - [ ]* 9.4 `tests/unit/prop_getAvailableMonths.test.js` — Property 15: Available months ordering
    - **Property 15: Available months ordering**
    - Generate `fc.array(transactionArbitrary)` with varied dates; assert `getAvailableMonths` returns unique keys, no duplicates, sorted descending lexicographically
    - **Validates: Requirements 8.1**

  - [ ]* 9.5 `tests/unit/prop_monthlySummary.test.js` — Property 16: Monthly aggregation correctness
    - **Property 16: Monthly aggregation correctness and breakdown order**
    - Generate transactions across multiple months; for each available month key, assert: displayed total = arithmetic sum; breakdown sorted highest-to-lowest
    - **Validates: Requirements 8.2, 8.3, 8.4**

  - [ ]* 9.6 `tests/unit/prop_themeToggle.test.js` — Property 17: Theme toggle round-trip
    - **Property 17: Theme toggle round-trip**
    - Generate `fc.constantFrom('light', 'dark')` as initial theme; call `toggleTheme()` twice; assert `data-theme`, button icon, and `ebv_theme` in localStorage are restored to original values
    - **Validates: Requirements 9.4**

  - [ ]* 9.7 `tests/unit/prop_storageRecovery.test.js` — Properties 18–19: Corrupt storage recovery
    - **Property 18: Corrupt storage recovery** — generate arbitrary non-JSON strings via `fc.string()`; store in `ebv_transactions`; call `loadFromStorage()`; assert no exception thrown and `transactions === []`
    - **Property 19: Invalid spending limit recovery** — generate `fc.oneof(fc.constant(null), fc.constant(''), fc.constant('abc'), fc.integer({ max: -1 }), fc.constant('Infinity'))`; store in `ebv_limit`; call `loadFromStorage()`; assert `spendingLimit === 0`
    - **Validates: Requirements 10.5, 10.6**

  - [ ]* 9.8 `tests/unit/prop_escapeHtml.test.js` — Property 20: HTML escaping completeness
    - **Property 20: HTML escaping completeness**
    - Generate `fc.string()` containing arbitrary characters including `& < > " '`; assert every occurrence of each special char is replaced with its entity
    - Generate already-escaped strings; assert `escapeHtml` does not double-escape (i.e., `&amp;` does not become `&amp;amp;`)
    - **Validates: Requirements 12.1, 12.2**

- [ ] 10. Write integration tests
  - [ ]* 10.1 `tests/integration/formSubmit.test.js` — form submission and reset
    - Load `index.html` via JSDOM; fill valid inputs; dispatch `submit`; assert transaction appears in list, form fields cleared, date reset to today
    - Assert that submitting with all fields empty shows all four error messages simultaneously
    - _Requirements: 1.4, 1.5, 2.5, 2.6_

  - [ ]* 10.2 `tests/integration/deleteFlow.test.js` — delete and re-render
    - Pre-populate `localStorage` with two transactions; load app; click delete on one; assert that item is removed from DOM, balance updated, chart re-rendered, and `localStorage` serialization no longer contains deleted id
    - _Requirements: 3.3, 3.4_

  - [ ]* 10.3 `tests/integration/loadRestore.test.js` — full restore on load
    - Pre-populate all three storage keys (`ebv_transactions`, `ebv_limit`, `ebv_theme`); load app; assert transactions rendered, limit input pre-filled, `data-theme` attribute matches stored theme
    - _Requirements: 10.4, 5.7, 9.5_

  - [ ]* 10.4 `tests/integration/monthlySummaryDelete.test.js` — month dropdown cleared after last deletion
    - Pre-populate two transactions both in the same month; load app; select that month in the dropdown; delete both transactions one by one; assert after the second deletion the dropdown resets to empty and the "Pilih bulan" prompt is shown
    - _Requirements: 8.7, 8.8_

- [ ] 11. Final checkpoint — run full test suite
  - Run `npm test` (`vitest --run`) and ensure all non-optional and all optional tests pass
  - Fix any failures, then ensure the app still loads correctly in the browser
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but are strongly recommended for correctness confidence.
- Each task references specific requirements for traceability.
- Property-based tests in tasks 8–9 each run a minimum of **100 iterations** per `fc.assert` call (`{ numRuns: 100 }`).
- Unit tests (task 7) focus on specific examples and edge cases to complement the property tests.
- Integration tests (task 10) use JSDOM and require the HTML to be loaded via `document.body.innerHTML` or a file-load helper.
- The `js/core.js` extraction in task 5 is a prerequisite for all testing tasks; complete it before writing tests.
- `Chart.js` must be mocked in all test files via `tests/setup.js` to avoid Canvas 2D context errors in JSDOM.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["5.1"] },
    { "id": 2, "tasks": ["5.2"] },
    { "id": 3, "tasks": ["6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8"] },
    { "id": 8, "tasks": ["10.1", "10.2", "10.3", "10.4"] }
  ]
}
```
