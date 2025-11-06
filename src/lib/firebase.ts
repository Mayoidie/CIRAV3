// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Web app's Firebase configuration with the corrected storageBucket
const firebaseConfig = {
  apiKey: "AIzaSyAsOkziuS2XRQ3FifxPeRFbwDnsRgM4RF0",
  authDomain: "cira-db.firebaseapp.com",
  projectId: "cira-db",
  storageBucket: "cira-db.appspot.com",
  messagingSenderId: "388474554775",
  appId: "1:388474554775:web:f6751b24b70412e4619cd2",
  measurementId: "G-Q8P7S0M855"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence);
const db = getFirestore(app);

export { auth, db };