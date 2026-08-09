// Firebase Console > Project settings > Your apps > Web app alanındaki
// yapılandırma nesnesini buraya yapıştır. Bu değerler istemci yapılandırmasıdır;
// güvenliği database.rules.json ve Authorized domains sağlar.
export const firebaseConfig = {
  apiKey: 'BURAYA_API_KEY',
  authDomain: 'BURAYA_PROJECT_ID.firebaseapp.com',
  databaseURL: 'https://BURAYA_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId: 'BURAYA_PROJECT_ID',
  storageBucket: 'BURAYA_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'BURAYA_MESSAGING_SENDER_ID',
  appId: 'BURAYA_APP_ID',
};
