# Push Notifications (FCM + PWA)

## 1. Architecture Overview
To provide staff members with immediate alerts when a new booking is received, we will implement a Web Push Notification system utilizing **Firebase Cloud Messaging (FCM)** and **Next.js PWA capabilities**. This allows staff to install the web application on their iOS or Android devices and receive native-feeling notifications.

## 2. Progressive Web App (PWA) Setup
- **Dependencies**: Use `next-pwa` (or `serwist`) to generate the service worker and make the Next.js app installable.
- **Manifest**: Create `public/manifest.json` detailing the app name, icons, and display mode (`standalone`).
- **Service Worker (`sw.js`)**: Must be configured to intercept and display incoming push events via `self.addEventListener("push", ...)`.

## 3. Firebase Cloud Messaging Setup
1. **Firebase Project**: Create a new project in the Firebase Console.
2. **Web Credentials**: Generate web credentials and add them to the `.env.local` file:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
FIREBASE_SERVICE_ACCOUNT_KEY=... # JSON String or separate vars for server-side
```
3. **FCM Service Worker**: Provide the Firebase config to the service worker to receive messages while the app is in the background.

## 4. Subscription Management in Supabase
When a staff member logs in and grants notification permissions:
1. The client requests a device token from FCM.
2. The device token is stored in the Supabase database.
   
```sql
-- Create a table for push tokens
CREATE TABLE public.push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Staff can insert/update their own tokens. Server can read all.
```

## 5. Notification Dispatch Logic
Modify the `createGuestAppointment` and `createAppointment` server actions (in `src/actions/booking.ts`), or use a Supabase Edge Function triggered by an `appointments` table `INSERT`:

1. **Trigger**: New record added to `appointments`.
2. **Fetch Tokens**: Query the `push_tokens` table for all tokens belonging to users with `role = 'staff'`.
3. **Send via FCM HTTP v1 API**: Use the Firebase Admin SDK (or raw HTTP requests) on the server to send the notification payload to all staff tokens.
4. **Payload Example**:
   ```json
   {
     "notification": {
       "title": "Nueva Cita Reservada",
       "body": "Irene Pérez - Corte de Pelo a las 10:00"
     },
     "webpush": {
       "fcm_options": {
         "link": "/admin"
       }
     }
   }
   ```

## 6. iOS and Android Considerations
- **iOS Support**: Requires iOS 16.4+. The user MUST "Add to Home Screen" before the application can request push notification permissions.
- **Android**: Supported in most major browsers directly, but "Add to Home Screen" provides the best native experience.
