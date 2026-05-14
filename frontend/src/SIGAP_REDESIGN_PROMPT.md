# SIGAP — Full UI Redesign Instructions

## Context

You are redesigning the frontend of **SIGAP** (Sistem Informasi Gangguan dan Aduan Polri), an internal IT helpdesk ticketing application for Polda Kalimantan Selatan. The app is built with **Next.js (App Router), TypeScript, Tailwind CSS, and shadcn/ui**.

This is a **pure visual/presentational redesign only**. You must NOT change any:
- API calls or data fetching logic
- Authentication or authorization logic
- Form validation logic
- Business logic, state management, or routing
- TypeScript types or interfaces
- Component props or function signatures

You are only allowed to change: CSS classes, Tailwind utility classes, HTML/JSX structure within components, CSS variables in `globals.css`, and color tokens in `tailwind.config.ts`.

---

## Design Philosophy

The goal is to transform this app from a generic shadcn/ui default template into a product with a strong visual identity. Key principles:

- **Depth over flatness** — every layer of the UI must be visually distinguishable from the one behind it
- **Purposeful color** — color encodes meaning, not decoration
- **Professional but modern** — appropriate for a government/police institution, but not stiff or outdated
- **Consistency** — every component follows the same visual language

---

## 1. Color System — `globals.css` and `tailwind.config.ts`

### Replace ALL CSS variables in `globals.css` with the following:

```css
@layer base {
  :root {
    /* Background layers — each layer is distinguishable */
    --background: 210 20% 98%;          /* #f8fafc — slate-50, page background */
    --foreground: 222 47% 11%;          /* #1e293b — slate-800, primary text */

    --card: 0 0% 100%;                  /* #ffffff — white, card surface */
    --card-foreground: 222 47% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    /* Primary: Teal — replaces the generic blue */
    --primary: 174 77% 31%;             /* #0d9488 — teal-600 */
    --primary-foreground: 0 0% 100%;    /* white text on primary */

    --secondary: 210 40% 96%;           /* #f1f5f9 — slate-100 */
    --secondary-foreground: 222 47% 11%;

    --muted: 210 40% 96%;
    --muted-foreground: 215 20% 45%;    /* #64748b — slate-500, improved contrast */

    --accent: 174 77% 95%;              /* teal-50, subtle teal tint */
    --accent-foreground: 174 77% 25%;   /* teal-800 */

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 214 32% 91%;              /* #e2e8f0 — slate-200 */
    --input: 214 32% 91%;
    --ring: 174 77% 31%;                /* teal focus ring */
    --radius: 0.5rem;

    /* Chart colors */
    --chart-1: 174 77% 31%;             /* teal — primary data */
    --chart-2: 217 91% 60%;             /* blue — secondary data */
    --chart-3: 43 96% 56%;              /* amber — tertiary data */
    --chart-4: 142 71% 45%;             /* green */
    --chart-5: 0 84% 60%;               /* red */
    --chart-grid: 214 32% 91%;
    --chart-axis: 215 20% 45%;

    /* Sidebar — dark panel */
    --sidebar-bg: 222 47% 8%;           /* #0f172a — slate-900 */
    --sidebar-fg: 210 40% 96%;          /* #f1f5f9 — light text */
    --sidebar-muted: 215 20% 55%;       /* subdued nav items */
    --sidebar-border: 217 33% 15%;      /* #1e293b subtle border */
    --sidebar-active-bg: 255 255 255 / 0.08; /* white/8 active item bg */
    --sidebar-active-accent: 174 77% 31%; /* teal left border on active item */
  }

  .dark {
    --background: 222 47% 6%;           /* #090f1a — deepest dark */
    --foreground: 210 40% 96%;

    --card: 222 47% 10%;                /* #111827 — elevated surface */
    --card-foreground: 210 40% 96%;

    --popover: 222 47% 10%;
    --popover-foreground: 210 40% 96%;

    --primary: 174 77% 40%;             /* slightly brighter teal for dark mode */
    --primary-foreground: 0 0% 100%;

    --secondary: 217 33% 17%;           /* #1e293b */
    --secondary-foreground: 210 40% 96%;

    --muted: 217 33% 17%;
    --muted-foreground: 215 20% 60%;    /* more readable in dark */

    --accent: 174 77% 15%;
    --accent-foreground: 174 77% 70%;

    --destructive: 0 63% 45%;
    --destructive-foreground: 210 40% 96%;

    --border: 217 33% 18%;              /* #1e293b */
    --input: 217 33% 18%;
    --ring: 174 77% 40%;

    --chart-1: 174 77% 45%;
    --chart-2: 217 91% 65%;
    --chart-3: 43 96% 60%;
    --chart-4: 142 71% 50%;
    --chart-5: 0 84% 65%;
    --chart-grid: 217 33% 18%;
    --chart-axis: 215 20% 55%;

    --sidebar-bg: 222 47% 6%;
    --sidebar-fg: 210 40% 90%;
    --sidebar-muted: 215 20% 45%;
    --sidebar-border: 217 33% 12%;
  }
}
```

### Replace the color tokens in `tailwind.config.ts` with the following:

```ts
colors: {
  primary: {
    50:  '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',   /* main primary */
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e',
  },
  status: {
    pending:        '#d97706',   /* amber-600 */
    'pending-bg':   '#fef3c7',   /* amber-100 */
    'pending-text': '#92400e',   /* amber-800 */
    proses:         '#0d9488',   /* teal-600 */
    'proses-bg':    '#ccfbf1',   /* teal-100 */
    'proses-text':  '#134e4a',   /* teal-900 */
    selesai:        '#16a34a',   /* green-600 */
    'selesai-bg':   '#dcfce7',   /* green-100 */
    'selesai-text': '#14532d',   /* green-900 */
    dibatalkan:     '#dc2626',   /* red-600 */
    'dibatalkan-bg':'#fee2e2',   /* red-100 */
    'dibatalkan-text':'#7f1d1d', /* red-900 */
  },
  sidebar: {
    DEFAULT: '#0f172a',   /* slate-900 */
    hover:   '#1e293b',   /* slate-800 */
    active:  '#0f172a',
    border:  '#1e293b',
  },
},
```

---

## 2. Sidebar — `components/layout/Sidebar.tsx`

### What to change:
- Background: replace `bg-card` with `bg-[#0f172a]`
- Brand area: replace border color with `border-[#1e293b]`
- Brand icon: change from `bg-primary` to `bg-teal-500`
- Brand name: change text color to `text-white`
- Nav item default state: change from `text-muted-foreground hover:bg-accent` to `text-slate-400 hover:bg-white/5 hover:text-white`
- Nav item **active state**: replace `bg-primary text-primary-foreground` with the following combined classes:
  ```
  relative bg-white/8 text-white border-l-2 border-teal-500 pl-[10px]
  ```
  This creates a left accent bar (teal) on the active item — more refined than a solid background fill.
- User footer area: replace `border-t` with `border-t border-[#1e293b]`
- User name text: change to `text-white`
- Role badge: change variant to use `bg-teal-900 text-teal-300` and ensure minimum font size `text-xs` (never below 12px — remove any `text-[10px]`)
- Unread notification badge: keep `bg-destructive` but make it `bg-red-500`

---

## 3. Mobile Drawer — `components/layout/MobileDrawer.tsx`

Apply the **exact same visual changes as the Sidebar** above. The mobile drawer must be visually identical to the desktop sidebar:
- Same dark background `bg-[#0f172a]`
- Same active item style with left border accent
- Same text colors
- Same user footer style

Consistency between mobile and desktop is mandatory.

---

## 4. Header — `components/layout/Header.tsx`

### What to change:
- Background: change `bg-background` to `bg-white dark:bg-[#111827]`
- Add subtle bottom shadow: add `shadow-sm` class
- Add `backdrop-blur-sm` for a frosted glass effect when scrolling
- **Left side (desktop)**: The left side of the header is currently empty on desktop. Add a breadcrumb/page title area. Insert a `<div>` on the left that displays the current page title. Use `usePathname()` from `next/navigation` to derive the page name and map it to a human-readable label. Example mapping:

```ts
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/tickets': 'Tiket',
  '/dashboard/create-ticket': 'Buat Tiket',
  '/dashboard/staff': 'Manajemen User',
  '/dashboard/teams': 'Manajemen Tim',
  '/dashboard/my-team': 'Tim Saya',
  '/dashboard/reports': 'Laporan',
  '/dashboard/audit-log': 'Audit Log',
  '/dashboard/notifications': 'Notifikasi',
  '/dashboard/settings': 'Pengaturan',
  '/dashboard/system-settings': 'Pengaturan Sistem',
};
```

Display it as:
```tsx
<h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 hidden lg:block">
  {PAGE_TITLES[pathname] ?? 'Dashboard'}
</h1>
```

- Notification bell: keep existing logic, but update badge to `bg-red-500`
- Avatar fallback: change background to `bg-teal-600 text-white`

---

## 5. Auth Layout — `app/(auth)/layout.tsx`

### What to change:
Redesign to a **split layout**:
- Left panel (hidden on mobile, visible `lg:flex`): dark background `bg-[#0f172a]`, takes up `lg:w-1/2` of the screen. Contains:
  - App logo/icon centered (teal shield icon or similar)
  - App name **SIGAP** in large white bold text
  - Tagline: `"Sistem Informasi Gangguan dan Aduan Polri"` in `text-slate-400`
  - A subtle decorative element: a grid of small dots or a geometric pattern using `opacity-10` so it doesn't distract
- Right panel: white background `bg-white dark:bg-[#0f172a]`, takes up `lg:w-1/2`, centered content with the form. On mobile this panel takes full width.

Example structure:
```tsx
<div className="flex min-h-screen">
  {/* Left branding panel */}
  <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-[#0f172a] relative overflow-hidden">
    {/* decorative dots background */}
    <div className="absolute inset-0 opacity-5"
      style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
    />
    <div className="relative z-10 flex flex-col items-center gap-4 text-center px-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600">
        <Shield className="h-9 w-9 text-white" />
      </div>
      <h1 className="text-4xl font-bold text-white tracking-tight">SIGAP</h1>
      <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
        Sistem Informasi Gangguan dan Aduan Polri — Polda Kalimantan Selatan
      </p>
    </div>
  </div>

  {/* Right form panel */}
  <div className="flex w-full lg:w-1/2 flex-col items-center justify-center min-h-screen bg-white dark:bg-[#111827] px-6 py-12">
    <div className="w-full max-w-sm">
      {children}
    </div>
  </div>
</div>
```

---

## 6. Stat Cards — `components/dashboard/StatCard.tsx`

### What to change:
- Add a **very subtle tinted background** per variant using low-opacity color:
  - `warning` (Pending): `bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30`
  - `info` (Proses): `bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30`
  - `success` (Selesai): `bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30`
  - `danger` (Dibatalkan): `bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30`
- Icon background color should match the variant:
  - `warning`: `bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400`
  - `info`: `bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400`
  - `success`: `bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400`
  - `danger`: `bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400`
- Value (the big number): `text-2xl font-bold`
- Title: `text-sm font-medium text-muted-foreground`

---

## 7. Status Badge — Consolidate into Single Source of Truth

### Step 1: Create `lib/status-config.ts`

```ts
export type TicketStatus = 'PENDING' | 'PROSES' | 'SELESAI' | 'DIBATALKAN';

export const STATUS_CONFIG: Record<TicketStatus, {
  label: string;
  className: string;
}> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  },
  PROSES: {
    label: 'Proses',
    className: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-800',
  },
  SELESAI: {
    label: 'Selesai',
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  },
  DIBATALKAN: {
    label: 'Dibatalkan',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
  },
};
```

### Step 2: Update `components/tickets/StatusBadge.tsx`
Import from `lib/status-config.ts` and use `STATUS_CONFIG`. Remove any locally defined status config inside this file.

### Step 3: Remove duplicate StatusBadge in `app/(dashboard)/dashboard/page.tsx`
Delete the locally defined `statusConfig` and `StatusBadge` component inside `dashboard/page.tsx`. Import and use `StatusBadge` from `components/tickets/StatusBadge.tsx` instead.

### Step 4: Audit all other dashboard files
Check `BidtekkomDashboard.tsx`, `PadalDashboard.tsx`, `TeknisiDashboard.tsx` for any locally defined status colors or badge components. Replace all of them with the shared `StatusBadge` component and `STATUS_CONFIG`.

---

## 8. Charts — `components/dashboard/BidtekkomDashboard.tsx`, `PadalDashboard.tsx`, `TeknisiDashboard.tsx`

### What to change:
Update all Recharts color values to use the new teal-based palette:
- Primary data series: `#0d9488` (teal-600)
- Secondary data series: `#3b82f6` (blue-500)
- Tertiary data series: `#f59e0b` (amber-500)
- Quaternary data series: `#16a34a` (green-600)
- Danger/negative series: `#dc2626` (red-600)

Update `CartesianGrid` stroke to `hsl(var(--chart-grid))`
Update axis tick color to `hsl(var(--chart-axis))`
Update `Tooltip` style: `contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}`

---

## 9. Typography Hierarchy — Apply Globally

Apply consistent typography across all page files in `app/(dashboard)/dashboard/`:

| Element | Classes to use |
|---|---|
| Page title (h1) | `text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100` |
| Page subtitle | `text-sm text-muted-foreground` |
| Section/card heading | `text-base font-semibold text-slate-800 dark:text-slate-200` |
| Table header cell | `text-xs font-semibold text-slate-500 uppercase tracking-wide` |
| Table body cell | `text-sm text-slate-700 dark:text-slate-300` |
| Muted/secondary text | `text-sm text-muted-foreground` |
| Minimum font size | **Never use below `text-xs` (12px). Remove all `text-[10px]` instances.** |

---

## 10. Dashboard Page Layout — `app/(dashboard)/dashboard/page.tsx`

### What to change:
- Page wrapper padding: keep `p-6`
- Space between sections: keep `space-y-6`
- The greeting text: change to `text-muted-foreground text-sm` (smaller, more subdued)
- Page title: apply the typography standard from section 9
- Stat cards grid: keep `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`
- Recent tickets table rows: add `transition-colors` to hover state
- Table header: apply `text-xs font-semibold text-slate-500 uppercase tracking-wide` to all `<TableHead>` cells

---

## 11. Dashboard Layout — `app/(dashboard)/layout.tsx`

### What to change:
- Main content area background: ensure it uses `bg-background` (which is now `slate-50`, not white)
- The overall shell: `flex h-screen overflow-hidden`
- Content area: `flex-1 overflow-y-auto bg-background`
- Make sure the sidebar does not shrink: `flex-shrink-0` on the sidebar wrapper

---

## 12. Buttons — Global

All primary buttons across the app will automatically use the new teal primary color from the CSS variables. No changes needed individually — the CSS variable change in step 1 handles this.

However, make sure no button has a hardcoded `bg-blue-*` or `bg-primary-*` class that overrides the CSS variable. Search for and remove any such overrides.

---

## 13. Focus Rings and Interactive States

In `globals.css`, ensure the focus ring uses the teal ring variable:
```css
@layer base {
  *:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }
}
```

---

## 14. Cards — Global Elevation

In `globals.css`, add a subtle card shadow to give elevation and depth:
```css
@layer base {
  .card, [data-card] {
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  }
}
```

This gives cards a subtle lift from the `slate-50` page background without being heavy or overdone.

---

## Final Checklist Before Committing

- [ ] No hardcoded hex colors remain in `.tsx` component files (except inside `lib/status-config.ts` and Recharts config)
- [ ] No `text-[10px]` instances remain anywhere
- [ ] Sidebar is dark (`bg-[#0f172a]`) on both desktop and mobile
- [ ] Active nav item has left teal border accent, not solid blue background
- [ ] Auth pages use split layout with SIGAP branding on the left
- [ ] `StatusBadge` is only defined in one place (`components/tickets/StatusBadge.tsx`)
- [ ] All charts use teal as primary color
- [ ] Dark mode: card background (`#111827`) is visually different from page background (`#090f1a`)
- [ ] Header left side shows current page title on desktop
- [ ] All primary interactive elements (buttons, links, focus rings) use teal, not blue
- [ ] No logic, API calls, validation, or TypeScript interfaces were changed

---

## Important Reminders

- This is a **visual-only** redesign. Do not touch any function, hook, API call, or business logic.
- If a change would require modifying a component's props or TypeScript interface, **skip that change** and leave a comment instead.
- Test dark mode after every major change.
- The app name is **SIGAP** — use this wherever a brand name appears (auth layout, browser title if applicable, sidebar brand area).
