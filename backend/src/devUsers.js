const bcrypt = require('bcryptjs');

// In-memory dev users. Passwords are hashed for parity with real DB.
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@local',
    passwordHash: bcrypt.hashSync('admin', 10),
    role: 'admin',
    full_name: 'Admin Test',
    active: true,
  },
];

function findByUsernameOrEmail(identifier) {
  const id = String(identifier || '').toLowerCase();
  return users.find(u => u.username === id || u.email === id);
}

module.exports = { users, findByUsernameOrEmail };
