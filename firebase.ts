import { initializeApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signOut as fbSignOut, onAuthStateChanged, User
} from 'firebase/auth';
import {
  getFirestore,
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, orderBy
} from 'firebase/firestore';
import { SavedSeoResult } from './types';
import firebaseConfig from './firebase-applet-config.json';

// ─── INIT (generato da AI Studio) ────────────────────────────────────────────

const app             = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
export const db       = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// ─── AUTH — nomi originali AI Studio ─────────────────────────────────────────

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout          = () => fbSignOut(auth);

// ─── AUTH — alias usati da App.tsx ────────────────────────────────────────────

export const signInWithGoogle = loginWithGoogle;
export const signOut          = logout;

export const onAuthChange = (
  callback: (user: User | null) => void
): (() => void) => onAuthStateChanged(auth, callback);

// ─── FIRESTORE — /articles/{articleId} ───────────────────────────────────────

const articlesRef = () => collection(db, 'articles');

/** Salva un articolo con uid come campo owner. Restituisce il docId Firestore. */
export const saveArticleToCloud = async (
  uid: string,
  article: SavedSeoResult
): Promise<string> => {
  const clean = JSON.parse(JSON.stringify(article)); // rimuove undefined
  const docRef = await addDoc(articlesRef(), {
    ...clean,
    uid,
    createdAt: article.savedAt || new Date().toISOString(),
    syncedAt:  new Date().toISOString(),
  });
  return docRef.id;
};

/** Carica tutti gli articoli dell'utente, ordinati dal più recente. */
export const loadArticlesFromCloud = async (uid: string): Promise<SavedSeoResult[]> => {
  const q = query(
    articlesRef(),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    ...(d.data() as SavedSeoResult),
    firebaseId: d.id,
  }));
};

/** Elimina un articolo tramite firebaseId (docId Firestore). */
export const deleteArticleFromCloud = async (
  _uid: string,
  firebaseId: string
): Promise<void> => {
  await deleteDoc(doc(db, 'articles', firebaseId));
};