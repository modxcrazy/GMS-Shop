// Initialize Firebase with your config
const firebaseConfig = {
  apiKey: "AIzaSyBgTfR8LW6XvZ7QsqoDskwd0LDKzwkDE3c",
  authDomain: "bkeditor-696ed.firebaseapp.com",
  databaseURL: "https://bkeditor-696ed-default-rtdb.firebaseio.com",
  projectId: "bkeditor-696ed",
  storageBucket: "bkeditor-696ed.appspot.com",
  messagingSenderId: "101064331771",
  appId: "1:101064331771:web:69016baa8c04651937bb5e",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Export services
export { db, auth, storage };
