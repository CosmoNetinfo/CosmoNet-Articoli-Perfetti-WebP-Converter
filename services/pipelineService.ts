/**
 * pipelineService.ts
 * Posiziona in: src/services/pipelineService.ts
 * Copiare questo file identico in tutti e tre i tool.
 * 
 * Dipende da: src/firebase.ts (già presente nel Brief Generator)
 */

import { db } from "../firebase";
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
  error: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** TOOL 1 — Brief Generator: crea un nuovo job pipeline */
export async function createPipelineJob(
  brief: string,
  title: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    title,
    brief,
    html: null,
    imageUrl: null,
    imageMetadata: null,
    status: "brief_ready",
    error: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** TOOL 2 — Articoli Perfetti: salva HTML e avanza status */
export async function updateJobWithArticle(
  jobId: string,
  html: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, jobId), {
    html,
    status: "article_ready",
    updatedAt: serverTimestamp(),
  });
}

/** TOOL 3 — Blog Image AI: salva immagine e metadata, chiude job */
export async function updateJobWithImage(
  jobId: string,
  imageUrl: string,
  metadata: PipelineJob["imageMetadata"]
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, jobId), {
    imageUrl,
    imageMetadata: metadata,
    status: "done",
    updatedAt: serverTimestamp(),
  });
}

/** Segna un job come errore */
export async function setJobError(
  jobId: string,
  error: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, jobId), {
    status: "error",
    error,
    updatedAt: serverTimestamp(),
  });
}

/** Listener real-time per un determinato status — usato da Tool 2 e Tool 3 */
export function listenForStatus(
  status: PipelineStatus,
  callback: (jobs: PipelineJob[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const jobs = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as PipelineJob)
      );
      callback(jobs);
    },
    (error) => {
      if (error.code === "permission-denied") {
        console.warn(`[Pipeline] Listener ${status}: attendo autenticazione...`);
      } else {
        console.error(`[Pipeline] Errore listener ${status}:`, error);
      }
    }
  );
}