// 이용자 행동 로그의 Firestore 연결 (specs/024, DEC-031). 기록 지점: useGameState 액션, AuthService
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { ACTIVITY_COLLECTION } from '../types/activity';
import { createActivityLogger, newSessionId } from './activityLog';
import { isLocalServer } from './storageService';

function requireDb() {
  if (!isFirebaseConfigured || !db) throw new Error('Firestore not configured');
  return db;
}

export const activityLog = createActivityLogger({
  isLocal: () => isLocalServer() || !isFirebaseConfigured || !db,
  now: () => Date.now(),
  sessionId: newSessionId(),
  addEvent: (event) => addDoc(collection(requireDb(), ACTIVITY_COLLECTION), { ...event, at: serverTimestamp() }),
  queryOldIds: async (uid, beforeMs, max) => {
    const snap = await getDocs(
      query(
        collection(requireDb(), ACTIVITY_COLLECTION),
        where('uid', '==', uid),
        where('at', '<', Timestamp.fromMillis(beforeMs)),
        limit(max),
      ),
    );
    return snap.docs.map((d) => d.id);
  },
  listIds: async (uid, max) => {
    const snap = await getDocs(query(collection(requireDb(), ACTIVITY_COLLECTION), where('uid', '==', uid), limit(max)));
    return snap.docs.map((d) => d.id);
  },
  deleteIds: async (ids) => {
    const firestore = requireDb();
    const batch = writeBatch(firestore);
    ids.forEach((id) => batch.delete(doc(firestore, ACTIVITY_COLLECTION, id)));
    await batch.commit();
  },
});
