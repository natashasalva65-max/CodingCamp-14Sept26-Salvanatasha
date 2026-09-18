# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that enables users to record, categorize, and visualize personal expenses. The application runs entirely in the browser using vanilla HTML, CSS, and JavaScript, persisting all data to localStorage. It provides a dashboard-style interface with a transaction form, a pie chart showing category distribution, a monthly summary view, and a sortable transaction history — all with dark/light mode support and a responsive layout.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page application.
- **Transaction**: A single expense record consisting of a name, amount (in IDR), category, and date.
- **Category**: One of four fixed expense types: Food, Transport, Fun, or Lifestyle.
- **Balance**: The cumulative sum of all transaction amounts stored in the current session.
- **Spending Limit**: An optional threshold value set by the user; triggers a visual warning when the Balance exceeds it.
- **Chart**: The Chart.js pie chart displaying the proportion of spending per Category.
- **Monthly Summary**: A filtered view of Transactions grouped by calendar month, showing totals and per-Category breakdowns.
- **Transaction List**: The scrollable, sortable list of all Transactions rendered in the UI.
- **Storage**: The browser's localStorage API used to persist Transactions, the Spending Limit, and the active theme.
- **Theme**: The active color scheme — either `light` or `dark` — applied via the `data-theme` attribute on the root element.
- **Validator**: The client-side form validation logic that checks all required fields before a Transaction is accepted.
- **Pretty_Printer**: Not applicable (no parser/serializer in this application).

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to add a new expense transaction so that the application tracks my spending.

#### Acceptance Criteria

1. THE App SHALL provide an input form with fields for item name (text, 1–100 characters), amount (number, 0.01 to 999999999.99), category (select from the defined category list), and date (date picker).
2. WHEN the form is submitted with all fields valid, THE App SHALL create a Transaction with a unique identifier, the provided name, amount, category, date, and a creation timestamp.
3. WHEN a Transaction is created, THE App SHALL append it to the in-memory transaction list and persist it to Storage.
4. WHEN a Transaction is successfully added, THE App SHALL reset the form fields and restore the date field to today's date.
5. WHEN the date field is first rendered, THE App SHALL default its value to the current local date in `YYYY-MM-DD` format.
6. IF the form is submitted with any field empty or invalid, THEN THE App SHALL display an error message identifying the invalid field and SHALL NOT create a Transaction.
7. IF Storage is unavailable when persisting a Transaction, THEN THE App SHALL retain the Transaction in the in-memory transaction list and display an error message indicating the transaction was not saved persistently.

---

### Requirement 2: Form Validation

**User Story:** As a user, I want the form to validate my input before submission so that invalid data is never stored.

#### Acceptance Criteria

1. WHEN the form is submitted with an empty item name field (null, undefined, or contains only whitespace characters), THE Validator SHALL display an error message indicating the name field is required directly beneath the name field and prevent form submission.
2. WHEN the form is submitted with an amount field that is empty, contains non-numeric characters, or contains a numeric value less than or equal to zero, THE Validator SHALL display an error message indicating a positive numeric amount is required directly beneath the amount field and prevent form submission.
3. WHEN the form is submitted without a selected category, THE Validator SHALL display an error message indicating a category selection is required directly beneath the category field and prevent form submission.
4. WHEN the form is submitted without a selected date, THE Validator SHALL display an error message indicating a date selection is required directly beneath the date field and prevent form submission.
5. WHEN a previously invalid form is resubmitted and all fields pass validation, THE Validator SHALL remove all field-level error messages and remove error styling from all fields before proceeding with submission.
6. WHEN the form is submitted and two or more fields are simultaneously invalid, THE Validator SHALL display all applicable error messages at the same time, one beneath each respective invalid field.
7. IF the item name exceeds 100 characters, THEN THE Validator SHALL display an error message indicating the name is too long directly beneath the name field and prevent form submission.
8. IF the amount value exceeds 999,999,999, THEN THE Validator SHALL display an error message indicating the amount exceeds the maximum allowed value directly beneath the amount field and prevent form submission.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction so that I can correct mistakes or remove unwanted entries.

#### Acceptance Criteria

1. THE App SHALL render a delete button for each Transaction in the Transaction List.
2. WHEN a delete button is clicked, THE App SHALL remove the Transaction with the matching unique identifier from the in-memory transaction list.
3. WHEN a Transaction is deleted, THE App SHALL update Storage to reflect the removal within 500 milliseconds.
4. WHEN a Transaction is deleted, THE App SHALL re-render the Balance, Transaction List, Chart, and Monthly Summary to reflect the current state of the in-memory transaction list.
5. IF Storage is unavailable when a Transaction is deleted, THEN THE App SHALL retain the deletion in the in-memory transaction list and display an error message indicating that the change could not be persisted.

---

### Requirement 4: Balance Calculation and Display

**User Story:** As a user, I want to see my total spending at a glance so that I always know how much I have spent overall.

#### Acceptance Criteria

1. THE App SHALL display the sum of all Transaction amounts as the Balance, formatted in Indonesian Rupiah (IDR) using the `id-ID` locale with `Rp` prefix and locale-aware thousand separators (e.g., "Rp 1.250.000").
2. WHEN a Transaction is added or deleted, THE App SHALL recalculate and re-render the Balance within 100 milliseconds.
3. WHILE no Transactions exist, THE App SHALL display the Balance as "Rp 0".

---

### Requirement 5: Spending Limit

**User Story:** As a user, I want to set a spending limit so that I receive a visual alert when my total expenses exceed my budget.

#### Acceptance Criteria

1. THE App SHALL provide a numeric input (accepting values from 0 to 999,999,999,999) and a "Set" button for the user to configure the Spending Limit.
2. WHEN the "Set" button is clicked with a valid non-negative number, THE App SHALL store the Spending Limit value and persist it to Storage.
3. WHEN the "Set" button is clicked with an empty or invalid value, THE App SHALL not update the Spending Limit and SHALL display an error message indicating that a valid non-negative number is required.
4. WHILE the Balance exceeds the Spending Limit and the Spending Limit is greater than zero, THE App SHALL display a pulsing warning banner reading "⚠️ Pengeluaran melebihi limit!".
5. WHILE the Balance exceeds the Spending Limit and the Spending Limit is greater than zero, THE App SHALL apply the `over-limit` CSS class to the balance card, changing its background to red.
6. IF the Balance is less than or equal to the Spending Limit, THEN THE App SHALL hide the warning banner and remove the `over-limit` CSS class from the balance card.
7. WHEN the application loads, THE App SHALL restore the previously saved Spending Limit from Storage and pre-populate the limit input field.

---

### Requirement 6: Transaction List with Sorting

**User Story:** As a user, I want to view all my transactions in a list and sort them so that I can find and review entries easily.

#### Acceptance Criteria

1. THE App SHALL render each Transaction in the Transaction List with its category emoji badge, item name (truncated with ellipsis at 50 characters, with full name in `title` attribute), category label, date formatted as "D Mon YYYY" in the `id-ID` locale (e.g., "5 Sep 2026"), amount formatted as "Rp X.XXX" with Indonesian thousand separators, and a delete button.
2. WHEN the Transaction List contains no Transactions, THE App SHALL display the empty-state message "Belum ada transaksi. Tambahkan di atas!".
3. THE App SHALL provide a sort dropdown with options labeled "Terbaru" (newest first, default), "Terlama" (oldest first), "Jumlah ↓" (highest amount first), "Jumlah ↑" (lowest amount first), and "Kategori" (ascending alphabetical by category name).
4. WHEN the sort dropdown value changes, THE App SHALL re-render the Transaction List in the selected order within 300 milliseconds without modifying the underlying transaction data array.
5. WHEN a new Transaction is added, THE App SHALL smooth-scroll the newly added item into view in the Transaction List.
6. WHEN two or more Transactions share the same sort key value, THE App SHALL break ties by sorting those Transactions by their creation timestamp in descending order (most recently created first).

---

### Requirement 7: Pie Chart — Category Distribution

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand how my money is distributed.

#### Acceptance Criteria

1. THE App SHALL render a pie chart using Chart.js showing the proportion of total spending for each Category that has at least one Transaction.
2. WHEN the transaction data changes (add or delete), THE App SHALL update the Chart data in place without destroying and recreating the chart instance.
3. WHEN no Transactions exist, THE App SHALL hide the chart canvas and display the placeholder text "Belum ada data transaksi.".
4. WHEN at least one Transaction exists, THE App SHALL show the chart canvas and hide the placeholder text.
5. THE App SHALL use fixed colors per Category: Food (#48bb78), Transport (#4299e1), Fun (#ed8936), Lifestyle (#9f7aea).
6. WHEN the Theme changes, THE App SHALL update the chart legend text color and segment border color to match the active Theme, and re-render the Chart.
7. WHEN the user hovers over a chart segment, THE Chart tooltip SHALL display the amount formatted as "Rp X.XXX" with Indonesian thousand separators and the percentage of total spending rounded to one decimal place (e.g., "Rp 50.000  (25.0%)").

---

### Requirement 8: Monthly Summary

**User Story:** As a user, I want to view a summary of my expenses for a specific month so that I can track my monthly spending patterns.

#### Acceptance Criteria

1. THE App SHALL provide a dropdown that lists all calendar months (in Indonesian locale format, e.g., "Januari 2025") for which at least one Transaction exists, ordered from most recent to oldest.
2. WHEN the month dropdown selection changes, THE App SHALL display the total spending formatted as "Rp X.XXX" with Indonesian thousand separators and the per-Category breakdown for the selected month.
3. WHEN a month is selected, THE App SHALL display each Category present in that month's transactions with its emoji, category name, percentage of that month's total rounded to one decimal place, and amount formatted as "Rp X.XXX" with Indonesian thousand separators.
4. WHEN a month is selected, THE App SHALL sort the Category breakdown rows from highest to lowest amount.
5. WHEN the month dropdown has no selection, THE App SHALL display the prompt "Pilih bulan untuk melihat ringkasan.".
6. WHEN no Transactions exist, THE App SHALL display the message "Belum ada transaksi. Tambahkan dulu!".
7. WHEN a Transaction is added or deleted, THE App SHALL refresh the month dropdown options and re-render the summary for the currently selected month if that month still contains at least one Transaction.
8. IF the currently selected month no longer contains any Transactions after a deletion, THEN THE App SHALL clear the month dropdown selection and display the prompt "Pilih bulan untuk melihat ringkasan.".

---

### Requirement 9: Dark/Light Mode

**User Story:** As a user, I want to toggle between dark and light color schemes so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a single toggle button in the header area that is visible on all viewport sizes.
2. WHEN the Theme is set to `dark`, THE App SHALL set the `data-theme="dark"` attribute on the root HTML element and display the ☀️ icon on the toggle button.
3. WHEN the Theme is set to `light`, THE App SHALL set the `data-theme="light"` attribute on the root HTML element and display the 🌙 icon on the toggle button.
4. WHEN the user activates the toggle button, THE App SHALL switch the current Theme from `dark` to `light` or from `light` to `dark`, update the `data-theme` attribute, update the toggle button icon, and persist the new Theme value to Storage under the key `ebv_theme`.
5. WHEN the application loads, THE App SHALL read the `ebv_theme` key from Storage and apply the stored Theme by setting the corresponding `data-theme` attribute on the root HTML element before rendering any visible content.
6. IF no Theme value is found in Storage, THE App SHALL default to the `light` Theme and set `data-theme="light"` on the root HTML element.

---

### Requirement 10: LocalStorage Persistence

**User Story:** As a user, I want my data to be saved automatically so that transactions, settings, and preferences persist across browser sessions.

#### Acceptance Criteria

1. WHEN a Transaction is added or deleted, THE App SHALL immediately serialize the full transaction list as JSON and write it to Storage under the key `ebv_transactions`.
2. WHEN the Spending Limit is set, THE App SHALL write the numeric value to Storage under the key `ebv_limit`.
3. WHEN the Theme changes, THE App SHALL write the theme string (`"light"` or `"dark"`) to Storage under the key `ebv_theme`.
4. WHEN the application loads, THE App SHALL read all three Storage keys (`ebv_transactions`, `ebv_limit`, `ebv_theme`) and restore Transactions, Spending Limit, and Theme before rendering the UI.
5. IF the `ebv_transactions` Storage value cannot be parsed as valid JSON, THE App SHALL initialize the transaction list as empty and continue without error.
6. IF the `ebv_limit` Storage value is absent or is not a finite positive number, THE App SHALL initialize the Spending Limit to `0` and continue without error.

---

### Requirement 11: Responsive Layout

**User Story:** As a user, I want the application to be usable on mobile, tablet, and desktop screens so that I can access it from any device.

#### Acceptance Criteria

1. WHILE the viewport width is below 640px, THE App SHALL render all sections in a single-column layout occupying the full viewport width.
2. WHILE the viewport width is between 640px and 1023px inclusive, THE App SHALL render the Balance + Form section and the Chart + Summary section side by side in two equal-width columns, with the Transaction List spanning the full width below both columns.
3. WHILE the viewport width is 1024px or above, THE App SHALL render the layout in three equal-width columns: Balance + Form, Chart + Summary, and Transaction List.
4. THE App SHALL render a header that remains fixed at the top of the viewport and stays visible when the user scrolls vertically on all viewport sizes.

---

### Requirement 12: XSS Prevention

**User Story:** As a developer, I want user-provided content to be escaped before insertion into the DOM so that the application is protected against cross-site scripting attacks.

#### Acceptance Criteria

1. WHEN rendering a Transaction item name into the DOM via `innerHTML`, THE App SHALL replace each occurrence of `&` with `&amp;`, `<` with `&lt;`, `>` with `&gt;`, `"` with `&quot;`, and `'` with `&#39;` before insertion.
2. THE App SHALL apply the HTML escaping defined in criterion 1 to the Transaction item name field at every location where it is rendered in the Transaction List.
3. IF a Transaction item name exceeds 100 characters, THE App SHALL reject the input and display an error message indicating the maximum allowed length before any DOM insertion occurs.
