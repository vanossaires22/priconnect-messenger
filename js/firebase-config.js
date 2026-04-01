// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEtRBHTtEqwzkQcI-tFmQKgrEH2IKyK_g",
  authDomain: "priconnecte.firebaseapp.com",
  projectId: "priconnecte",
  storageBucket: "priconnecte.firebasestorage.app",
  messagingSenderId: "960107252322",
  appId: "1:960107252322:web:637cff99bbed9d1205f3b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Делаем db доступным для других скриптов
window.db = db; 
