// Cara pakai: node scripts/hash-password.js "password-anda"
// Salin hasilnya (mulai dari $2a$...) ke ADMIN_PASSWORD_HASH di file .env
const bcrypt = require('bcryptjs');

const plain = process.argv[2];
if (!plain) {
  console.log('Cara pakai: node scripts/hash-password.js "password-anda"');
  process.exit(1);
}

bcrypt.hash(plain, 10).then(hash => {
  console.log('\nSalin baris ini ke file .env Anda:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
});
