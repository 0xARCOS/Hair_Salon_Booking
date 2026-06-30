import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export async function requestPushPermission(): Promise<string | null> {
  const supported = await isSupported();
  if (!supported) {
    console.warn("Push messaging is not supported in this browser.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission denied");
    }
    const messaging = getMessaging(app);
    // Usamos el service worker de Serwist (/sw.js), que incluye el listener
    // de 'push'. Si no se lo pasamos, Firebase buscaría /firebase-messaging-sw.js
    // (que no existe) y fallaría al obtener el token.
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token;
  } catch (err) {
    console.error("Error requesting push permission:", err);
    return null;
  }
}

export { app };
