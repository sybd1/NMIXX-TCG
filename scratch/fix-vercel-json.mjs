import fs from 'fs';

const config = {
  rewrites: [
    {
      source: "/(.*)",
      destination: "/index.html"
    }
  ]
};

fs.writeFileSync('vercel.json', JSON.stringify(config, null, 2), 'utf8');
console.log('Successfully wrote clean vercel.json');
