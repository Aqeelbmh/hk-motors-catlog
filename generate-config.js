const fs = require('fs');
const path = require('path');

let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let key = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

function loadEnvFile(fileName) {
  const envPath = path.join(__dirname, fileName);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const k = parts[0].trim();
        const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (k === 'SUPABASE_URL' || k === 'NEXT_PUBLIC_SUPABASE_URL') {
          if (!url) url = v;
        }
        if (k === 'SUPABASE_KEY' || k === 'SUPABASE_ANON_KEY' || k === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' || k === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
          if (!key) key = v;
        }
      }
    });
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const content = `window.SUPABASE_URL = '${url}';\nwindow.SUPABASE_KEY = '${key}';\n`;

fs.writeFileSync('supabase-config.js', content);
console.log('✅ Generated supabase-config.js with URL:', url || '(empty)');
