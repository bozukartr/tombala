// firebase-config.js — Firebase ayarları.
//
// Bu dosya bilerek repoda: GitHub Pages'te çevrimiçi modun çalışması için
// gerekiyor. Web API anahtarı gizli bir değer değildir, zaten her tarayıcıya
// gönderilir. Odaları koruyan iki şey var:
//   1. database.rules.json'un Firebase'e yüklenmiş olması,
//   2. Authentication → Settings → Authorized domains listesi.
export const firebaseConfig = {
  apiKey: 'AIzaSyAvW4EQlwhK-xZTYIMCcdbm5BXkwdkEHwc',
  authDomain: 'tombala-3d421.firebaseapp.com',
  databaseURL: 'https://tombala-3d421-default-rtdb.firebaseio.com',
  projectId: 'tombala-3d421',
  storageBucket: 'tombala-3d421.firebasestorage.app',
  messagingSenderId: '516747872708',
  appId: '1:516747872708:web:3ed30058b7255c4aad7c91',
};
