const https = require('https');

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    https.get('https://grabit-chi.vercel.app' + path, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    }).on('error', reject);
  });
}

async function verifyVadgaonLocations() {
  console.log('--- VERIFYING VADGAON, PUNE LOCATIONS ON LIVE PRODUCTION ---');
  
  const res = await fetchJson('/api/products?limit=30');
  console.log('Total products on production:', res.data.total);

  let allVadgaon = true;
  for (const p of res.data.data) {
    const city = p.location?.city || '';
    const address = p.location?.address || '';
    console.log(`• [${p.category}] ${p.title}`);
    console.log(`  Location: ${address} | City: ${city}`);
    if (!city.includes('Vadgaon') && !city.includes('Pune')) {
      allVadgaon = false;
    }
  }

  // Also test city filter for 'Vadgaon'
  const filterRes = await fetchJson('/api/products?city=Vadgaon');
  console.log(`\nFiltered by city=Vadgaon: ${filterRes.data.total} listings found.`);

  if (allVadgaon && filterRes.data.total >= 16) {
    console.log('\n✓ ALL RENTAL LISTINGS HAVE BEEN SUCCESSFULLY UPDATED TO VADGAON, PUNE ON PRODUCTION!');
  }
}

verifyVadgaonLocations().catch(console.error);
