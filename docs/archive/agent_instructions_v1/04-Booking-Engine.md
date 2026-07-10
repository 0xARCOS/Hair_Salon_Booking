# Booking Engine & Integrations

## 1. Booking Flow (Hybrid Model)
The booking system supports both registered users and guest users:
- **Authenticated Users**: Can book via the Client Dashboard wizard.
- **Guest Users**: Can book via the `GuestBookingForm` on the landing page, providing just their name and phone number.
- **Confirmation**: Guest bookings are stored as 'pending' and the salon staff can confirm them from the admin panel.

## 2. Server Action: Fetching Available Slots
Located in `src/actions/booking.ts`.
- **Inputs**: `date` (string), `duration_mins` (number).
- **Logic**:
  1. Define business hours (dynamically checks if the day is open).
  2. Query the Supabase `appointments` table for existing bookings on that date with status 'pending' or 'confirmed'.
  3. Calculate and return `available_slots` (intervals of `duration_mins` within business hours that do not overlap with existing appointments).

## 3. Server Action: Creating Appointment
The primary action for guests is `createGuestAppointment`.
- **Inputs**: Form data (name, phone, service_id, date, time, message).
- **Logic**:
  1. Parse date/time and validate availability (prevent race conditions).
  2. Insert record into `appointments` table with `status='pending'` and guest details.
  3. **Notification**: Send an email notification to the salon staff using the **Resend API**.

## 4. Environment Variables
Ensure the following exist in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
SALON_NOTIFICATION_EMAIL=...
RESEND_FROM=...
```
