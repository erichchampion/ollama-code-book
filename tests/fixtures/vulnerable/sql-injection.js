/**
 * Vulnerable code samples for security testing
 * WARNING: These patterns are intentionally insecure for testing purposes
 */

// SQL Injection vulnerability
export function getUserById(userId) {
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  return db.execute(query); // VULNERABLE: Direct string interpolation
}

// SQL Injection with concatenation
export function searchUsers(searchTerm) {
  const query = "SELECT * FROM users WHERE name LIKE '%" + searchTerm + "%'";
  return db.query(query); // VULNERABLE: String concatenation
}

// NoSQL Injection
export function findUser(username) {
  return db.collection('users').find({ username: username }); // VULNERABLE if username is object
}
