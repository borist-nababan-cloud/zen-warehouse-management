**Role:** Senior Frontend Engineer (React, Tailwind CSS, Supabase).

**Task:** Implement the **Peak Hours Analysis Dashboard (Section D)**.

**Context:**
This is the final module of the PoS Dashboard. We need to visualize **Traffic Density** to help the business decide on staffing schedules (Shift planning).
*   **Data Source:** `view_peak_hours`.
*   **Access & Filters:** Standard Global Rules (Date Range & Outlet Filter).

**Data Structure:**
```typescript
interface TrafficData {
  day_index: number; // 0=Sun, 1=Mon...
  day_name: string;
  hour_block: number; // 9, 10, 11... (24h format)
  transaction_value: number;
}
```

**Implementation Requirements:**

1.  **KPI Cards (Top Row):**
    *   **Busiest Day:** The Day of Week with the highest total transaction count.
    *   **Peak Hour:** The specific Hour (e.g., "14:00 - 15:00") with the highest average traffic.
    *   **Traffic Volume:** Total visitors in selected period.

2.  **Visualization: Traffic Heatmap (The Core Feature):**
    *   **Type:** 7x14 Grid (Days x Operating Hours). *Assume operating hours are approx 09:00 to 22:00, but handle outliers dynamically.*
    *   **Y-Axis:** Days (Mon, Tue, Wed, Thu, Fri, Sat, Sun).
    *   **X-Axis:** Hours (9 AM, 10 AM, ... 10 PM).
    *   **Cell Logic:**
        *   Background Color: `bg-indigo-500`.
        *   Opacity: Calculated based on density. `(CurrentCellCount / MaxCellCount)`. Higher count = Darker color.
        *   *Tooltip:* On hover, show "Wednesday 2 PM: 45 Customers".
    *   *Implementation Hint:* Use CSS Grid (`grid-cols-12` or dynamic) instead of a Charting library, as it offers better control for Heatmaps.

3.  **Chart 2: Hourly Trend Line (Line Chart):**
    *   **X-Axis:** Hour of Day (0-23).
    *   **Y-Axis:** Total Transactions.
    *   **Insight:** A simple curve showing the "Morning Lull" vs "Afternoon Rush" vs "Evening Drop-off".

**Frontend Aggregation Logic:**
1.  Initialize a Matrix: `const heatMap = { 0: {9:0, 10:0...}, 1: {...} }` (0=Sunday).
2.  Loop through fetched data.
3.  Increment counts: `heatMap[row.day_index][row.hour_block]++`.
4.  Calculate the `maxVal` in the entire matrix to normalize the color opacity.

**Visuals:**
*   Use the **Professional Pastel** theme.
*   The Heatmap should look clean, with gaps (`gap-1`) between cells.
*   KPI Cards should use `recharts` for small sparklines if possible, or just big numbers.

**Action:**
*   Create `PeakHoursDashboard.tsx` and finalize the `DashboardLayout` navigation.
*   Update the `DashboardLayout` navigation.
*   Use extact same layout section as 3 others dashboard and also implement the same filter options.

***