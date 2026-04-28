# Mobile Income Tracker Design

## Goal

Build a phone-first income tracker that makes it fast and motivating to record sales. The default sale is 199 RMB, so the common path is one tap to add one sale.

## Core Behavior

- Default unit price is 199.
- Normal entry records a number of sales and calculates income as `count * unitPrice`.
- Exception entry records a custom amount and optional note.
- Each entry stores date, amount, count, note, and whether it is custom.
- The app summarizes today's income, daily totals, monthly total income, monthly sale count, remaining amount to goal, and completion percentage.
- A monthly target can be changed by the user.

## Mobile Interface

- Top summary shows monthly income, goal, remaining amount, and completion rate.
- Main visual is a piggy-bank style water meter that rises as the monthly goal is completed.
- Primary action is a large `+1 单` button that immediately records 199 RMB for today.
- Secondary controls allow changing sale count, adding notes, and recording custom exception income.
- Records are grouped by date, with each day showing its total and individual entries.

## Data

All data is stored locally in the browser through `localStorage`. The first version does not sync across devices.

## Error Handling

- Empty or invalid amounts are ignored with an inline message.
- Goal and unit price must be positive numbers.
- Completion can go above 100%, but the water visual caps at full.

## Testing

The calculation logic is separated into a small JavaScript module and covered with Node tests for entry creation, daily grouping, monthly summaries, and goal progress.
