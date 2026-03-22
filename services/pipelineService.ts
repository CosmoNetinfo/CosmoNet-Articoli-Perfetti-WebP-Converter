/**
 * pipelineService.ts
 * Posiziona in: src/services/pipelineService.ts
 * 
 * Versione aggiornata con filtraggio per userId e auth guards.
 */

import { auth } from "../firebase";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const _pipelineApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(_pipelineApp, "ai-studio-97eba17a-fb83-44c5-866a-979f9be9fe0f");

import {
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

const COLLECTION = "pipeline";

export type PipelineStatus = "brief_ready" | "article_ready" | "done" | "error";

export interface PipelineJob {
  id?: string;
  title: string;
  brief: string;
  html: string | null;
  imageUrl: string | null;
  imageMetadata: {
    altText: string;
    caption: string;
    description: string;
    focusKeyword: string;
  } | null;
  status: PipelineStatus;
  userId: string;
  error: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** TOOL 1 — Brief Generator: crea un nuovo job pipeline */
export async function createPipelineJob(
  brief: string,
  title: string,
  userId: string
): Promise<string> {
  if (!auth.currentUser) throw new Error("Utente non autenticato");
  
  const docRef = await addDoc(collection(db, COLLECTION), {
    title,
    brief,
    html: null,
    imageUrl: null,
    imageMetadata: null,
    status: "brief_ready",
    userId,
    error: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** TOOL 2 — Articoli Perfetti: salva HTML e avanza status */
export async function updateJobWithArticle(
  jobId: string,
  html: string,
  userId: string
): Promise<void> {
  if (!auth.currentUser) throw new Error("Utente non autenticato");

  await updateDoc(doc(db, COLLECTION, jobId), {
    html,
    status: "article_ready",
    userId,
    updatedAt: serverTimestamp(),
  });
}

/** TOOL 3 — Blog Image AI: salva immagine e metadata, chiude job */
export async function updateJobWithImage(
  jobId: string,
  imageUrl: string,
  metadata: PipelineJob["imageMetadata"],
  userId: string
): Promise<void> {
  if (!auth.currentUser) throw new Error("Utente non autenticato");

  await updateDoc(doc(db, COLLECTION, jobId), {
    imageUrl,
    imageMetadata: metadata,
    status: "done",
    userId,
    updatedAt: serverTimestamp(),
  });
}

/** Segna un job come errore */
export async function setJobError(
  jobId: string,
  error: string
): Promise<void> {
  if (!auth.currentUser) throw new Error("Utente non autenticato");

  await updateDoc(doc(db, COLLECTION, jobId), {
    status: "error",
    error,
    updatedAt: serverTimestamp(),
  });
}

/** Listener real-time per un determinato status e userId — usato da Tool 2 e Tool 3 */
export function listenForStatus(
  status: PipelineStatus,
  userId: string,
  callback: (jobs: PipelineJob[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", status),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as PipelineJob)
    );
    callback(jobs);
  }, (error) => {
    console.warn(`[Pipeline] Listener error for ${status}:`, error);
  });
}
