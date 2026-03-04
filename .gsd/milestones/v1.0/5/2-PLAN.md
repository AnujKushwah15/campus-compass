# Phase 5 Plan 2: Frontend Polish & Error Handling

## Objective
Refine the Next.js user experience by implementing global error boundaries to prevent cryptic white-screen crashes, updating SEO metadata, and ensuring consistent application states (REQ-07).

## Tasks

### 1. Global Error Boundaries
- **Create `app/error.jsx`**: An application-wide error boundary.
  - Implement a user-friendly fallback UI using Tailwind.
  - Provide a "Try Again" button that utilizes Next.js's `reset()` function.
- **Create `app/global-error.jsx`**: A root layout error boundary to catch total application panics.
- **Create `app/not-found.jsx`**: A custom 404 page that matches the application's branding instead of the default Next.js 404.

### 2. Metadata, SEO, and Theming Polish
- **Update `app/layout.jsx`**: Remove the default "Create Next App" metadata. Provide proper titles and descriptions (e.g., "Campus Compass: Real-time Transit Telemetry").
- **Light Mode UI Polish**: Ensure that all dashboard UI elements, text, buttons, and stream interfaces are correctly coloured and distinct when the browser is set to light mode, preventing components from blending into background elements. Ensure standard favicon.

### 3. UX Edge Cases Check
- Ensure that the dashboard loading states are clear (e.g., Skeleton loaders or spinners).
- Confirm that error messages from Firebase or the Backend stream token endpoint are gracefully displayed in the UI.

### 4. Verification
- Introduce a temporary, deliberate fault in a page component to trigger the `error.jsx` boundary.
- Navigate to a non-existent URL to verify the 404 `not-found.jsx` boundary.
- Remove faults and confirm standard operation.
