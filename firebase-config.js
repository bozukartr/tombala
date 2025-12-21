// Firebase Configuration
// REPLACE THESE VALUES WITH YOUR OWN FIREBASE PROJECT CONFIGURATION
const firebaseConfig = {
    apiKey: "AIzaSyBL1YVHaRPKS7oDkURqCmsQhpu9Wtd_PwM",
    authDomain: "tombala-35469.firebaseapp.com",
    databaseURL: "https://tombala-35469-default-rtdb.firebaseio.com",
    projectId: "tombala-35469",
    storageBucket: "tombala-35469.firebasestorage.app",
    messagingSenderId: "93849197990",
    appId: "1:93849197990:web:18319a9c3ec9fda808c367",
    measurementId: "G-G8RTFSLFWF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const rdb = firebase.database();
