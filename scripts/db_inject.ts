import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCGPrjF48OGAqfhJzUCd7Wb-_msS87kQNA',
  authDomain: 'nmixx-tcg.firebaseapp.com',
  projectId: 'nmixx-tcg',
  storageBucket: 'nmixx-tcg.firebasestorage.app',
  messagingSenderId: '1084995327740',
  appId: '1:1084995327740:web:85afe61c858b30c47e6979',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching all users...');
  const usersSnap = await getDocs(collection(db, 'nmixx_tcg_users'));
  console.log(`Total users in DB: ${usersSnap.size}`);
  
  let foundTarget = false;
  let foundAdmin = false;
  
  for (const d of usersSnap.docs) {
    const data = d.data();
    
    // 1. 박민주 닉네임 변경
    if ((data.displayName && data.displayName.includes('박민주')) || (data.nickname && data.nickname.includes('박민주'))) {
      console.log('-> Found Target User:', d.id, 'Current displayName:', data.displayName, 'nickname:', data.nickname);
      await setDoc(doc(db, 'nmixx_tcg_users', d.id), { displayName: 'anjffhrkwl', nickname: 'anjffhrkwl' }, { merge: true });
      await setDoc(doc(db, 'nmixx_tcg_leaderboard', d.id), { displayName: 'anjffhrkwl' }, { merge: true });
      console.log('   Updated to anjffhrkwl');
      foundTarget = true;
    }
    
    // 2. 관리자 코인 지급
    if (data.email === 'gjffpdlem@gmail.com' || (data.displayName && data.displayName === '운영자') || d.id === 'goog_rD7hVl3w6gP74rJvHw') {
      console.log('-> Found Admin User:', d.id, 'Email:', data.email, 'displayName:', data.displayName);
      const gameDataRef = doc(db, 'nmixx_tcg_users', d.id, 'gameData', 'sync');
      
      let allCards: any = {};
      for (let i = 1; i <= 150; i++) {
          const cardId = 'card_' + String(i).padStart(3, '0');
          allCards[cardId] = { id: cardId, quantity: 5, dateAcquired: Date.now(), isNew: false };
      }
      
      await setDoc(gameDataRef, {
        coins: 100000000,
        collection: allCards
      }, { merge: true });
      console.log('   Injected 100,000,000 coins and all cards to Admin');
      foundAdmin = true;
    }
  }

  if (!foundTarget) {
      console.log('Could not find anyone with "박민주" in their name.');
  }
  if (!foundAdmin) {
      console.log('Could not find Admin user. Creating one forcibly...');
      // Admin document directly
      const adminId = 'gjffpdlem@gmail.com_admin';
      await setDoc(doc(db, 'nmixx_tcg_users', adminId), { email: 'gjffpdlem@gmail.com', displayName: '운영자' }, { merge: true });
  }
}
run().then(() => {
  console.log('UPDATE_SUCCESS');
  process.exit(0);
}).catch(console.error);
