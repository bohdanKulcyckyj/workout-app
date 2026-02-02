# UI Design Improvements  Implementation Plan

## Overview

Fix 6 mobile UI inconveniences across the workout app: undersized buttons, cramped spacing, small checkboxes, small back arrows, weight input layout shift, and uneven form column widths. All size increases target 36px (`size-9` / `icon`) for consistency.

---

## Phase 1: Plan List Page  Button Sizes & Spacing

**Goal:** Make all interactive elements on the plan list page comfortably tappable on mobile.

**Files:**
- [app/page.tsx](app/page.tsx)  "New" button (lines 22-27)
- [components/plan-list-table.tsx](components/plan-list-table.tsx)  Play button (lines 52-62), three-dots button (lines 64-73), dropdown menu items

**Changes:**

1. **"New" button** in `app/page.tsx`: Currently default size (`h-9`). Increase to `size="lg"` or add min-height/padding so it's comfortable on mobile.

2. **Play (start workout) button** in `plan-list-table.tsx`: Change `size="icon-sm"` (32px) ’ `size="icon"` (36px). Update `min-w-[32px] min-h-[32px]` ’ `min-w-[36px] min-h-[36px]`.

3. **Three-dots (more) button** in `plan-list-table.tsx`: Change `size="icon-sm"` ’ `size="icon"`.

4. **Spacing between play and three-dots buttons**: Add `gap-2` to the button container cell. Widen the cell from `w-[100px]` to accommodate the larger buttons + gap.

5. **Dropdown menu items** (Edit, Delete): These inherit from shadcn defaults which are already reasonable, but verify they have comfortable padding.

**Verification:**
- [ ] "New" button is comfortably tappable on mobile (min 36px height)
- [ ] Play and three-dots buttons are 36px each
- [ ] There is visible spacing between play and three-dots buttons
- [ ] Dropdown items (Edit, Delete) are easy to tap
- [ ] Layout doesn't overflow on small screens (320px width)

---

## Phase 2: Workout Checkboxes & Back Arrows (All Pages)

**Goal:** Increase checkbox size globally and increase back arrow buttons to 36px on all pages.

**Files:**
- [components/ui/checkbox.tsx](components/ui/checkbox.tsx)  Global checkbox size (line 16-18)
- [app/plan/[id]/workout/page.tsx](app/plan/%5Bid%5D/workout/page.tsx)  Back arrow (lines 123-130), checkbox column header width
- [app/plan/[id]/page.tsx](app/plan/%5Bid%5D/page.tsx)  Back arrow (lines 40-42)
- [app/plan/[id]/edit/page.tsx](app/plan/%5Bid%5D/edit/page.tsx)  Back arrow
- [app/plan/create/page.tsx](app/plan/create/page.tsx)  Back arrow

**Changes:**

1. **Checkbox component** (`components/ui/checkbox.tsx`): Increase root from `size-4` (16px) ’ `size-5` (20px). Increase CheckIcon from `size-3.5` ’ `size-4`.

2. **Back arrow buttons on all 4 pages**: Change `size="icon-sm"` ’ `size="icon"`. Change ArrowLeft icon from `size-4` ’ `size-5` for visual balance.

3. **Workout page checkbox column**: Widen `w-[40px]` ’ `w-[48px]` on the "Done" column header to accommodate the larger checkbox.

**Verification:**
- [ ] Checkboxes in workout mode are visibly larger and easy to tap
- [ ] Back arrow is 36px on: plan detail, edit, create, and workout pages
- [ ] Arrow icon is visually balanced within the larger button
- [ ] Checkbox column doesn't clip or cause layout issues

---

## Phase 3: Plan Form  Weight Input Offset & Column Widths

**Goal:** Fix the weight input layout jump on typing, equalize weight/reps column widths, and increase the delete (X) button size.

**Files:**
- [components/plan-form.tsx](components/plan-form.tsx)  Exercise table (lines 124-179), column widths, delete button
- [components/exercise-table.tsx](components/exercise-table.tsx)  Read-only exercise table column widths (keep consistent)

**Changes:**

1. **Weight input offset bug**: The layout shift when typing in the weight field is caused by the number input spinner arrows appearing/disappearing. Fix by adding CSS to hide the native number input spinners (`appearance: textfield` / `::-webkit-inner-spin-button` / `::-webkit-outer-spin-button` display none). Add this to `globals.css` or as a Tailwind utility so it applies to all number inputs.

2. **Equalize column widths**: Change Weight and Reps columns to both be `w-[72px]` (equal width, slightly adjusted from current 80/60 split). Update in both:
   - `components/plan-form.tsx`  form table headers
   - `components/exercise-table.tsx`  read-only table headers
   - `app/plan/[id]/workout/page.tsx`  workout mode table headers

3. **Delete (X) button**: Change from `size="icon-xs"` (24px) ’ `size="icon-sm"` (32px). Change X icon from `size-3` ’ `size-4`. Widen the delete column header from `w-[40px]` ’ `w-[44px]`.

**Verification:**
- [ ] Typing in weight input no longer causes layout shift
- [ ] Weight and Reps columns are visually the same width
- [ ] Delete (X) button is comfortably tappable
- [ ] Table still fits on small screens without horizontal scroll
- [ ] Read-only exercise table column widths match the form table
