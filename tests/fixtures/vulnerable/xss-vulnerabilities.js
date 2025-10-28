/**
 * XSS vulnerability samples for security testing
 * WARNING: These patterns are intentionally insecure for testing purposes
 */

// Reflected XSS - innerHTML with user input
export function displayUserComment(comment) {
  document.getElementById('comments').innerHTML = comment; // VULNERABLE: No sanitization
}

// DOM-based XSS
export function showMessage(message) {
  document.write(message); // VULNERABLE: document.write with user input
}

// React dangerouslySetInnerHTML
export function UserProfile({ bio }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: bio }} /> // VULNERABLE: No sanitization
  );
}

// Stored XSS pattern
export function saveAndDisplayPost(postContent) {
  localStorage.setItem('post', postContent);
  const savedPost = localStorage.getItem('post');
  document.getElementById('post').innerHTML = savedPost; // VULNERABLE
}
