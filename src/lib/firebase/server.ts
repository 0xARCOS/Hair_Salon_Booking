import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

// Inicialización perezosa del Admin SDK de Firebase.
// Devuelve null si faltan las credenciales, de modo que las reservas
// siguen funcionando aunque las notificaciones push no estén configuradas
// (igual que el aviso por email).
let messaging: Messaging | null = null;

export function getAdminMessaging(): Messaging | null {
  if (messaging) return messaging;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;

  try {
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error("Firebase admin initialization error", error);
    return null;
  }
}
