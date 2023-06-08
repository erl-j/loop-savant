import {getAuth, signInAnonymously, signInWithEmailAndPassword} from "firebase/auth";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDYtMI056CdDbKOYkslz3Ur4gGEiS-HGew",
  authDomain: "loop-savant.firebaseapp.com",
  projectId: "loop-savant",
  storageBucket: "loop-savant.appspot.com",
  messagingSenderId: "985014069373",
  appId: "1:985014069373:web:e523940e6b8488fd646914",
  measurementId: "G-5PHLH4QYYY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export default app
