import { MASTER_CARDS } from '../src/data/cards.ts';

const xr = MASTER_CARDS.find(c => c.rarity === 'XR');
console.log('Updated XR Card Info:');
console.log(`- ID: ${xr?.id}`);
console.log(`- Name: ${xr?.name}`);
console.log(`- PackId: ${xr?.packId}`);
console.log(`- PackCode: ${xr?.packCode}`);
console.log(`- PackName: ${xr?.packName}`);
