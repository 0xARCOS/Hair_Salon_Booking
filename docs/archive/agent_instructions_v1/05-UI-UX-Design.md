# UI/UX & Design Aesthetics

## 1. General Aesthetic
The design must WOW the user at first glance. 
- **Theme**: Implement a modern dark mode by default, or a very clean, curated light mode with a premium feel. Do NOT use generic tailwind colors (like `bg-red-500`). Use customized HSL tokens in `globals.css`.
- **Typography**: Use a modern font like `Inter`, `Outfit`, or `Plus Jakarta Sans`. Configure it in `next/font/google`.
- **Effects**: Utilize glassmorphism (`backdrop-blur`, subtle borders), smooth gradients for CTA buttons, and micro-animations (e.g., hover scaling, active states).

## 2. Components
### Landing Page
- **Hero Section**: Large, bold typography with a dynamic background. Uses a custom vanilla CSS approach via `src/app/landing.css` for highly specialized styling (e.g. glassmorphism elements, custom micro-animations).
- **Sticky CTA**: "Book Appointment" button always accessible.
- **Services Grid**: Cards displaying services with prices and duration. Add hover effects to the cards.
- **Guest Booking Form**: An elegant embedded booking widget (`GuestBookingForm.tsx`) styled via `landing.css`.

### Client Dashboard
- Minimalist overview of upcoming appointments.
- Progress indicator for "active_treatment_phase" (if applicable).
- Skeleton loaders while fetching data.

### Staff Panel (/admin)
- A highly functional data table (use shadcn/ui Table).
- Inline dropdowns to update appointment status.
- Stats cards at the top (e.g., "Revenue Today", "Upcoming Appointments").

## 3. Implementation Rules
- NEVER use placeholders if possible. If an image is needed, use the `generate_image` tool to create a relevant mockup asset.
- Prioritize responsiveness. Test layouts on mobile (`sm:` breakpoints in Tailwind).
- Ensure all interactive elements have focus states for accessibility.
