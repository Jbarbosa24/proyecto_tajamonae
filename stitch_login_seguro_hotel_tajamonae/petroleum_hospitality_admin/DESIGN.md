# Design System Specification: Hospitality Management Platform

## 1. Overview & Creative North Star
The hospitality industry is built on the marriage of precision and warmth. To translate this into a Property Management System (PMS), we move away from the cluttered "dashboard fatigue" common in administrative software. 

**The Creative North Star: The Digital Concierge.**
The goal is to create an experience that feels like a high-end editorial publication rather than a database. We achieve this through "The Soft Grid"—an intentional use of expansive white space (using the `20` and `24` spacing tokens), high-contrast typography scales, and a departure from traditional box-modeling. By utilizing tonal layering and eliminating harsh borders, the interface breathes, reducing the cognitive load on staff managing complex bookings and operations.

---

## 2. Colors & Surface Philosophy
The palette is derived from the Petroleum Blue and Terracotta of the brand logo, reimagined for a digital-first administrative environment.

### The Palette (Material Design Tokens)
*   **Background:** `#f7f9fb` (Base canvas for all views).
*   **Primary (Petroleum):** `#005d6a` (Authority, focus, and primary actions).
*   **Secondary (Terracotta):** `#924b08` (Subtle alerts, human touchpoints, and accents).
*   **Surface Hierarchy:**
    *   `surface_container_lowest`: `#ffffff` (The "Sheet" - reserved for the highest level of focus).
    *   `surface_container_low`: `#f2f4f6` (Secondary functional areas).
    *   `surface_container_highest`: `#e0e3e5` (Deepest indentation/utility bars).

### Key Architectural Rules
*   **The "No-Line" Rule:** 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts. For example, a `surface_container_lowest` card sits directly on a `surface` background.
*   **The "Glass & Gradient" Rule:** To provide "soul," primary CTAs should utilize a subtle linear gradient from `primary` (#005d6a) to `primary_container` (#0e7787). Floating navigation elements (like a top bar during scroll) should use `surface_container_lowest` with a 20px backdrop-blur and 80% opacity.
*   **Nesting:** Depth is created by "stacking." A white card (`lowest`) should never sit on a white background; it must sit on `surface` or `surface_container_low` to create natural edge definition.

---

## 3. Typography: Editorial Authority
We utilize a dual-font strategy to balance character with extreme legibility.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern hospitality feel. 
    *   `display-lg` (3.5rem): Used for high-level data summaries (e.g., Occupancy %).
    *   `headline-md` (1.75rem): Used for page titles.
*   **Body & Labels (Inter):** A workhorse for administrative efficiency.
    *   `body-md` (0.875rem): The standard for all data entry and guest details.
    *   `label-sm` (0.6875rem): Used for metadata and status indicators, always in uppercase with +5% letter spacing.

---

## 4. Elevation & Depth
In this system, elevation is a matter of light and tone, not just "shadows."

*   **Tonal Layering:** Avoid the "floating box" look. Rely on the `surface-container` tiers to create a "nested" physical feel.
*   **Ambient Shadows:** Where floating is necessary (e.g., Modals), use a shadow with a 24px blur and 6% opacity. The shadow color must be a tinted version of the `on_surface` color (`#191c1e`) rather than pure black.
*   **The Ghost Border Fallback:** If a container requires further definition (e.g., on mobile), use the `outline_variant` token at 15% opacity. High-contrast, 100% opaque borders are forbidden.
*   **Roundedness:** Adhere to the `md` (0.75rem) or `lg` (1rem) tokens for all containers. This "Soft Rounded" approach conveys hospitality and approachability.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `on_primary` text, `lg` roundedness. No border.
*   **Secondary:** Ghost style using `surface_container_low` background with `primary` text.
*   **Tertiary:** Text-only with `primary` color, utilizing a 2px bottom-bar on hover rather than an outline.

### Inputs & Fields
*   **Style:** Minimalist. Fields use `surface_container_lowest` (white) with a `surface_variant` background when inactive.
*   **States:** On focus, the background remains white, but a 2px "Ghost Border" of `primary` appears at 20% opacity.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines between list items. Use vertical white space (`spacing-4`) or alternating tonal backgrounds (`surface` vs `surface_container_low`).
*   **Grouping:** Group guest information using "Tonal Buckets"—large areas of subtle color shifts that house related data points.

### Hospitality-Specific Components
*   **Status Badges:** Use `secondary_container` for "Occupied" and `primary_fixed` for "Available." Keep text `on_secondary_container` for maximum legibility.
*   **Timeline/Gantt:** Avoid grids. Use translucent `primary` bars on a `surface` background with `xl` (1.5rem) rounded corners for a soft, approachable schedule.

---

## 6. Do’s and Don’ts

### Do
*   **Do** prioritize white space over information density. If a screen feels full, increase the spacing tokens.
*   **Do** use asymmetrical layouts. A large headline on the left with data shifted to the right creates a premium editorial feel.
*   **Do** use `tertiary` (Orange/Terracotta) only for human-centric alerts (e.g., "Guest Request" or "VIP Arrival").

### Don't
*   **Don't** use 1px solid black or grey lines to separate content.
*   **Don't** use standard "Drop Shadows" from generic UI kits.
*   **Don't** cram multiple data tables into a single view without significant tonal separation.
*   **Don't** use high-saturation reds for errors; use the `error` token (#ba1a1a) which is more sophisticated and less "alarming."