const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function registerTestUser() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'transportation_management',
  });

  const email = 'test@example.com';
  const username = 'testuser';
  const password = 'test123';
  const role = 'customer';

  // Check if user exists
  const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length > 0) {
    console.log('User already exists:', email);
    await connection.end();
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert user
  await connection.execute(
    'INSERT INTO users (username, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())',
    [username, email, hashedPassword, role]
  );

  console.log('Test user registered:', email);
  await connection.end();
}

registerTestUser().catch(err => {
  console.error('Error registering test user:', err);
});
