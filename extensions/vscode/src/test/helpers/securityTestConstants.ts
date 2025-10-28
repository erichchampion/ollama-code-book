/**
 * Security Test Constants
 * Shared constants for security vulnerability testing
 */

/**
 * CWE (Common Weakness Enumeration) IDs for security vulnerabilities
 * @see https://cwe.mitre.org/
 */
export const CWE_IDS = {
  SQL_INJECTION: 89,
  COMMAND_INJECTION: 78,
  XSS: 79,
  LDAP_INJECTION: 90,
  XPATH_INJECTION: 643,
  TEMPLATE_INJECTION: 94,
  NOSQL_INJECTION: 89, // MongoDB injection is still CWE-89
  PATH_TRAVERSAL: 22,
  SSRF: 918,
  XXE: 611,
  HARDCODED_SECRETS: 798,
  HARDCODED_CREDENTIALS: 798, // CWE-798 for hardcoded credentials
  WEAK_CRYPTO: 327,
  AUTH_BYPASS: 287,
  WEAK_PASSWORD: 521,
  SESSION_FIXATION: 384,
  DEBUG_ENABLED: 489,
  DEBUG_MODE_PRODUCTION: 489, // CWE-489 for debug mode in production (alias)
  EXPOSED_ENCRYPTION_KEYS: 321, // CWE-321 for exposed crypto keys
  SENSITIVE_DATA_IN_LOGS: 532, // CWE-532 for information exposure through logs
  UNENCRYPTED_STORAGE: 311, // CWE-311 for missing encryption of sensitive data
  CORS_MISCONFIGURATION: 942, // CWE-942 for overly permissive CORS
  DEFAULT_CREDENTIALS: 798, // CWE-798 for use of default credentials
  INSECURE_TRANSPORT: 319, // CWE-319 for cleartext transmission of sensitive data

  // Code Quality Issues (CWE)
  MAGIC_NUMBER: 1098, // CWE-1098 for hardcoded numeric literals
  LARGE_FUNCTION: 1121, // CWE-1121 for excessive function complexity
  DEEP_NESTING: 1124, // CWE-1124 for excessive code nesting
  MISSING_ERROR_HANDLING: 252, // CWE-252 for unchecked return value
  MISSING_INPUT_VALIDATION: 20, // CWE-20 for improper input validation

  // Architecture Issues (CWE)
  LARGE_CLASS: 1048, // CWE-1048 for god object/large class
  TIGHT_COUPLING: 1047, // CWE-1047 for modules with excessive dependencies
  MISSING_ABSTRACTION: 1061, // CWE-1061 for insufficient encapsulation
  CIRCULAR_DEPENDENCY: 1047, // CWE-1047 for circular dependencies (alias)
} as const;

/**
 * OWASP Top 10 2021 categories
 * @see https://owasp.org/Top10/
 */
export const OWASP_CATEGORIES = {
  A01_BROKEN_ACCESS_CONTROL: 'A01:2021 – Broken Access Control',
  A02_CRYPTOGRAPHIC_FAILURES: 'A02:2021 – Cryptographic Failures',
  A03_INJECTION: 'A03:2021 – Injection',
  A04_INSECURE_DESIGN: 'A04:2021 – Insecure Design',
  A05_SECURITY_MISCONFIGURATION: 'A05:2021 – Security Misconfiguration',
  A06_VULNERABLE_COMPONENTS: 'A06:2021 – Vulnerable and Outdated Components',
  A07_AUTH_FAILURES: 'A07:2021 – Identification and Authentication Failures',
  A08_SOFTWARE_DATA_INTEGRITY: 'A08:2021 – Software and Data Integrity Failures',
  A09_SECURITY_LOGGING: 'A09:2021 – Security Logging and Monitoring Failures',
  A10_SSRF: 'A10:2021 – Server-Side Request Forgery',

  // Aliases for easier reference
  A01_ACCESS_CONTROL: 'A01:2021',
  A02_CRYPTOGRAPHIC: 'A02:2021',
  A05_MISCONFIGURATION: 'A05:2021',
  A07_AUTHENTICATION: 'A07:2021',
  A09_LOGGING: 'A09:2021',
} as const;

/**
 * Security vulnerability categories
 */
export const VULNERABILITY_CATEGORIES = {
  INJECTION: 'injection',
  XSS: 'xss',
  AUTHENTICATION: 'authentication',
  CRYPTOGRAPHY: 'cryptography',
  SECRETS: 'secrets',
  CONFIGURATION: 'configuration',
  DEPENDENCIES: 'dependencies',
  ACCESS_CONTROL: 'access_control',
  DATA_INTEGRITY: 'data_integrity',
  LOGGING: 'logging',
  SSRF: 'ssrf',
  CODE_QUALITY: 'code_quality',
  ARCHITECTURE: 'architecture',
} as const;

/**
 * Parameterization markers used in safe SQL queries
 */
export const PARAMETERIZATION_MARKERS = [
  '?',      // MySQL, SQLite positional
  '$1',     // PostgreSQL numbered
  '$2',
  '$3',
  ':param', // Named parameters
  ':id',
  ':name',
  '@param', // SQL Server
  '@id',
  '@name',
] as const;

/**
 * Keywords indicating input sanitization/escaping
 */
export const ESCAPE_KEYWORDS = [
  'escape',
  'sanitize',
  'validate',
  'clean',
  'filter',
  'strip',
  'encode',
  'htmlspecialchars',
  'htmlentities',
  'escapeHtml',
  'escapeSql',
] as const;

/**
 * User input sources to watch for in security analysis
 */
export const USER_INPUT_SOURCES = [
  'req.query',
  'req.params',
  'req.body',
  'req.headers',
  'process.env',
  '$_GET',
  '$_POST',
  '$_REQUEST',
  'params.',
  'query.',
  'body.',
] as const;

/**
 * Severity levels for security vulnerabilities
 */
export const SEVERITY_LEVELS = {
  CRITICAL: 'critical' as const,
  HIGH: 'high' as const,
  MEDIUM: 'medium' as const,
  LOW: 'low' as const,
  INFO: 'info' as const,
};

/**
 * Confidence levels for vulnerability detection
 */
export const CONFIDENCE_LEVELS = {
  HIGH: 'high' as const,
  MEDIUM: 'medium' as const,
  LOW: 'low' as const,
};

/**
 * Security rule IDs from production SecurityAnalyzer
 */
export const SECURITY_RULE_IDS = {
  AUTH_BYPASS: 'auth_bypass',
  WEAK_CRYPTO: 'weak_crypto',
  SQL_INJECTION: 'sql_injection',
  COMMAND_INJECTION: 'command_injection',
  HARDCODED_SECRETS: 'hardcoded_secrets',
  DEBUG_ENABLED: 'debug_enabled',
  OUTDATED_DEPENDENCY: 'outdated_dependency',
  WEAK_PASSWORD_POLICY: 'weak_password_policy',
  XSS: 'xss_vulnerability',
  PATH_TRAVERSAL: 'path_traversal',
  CORS_MISCONFIGURATION: 'cors_misconfiguration',
  INSECURE_DESERIALIZATION: 'insecure_deserialization',
  SSRF: 'ssrf_vulnerability',
  XXE: 'xxe_vulnerability',
  CSRF: 'csrf_vulnerability',
} as const;

/**
 * File patterns for security scanning
 * Used to ensure consistent file pattern matching across all security rules
 */
export const FILE_PATTERNS = {
  /** Web languages: JavaScript, TypeScript, React */
  WEB_LANGUAGES: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'] as const,

  /** Backend languages: JS, TS, Python, Java, PHP */
  BACKEND_LANGUAGES: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.php'] as const,

  /** Shell scripts */
  SHELL_SCRIPTS: ['**/*.sh', '**/*.bash'] as const,

  /** All code files */
  ALL_CODE: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx', '**/*.py', '**/*.java', '**/*.php', '**/*.sh'] as const,

  /** React-specific files */
  REACT_FILES: ['**/*.jsx', '**/*.tsx'] as const,

  /** TypeScript files */
  TYPESCRIPT_FILES: ['**/*.ts', '**/*.tsx'] as const,
} as const;

/**
 * Vulnerability code templates
 * Reusable code snippets for testing vulnerability detection
 */
export const VULNERABILITY_CODE_TEMPLATES = {
  SQL_INJECTION: {
    STRING_CONCAT: (source: string) => `
const query = "SELECT * FROM users WHERE id = " + ${source};
db.execute(query);
`,
    TEMPLATE_LITERAL: (source: string) => `
const query = \`SELECT * FROM users WHERE username = '\${${source}}'\`;
db.query(query);
`,
    SAFE_PARAMETERIZED: (source: string) => `
const query = 'SELECT * FROM users WHERE id = $1';
db.query(query, [${source}]);
`,
  },

  NOSQL_INJECTION: {
    DIRECT_INPUT: (source: string) => `
const user = await User.find(${source});
`,
    WHERE_OPERATOR: (source: string) => `
const users = await User.find({ $where: ${source} });
`,
    SAFE_SANITIZED: (source: string) => `
const sanitizedQuery = validator.escape(${source});
const user = await User.findOne({ username: sanitizedQuery });
`,
  },

  COMMAND_INJECTION: {
    EXEC: (source: string) => `
const { exec } = require('child_process');
exec('ls ' + ${source});
`,
    SPAWN_SHELL: (source: string) => `
spawn(${source}, [], { shell: true });
`,
    EVAL: (source: string) => `
eval(${source});
`,
    SAFE_EXECFILE: (source: string) => `
const { execFile } = require('child_process');
const allowedCommands = ['ls', 'pwd'];
const cmd = allowedCommands.includes(${source}) ? ${source} : 'ls';
execFile(cmd, ['-la']);
`,
  },

  LDAP_INJECTION: {
    FILTER_CONCAT: (source: string) => `
const filter = 'uid=' + ${source};
ldapClient.search(baseDN, { filter }, callback);
`,
    SAFE_ESCAPED: (source: string) => `
const escapedUsername = ldap.escapeFilter(${source});
const filter = 'uid=' + escapedUsername;
ldapClient.search(baseDN, { filter }, callback);
`,
  },

  XPATH_INJECTION: {
    CONCAT: (source: string) => `
const xpath = '/users/user[username="' + ${source} + '"]';
const result = doc.select(xpath);
`,
    SAFE_ESCAPED: (source: string) => `
const escapedUser = xpath.escape(${source});
const xpath = '/users/user[username="' + escapedUser + '"]';
const result = doc.select(xpath);
`,
  },

  TEMPLATE_INJECTION: {
    COMPILE: (source: string) => `
const template = ${source};
const compiled = Handlebars.compile(template);
`,
    UNESCAPED: (source: string) => `
const html = '{{{ ${source} }}}';
`,
    SAFE_SANITIZED: (source: string) => `
const sanitizedInput = sanitize(${source});
const html = '{{ safeInput }}'; // Auto-escaped by Handlebars
`,
  },

  XSS: {
    INNER_HTML: (source: string) => `
const userInput = ${source};
document.getElementById('output').innerHTML = userInput;
`,
    OUTER_HTML: (source: string) => `
const userInput = ${source};
element.outerHTML = userInput;
`,
    DOCUMENT_WRITE: (source: string) => `
const content = ${source};
document.write(content);
`,
    DOM_LOCATION: (source: string) => `
const hash = ${source};
document.getElementById('output').innerHTML = hash;
`,
    REACT_DANGEROUS: (source: string) => `
function UserContent({ userInput }) {
  return (
    <div dangerouslySetInnerHTML={{ __html: ${source} }} />
  );
}
`,
    SAFE_TEXT_CONTENT: (source: string) => `
const message = ${source};
document.getElementById('output').textContent = message; // Safe - textContent escapes HTML
`,
    SAFE_SANITIZED: (source: string) => `
import DOMPurify from 'dompurify';
const message = ${source};
const sanitized = DOMPurify.sanitize(message);
document.getElementById('output').innerHTML = sanitized;
`,
    SAFE_REACT: (source: string) => `
function UserContent({ userInput }) {
  return (
    <div>{${source}}</div> // Safe - React escapes by default
  );
}
`,
  },

  AUTHENTICATION: {
    HARDCODED_PASSWORD: (password: string = 'SuperSecret123!') => `
const DB_PASSWORD = "${password}";
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'admin',
  password: DB_PASSWORD
});
`,
    HARDCODED_API_KEY: (apiKey: string = 'sk_live_1234567890abcdefghijklmnop') => `
const apiKey = "${apiKey}";
fetch('https://api.example.com/data', {
  headers: { 'Authorization': \`Bearer \${apiKey}\` }
});
`,
    HARDCODED_NUMERIC: (password: string = '12345678') => `
const apiKey = "${password}";
const secret = "00000000";
`,
    WEAK_PASSWORD_LENGTH: (minLength: number = 6) => `
function validatePassword(password) {
  if (password.length < ${minLength}) {
    return false;
  }
  return true;
}
`,
    WEAK_MIN_LENGTH_CONFIG: (minLength: number = 4) => `
const passwordSchema = {
  minLength: ${minLength},
  requireUppercase: false,
  requireNumbers: false
};
`,
    UNPROTECTED_ADMIN_ROUTE: () => `
app.get('/admin/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});
`,
    UNPROTECTED_API_ENDPOINT: () => `
router.post('/api/sensitive-data', async (req, res) => {
  const data = await SensitiveModel.create(req.body);
  res.json(data);
});
`,
    SESSION_FIXATION: () => `
app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (user && user.validPassword(req.body.password)) {
    req.session.userId = user.id;
    req.session.user = user;
    res.redirect('/dashboard');
  }
});
`,
    SESSION_FIXATION_COMMENT: () => `
app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (user && user.validPassword(req.body.password)) {
    req.session.userId = user.id;
    // TODO: Add session.regenerate() for security
    res.redirect('/dashboard');
  }
});
`,
    SAFE_ENV_VARS: () => `
const password = process.env.DB_PASSWORD;
const apiKey = process.env.API_KEY;
const connection = mysql.createConnection({
  host: 'localhost',
  password: password
});
`,
    SAFE_STRONG_PASSWORD: () => `
function validatePassword(password) {
  if (password.length < 8) {
    return false;
  }
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/.test(password);
}
`,
    SAFE_PROTECTED_ROUTE: () => `
app.get('/admin/users', isAuthenticated, async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post('/api/data', requireAuth, async (req, res) => {
  const data = await Model.create(req.body);
  res.json(data);
});
`,
    SAFE_SESSION_REGENERATE: () => `
app.post('/login', async (req, res) => {
  const user = await User.findOne({ username: req.body.username });
  if (user && user.validPassword(req.body.password)) {
    req.session.regenerate((err) => {
      if (err) return res.status(500).send('Session error');
      req.session.userId = user.id;
      req.session.user = user;
      res.redirect('/dashboard');
    });
  }
});
`,
  },

  SECRETS: {
    HARDCODED_API_KEY_AWS: (key: string = 'AKIAIOSFODNN7EXAMPLE1234') => `
const awsAccessKey = "${key}";
const s3 = new AWS.S3({ accessKeyId: awsAccessKey });
`,
    HARDCODED_API_KEY_STRIPE: (key: string = 'sk_live_51234567890abcdefghijklmnopqr') => `
const stripeKey = "${key}";
const stripe = require('stripe')(stripeKey);
`,
    HARDCODED_API_KEY_GITHUB: (token: string = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz') => `
const githubToken = "${token}";
fetch('https://api.github.com/user', {
  headers: { 'Authorization': \`token \${githubToken}\` }
});
`,
    EXPOSED_ENCRYPTION_KEY_AES: (key: string = 'aAbBcCdDeEfFgGhH1234567890') => `
const encryptionKey = "${key}";
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
`,
    EXPOSED_ENCRYPTION_KEY_JWT: (secret: string = 'my-super-secret-jwt-key-123456') => `
const jwtSecret = "${secret}";
const token = jwt.sign({ userId: 123 }, jwtSecret);
`,
    SENSITIVE_DATA_IN_LOGS_PASSWORD: () => `
app.post('/login', (req, res) => {
  console.log('User login attempt:', req.body.password);
  // Authentication logic
});
`,
    SENSITIVE_DATA_IN_LOGS_TOKEN: () => `
function handleAuth(token) {
  logger.info('Processing auth token:', token);
  // Token validation
}
`,
    SENSITIVE_DATA_IN_LOGS_CREDIT_CARD: () => `
function processPayment(cardNumber) {
  console.log('Processing payment for card:', cardNumber);
  // Payment logic
}
`,
    UNENCRYPTED_STORAGE_TOKEN: () => `
function storeUserSession(authToken) {
  localStorage.setItem('auth_token', authToken);
}
`,
    UNENCRYPTED_STORAGE_PASSWORD: () => `
function rememberUser(password) {
  sessionStorage.setItem('user_password', password);
}
`,
    SAFE_ENV_VARS_API_KEY: () => `
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = require('stripe')(stripeKey);
`,
    SAFE_ENCRYPTED_STORAGE: () => `
import { encryptData } from './crypto';
function storeUserSession(authToken) {
  const encrypted = encryptData(authToken);
  localStorage.setItem('auth_token', encrypted);
}
`,
    SAFE_SANITIZED_LOGS: () => `
function handleAuth(token) {
  logger.info('Processing auth token:', '***REDACTED***');
  // Token validation
}
`,
    // Edge case: 20-character boundary test
    EDGE_CASE_20_CHAR_BOUNDARY: () => `
const apiKey = "ABCD1234EFGH5678IJKL"; // Exactly 20 characters
const service = initService(apiKey);
`,
    // Edge case: Template literal with secret
    EDGE_CASE_TEMPLATE_LITERAL: () => `
const timestamp = Date.now();
const token = \`sk_live_\${timestamp}_secretkey123456789\`;
fetch('/api', { headers: { 'Authorization': token } });
`,
    // Edge case: Base64-encoded secret
    EDGE_CASE_BASE64_SECRET: () => `
const encryptionKey = "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY=";
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'base64'), iv);
`,
  },

  MISCONFIGURATION: {
    // Debug mode in production
    DEBUG_MODE_ENABLED: () => `
const config = {
  debug: true,
  env: 'production',
  logging: { level: 'debug' }
};
app.listen(3000);
`,
    DEBUG_MODE_NODE_ENV: () => `
if (process.env.NODE_ENV === 'production') {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}
`,
    // CORS misconfiguration
    CORS_WILDCARD: () => `
app.use(cors({
  origin: '*',
  credentials: true
}));
`,
    CORS_NULL_ORIGIN: () => `
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
`,
    // Default credentials
    DEFAULT_ADMIN_PASSWORD: () => `
const users = [
  { username: 'admin', password: 'admin' },
  { username: 'root', password: 'password' }
];
`,
    DEFAULT_DATABASE_CREDS: () => `
const dbConfig = {
  host: 'localhost',
  user: 'admin',
  password: 'admin123',
  database: 'production'
};
`,
    // Insecure HTTP
    HTTP_URL: () => `
const API_ENDPOINT = 'http://api.example.com/user/data';
fetch(API_ENDPOINT, {
  method: 'POST',
  body: JSON.stringify({ password: userPassword })
});
`,
    HTTP_COOKIE: () => `
res.cookie('session', sessionId, {
  secure: false,
  httpOnly: true
});
`,
    // Safe configurations
    SAFE_DEBUG_DISABLED: () => `
const config = {
  debug: process.env.NODE_ENV !== 'production',
  env: process.env.NODE_ENV || 'development',
  logging: { level: process.env.LOG_LEVEL || 'info' }
};
`,
    SAFE_CORS_WHITELIST: () => `
const whitelist = ['https://example.com', 'https://app.example.com'];
app.use(cors({
  origin: (origin, callback) => {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
`,
    SAFE_ENV_CREDENTIALS: () => `
const users = [
  { username: 'admin', password: process.env.ADMIN_PASSWORD },
  { username: 'root', password: process.env.ROOT_PASSWORD }
];
`,
    SAFE_HTTPS_URL: () => `
const API_ENDPOINT = 'https://api.example.com/user/data';
fetch(API_ENDPOINT, {
  method: 'POST',
  body: JSON.stringify({ password: userPassword })
});
`,
    SAFE_SECURE_COOKIE: () => `
res.cookie('session', sessionId, {
  secure: true,
  httpOnly: true,
  sameSite: 'strict'
});
`,
  },

  // Code Quality Issues Templates
  CODE_QUALITY: {
    MAGIC_NUMBER_TIMEOUT: () => `
function scheduleTask(callback) {
  setTimeout(callback, 86400000); // Magic number: 86400000 milliseconds
}
`,
    MAGIC_NUMBER_CALCULATION: () => `
function calculatePrice(quantity) {
  const tax = quantity * 0.08; // Magic number: 8% tax rate
  const shipping = quantity > 10 ? 15.99 : 5.99; // Magic numbers: thresholds and costs
  return quantity * 29.99 + tax + shipping; // Magic number: base price
}
`,
    LARGE_FUNCTION_50_LINES: () => `
function processUserData(userData) {
  const name = userData.name;
  const email = userData.email;
  const age = userData.age;
  const address = userData.address;
  // Line 5
  if (!name) { throw new Error('Name required'); }
  if (!email) { throw new Error('Email required'); }
  if (age < 18) { throw new Error('Must be 18+'); }
  // Line 9
  const normalizedName = name.trim().toLowerCase();
  const emailParts = email.split('@');
  const domain = emailParts[1];
  // Line 13
  if (!domain.includes('.')) { throw new Error('Invalid email'); }
  // Line 15
  const user = {
    name: normalizedName,
    email: email,
    age: age,
    address: address
  };
  // Line 22
  const validation = validateUser(user);
  if (!validation.valid) { throw new Error(validation.error); }
  // Line 25
  const savedUser = saveToDatabase(user);
  sendWelcomeEmail(savedUser.email);
  logUserCreation(savedUser.id);
  // Line 29
  updateAnalytics('user_created');
  notifyAdmins(savedUser);
  // Line 32
  const permissions = createDefaultPermissions(savedUser.id);
  assignRoles(savedUser.id, ['user']);
  // Line 35
  const session = createSession(savedUser.id);
  const token = generateToken(savedUser.id);
  // Line 38
  cacheUser(savedUser);
  indexUserForSearch(savedUser);
  // Line 41
  const welcome = generateWelcomeMessage(savedUser.name);
  const dashboard = buildUserDashboard(savedUser);
  // Line 44
  trackConversion('signup');
  updateMetrics('total_users');
  // Line 47
  sendToQueue('user_created', savedUser);
  triggerWebhooks('user.created', savedUser);
  // Line 50
  return { user: savedUser, session, token, dashboard };
}
`,
    DEEP_NESTING_5_LEVELS: () => `
function validateAndProcess(data) {
  if (data) {
    if (data.user) {
      if (data.user.permissions) {
        if (data.user.permissions.admin) {
          if (data.user.permissions.admin.canDelete) {
            return performDeletion(data);
          }
        }
      }
    }
  }
  return null;
}
`,
    MISSING_ERROR_HANDLING_ASYNC: () => `
async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json(); // No error handling
  return data;
}
`,
    MISSING_ERROR_HANDLING_PROMISE: () => `
function loadConfig(path) {
  return fs.readFile(path, 'utf8')
    .then(content => JSON.parse(content)); // No .catch()
}
`,
    MISSING_INPUT_VALIDATION_API: () => `
app.post('/api/users', (req, res) => {
  const user = createUser(req.body); // No validation of req.body
  res.json(user);
});
`,
    MISSING_INPUT_VALIDATION_FUNCTION: () => `
function divide(a, b) {
  return a / b; // No check for b === 0
}
`,

    // Safe code quality patterns
    SAFE_NAMED_CONSTANT: () => `
const MILLISECONDS_PER_DAY = 86400000;
function scheduleTask(callback) {
  setTimeout(callback, MILLISECONDS_PER_DAY);
}
`,
    SAFE_SMALL_FUNCTION: () => `
function calculateTax(quantity) {
  const TAX_RATE = 0.08;
  return quantity * TAX_RATE;
}

function calculateShipping(quantity) {
  const BULK_THRESHOLD = 10;
  const STANDARD_SHIPPING = 5.99;
  const BULK_SHIPPING = 15.99;
  return quantity > BULK_THRESHOLD ? BULK_SHIPPING : STANDARD_SHIPPING;
}
`,
    SAFE_FLAT_LOGIC: () => `
function validateAndProcess(data) {
  if (!data) return null;
  if (!data.user) return null;
  if (!data.user.permissions) return null;
  if (!data.user.permissions.admin) return null;
  if (!data.user.permissions.admin.canDelete) return null;

  return performDeletion(data);
}
`,
    SAFE_ERROR_HANDLING_ASYNC: () => `
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    if (!response.ok) {
      throw new Error(\`HTTP error \${response.status}\`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
`,
    SAFE_INPUT_VALIDATION: () => `
app.post('/api/users', (req, res) => {
  const { name, email, age } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Valid name required' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (age === undefined || age < 18) {
    return res.status(400).json({ error: 'Must be 18 or older' });
  }

  const user = createUser({ name, email, age });
  res.json(user);
});
`,
  },

  // Architecture Issues Templates
  ARCHITECTURE: {
    LARGE_CLASS_15_METHODS: () => `
class UserManager {
  constructor() {}
  createUser() {}
  updateUser() {}
  deleteUser() {}
  getUser() {}
  listUsers() {}
  validateUser() {}
  authenticateUser() {}
  authorizeUser() {}
  sendEmail() {}
  logActivity() {}
  generateReport() {}
  exportData() {}
  importData() {}
  calculateMetrics() {}
}
`,
    LARGE_CLASS_15_METHODS_TYPESCRIPT: () => `
class UserManager {
  constructor() {}
  createUser(): User {}
  updateUser(id: string): Promise<void> {}
  deleteUser(id: string): boolean {}
  getUser(id: string): User {}
  listUsers(): User[] {}
  validateUser(user: User): boolean {}
  authenticateUser(credentials: Credentials): Promise<AuthResult> {}
  authorizeUser(user: User, resource: string): boolean {}
  sendEmail(to: string, subject: string): void {}
  logActivity(activity: Activity): void {}
  generateReport(type: ReportType): Report {}
  exportData(format: string): string {}
  importData(data: string): void {}
  calculateMetrics(): Metrics {}
}
`,
    TIGHT_COUPLING_MANY_IMPORTS: () => `
import { DatabaseService } from './database';
import { EmailService } from './email';
import { LoggingService } from './logging';
import { CacheService } from './cache';
import { AuthService } from './auth';
import { PaymentService } from './payment';
import { NotificationService } from './notification';
import { AnalyticsService } from './analytics';
import { StorageService } from './storage';
import { ValidationService } from './validation';

class OrderProcessor {
  process(order) {
    DatabaseService.save(order);
    EmailService.send(order.email);
    LoggingService.log(order);
    CacheService.set(order.id, order);
    PaymentService.charge(order);
  }
}
`,
    MISSING_ABSTRACTION_DIRECT_ACCESS: () => `
class UserController {
  getUser(req, res) {
    const connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'password',
      database: 'myapp'
    });
    connection.query('SELECT * FROM users WHERE id = ?', [req.params.id], (err, results) => {
      res.json(results[0]);
    });
  }
}
`,
    CIRCULAR_DEPENDENCY_A_TO_B: () => `
// fileA.js
import { ClassB } from './fileB';
export class ClassA {
  constructor() {
    this.b = new ClassB();
  }
}
`,
    CIRCULAR_DEPENDENCY_B_TO_A: () => `
// fileB.js
import { ClassA } from './fileA';
export class ClassB {
  constructor() {
    this.a = new ClassA();
  }
}
`,

    // Safe architecture patterns
    SAFE_SMALL_CLASS: () => `
class UserValidator {
  constructor() {}
  validateEmail(email) {
    return email.includes('@');
  }
  validateAge(age) {
    return age >= 18;
  }
  validate(user) {
    return this.validateEmail(user.email) && this.validateAge(user.age);
  }
}
`,
    SAFE_LOOSE_COUPLING_INTERFACES: () => `
class OrderProcessor {
  constructor(database, emailer, logger) {
    this.database = database;
    this.emailer = emailer;
    this.logger = logger;
  }

  process(order) {
    this.database.save(order);
    this.emailer.send(order.email);
    this.logger.log(order);
  }
}
`,
    SAFE_PROPER_ABSTRACTION: () => `
class UserRepository {
  constructor(database) {
    this.db = database;
  }
  findById(id) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}

class UserController {
  constructor(userRepository) {
    this.users = userRepository;
  }
  async getUser(req, res) {
    const user = await this.users.findById(req.params.id);
    res.json(user);
  }
}
`,
    SAFE_NO_CIRCULAR_DEPS: () => `
// services/database.js
export class DatabaseService {
  query(sql, params) {
    // database logic
  }
}

// controllers/user.js
import { DatabaseService } from '../services/database';
export class UserController {
  constructor() {
    this.db = new DatabaseService();
  }
}
`,
  },

  // Review Report Templates
  REVIEW_REPORT: {
    // Code with multiple critical issues for comprehensive report testing
    MULTIPLE_CRITICAL_ISSUES: () => `
const apiKey = "sk_live_1234567890abcdefghijklmnopqr";
const dbConfig = {
  username: 'admin',
  password: 'admin'
};

app.post('/user', (req, res) => {
  const sql = "SELECT * FROM users WHERE id = " + req.body.id;
  connection.query(sql);
  document.getElementById('output').innerHTML = req.body.data;
});
`,

    // Code with mixed severity issues
    MIXED_SEVERITY_ISSUES: () => `
const timeout = 5000;
function processData(data) {
  if (data.user) {
    if (data.user.profile) {
      if (data.user.profile.settings) {
        if (data.user.profile.settings.theme) {
          return data.user.profile.settings.theme;
        }
      }
    }
  }
}
`,

    // Code with only low/info issues
    MINOR_ISSUES_ONLY: () => `
function calculate(a, b) {
  return a / b;
}

const result = setTimeout(() => {
  console.log('done');
}, 3000);
`,

    // Perfect code with no issues
    NO_ISSUES_PERFECT_CODE: () => `
import { validateInput } from './validator';
import { DatabaseService } from './database';

class UserService {
  constructor(private db: DatabaseService) {}

  async createUser(data: UserData): Promise<User> {
    try {
      const validated = validateInput(data);
      return await this.db.users.create(validated);
    } catch (error) {
      console.error('Error creating user');
      throw error;
    }
  }
}
`,

    // Code demonstrating good practices
    GOOD_PRACTICES_CODE: () => `
const API_KEY = process.env.API_KEY;
const TIMEOUT_MS = 5000;

app.post('/data', authenticate, async (req, res) => {
  try {
    const validated = validator.validate(req.body);
    const result = await db.query('SELECT * FROM data WHERE id = ?', [validated.id]);
    res.json(sanitize(result));
  } catch (error) {
    logger.error('Error processing request');
    res.status(500).json({ error: 'Internal server error' });
  }
});
`,

    // Code with specific categories for testing classification
    CATEGORY_TESTING_CODE: () => `
// XSS vulnerability
element.innerHTML = req.query.userInput;

// SQL Injection
const query = "SELECT * FROM users WHERE name = '" + username + "'";

// Secrets
const stripeKey = "sk_test_123456789";

// Configuration issue
const config = { debug: true, env: 'production' };
`,
  },
} as const;

/**
 * Review report generation constants
 */
export const CONFIDENCE_SCORE_VALUES = {
  HIGH: 90,
  MEDIUM: 70,
  LOW: 50,
} as const;

export const DEFAULT_CONFIDENCE_SCORE = 75;
export const PERFECT_CONFIDENCE_SCORE = 100;

export const SEVERITY_WEIGHTS = {
  CRITICAL: 3,
  HIGH: 2,
  MEDIUM: 1.5,
  LOW: 1,
  INFO: 0.5,
} as const;

export const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
} as const;

export const PRIORITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
} as const;

export const VALID_PRIORITIES = ['critical', 'high', 'medium'] as const;
export type ValidPriority = typeof VALID_PRIORITIES[number];

export const MAX_RECOMMENDATION_EXAMPLES = 3;

export const POSITIVE_FINDING_MESSAGES = {
  injection: 'No SQL injection vulnerabilities detected - database queries appear to use parameterization.',
  xss: 'No XSS vulnerabilities detected - user input handling follows secure practices.',
  authentication: 'No authentication bypass vulnerabilities detected - access control is properly implemented.',
  secrets: 'No hardcoded secrets detected - sensitive data appears to be externalized.',
  configuration: 'No security misconfigurations detected - security settings are properly configured.',
  code_quality: 'Code quality issues are minimal - code follows best practices.',
  architecture: 'No major architecture issues detected - design follows solid principles.',
} as const;

export const SUMMARY_NO_ISSUES = 'No security vulnerabilities detected. Code follows security best practices.';
export const FALLBACK_POSITIVE_FINDING = 'Some security best practices are being followed despite identified issues.';

/**
 * Quality assessment test templates
 */
export const QUALITY_ASSESSMENT_TEMPLATES = {
  // High complexity code
  HIGH_COMPLEXITY: () => `
function processOrder(order, user, items, discounts, shipping) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].quantity > 0) {
      if (items[i].price > 100) {
        if (user.isPremium) {
          if (discounts && discounts[items[i].id]) {
            total += items[i].price * items[i].quantity * (1 - discounts[items[i].id]);
          } else {
            total += items[i].price * items[i].quantity * 0.9;
          }
        } else {
          if (items[i].quantity > 5) {
            total += items[i].price * items[i].quantity * 0.95;
          } else {
            total += items[i].price * items[i].quantity;
          }
        }
      } else {
        total += items[i].price * items[i].quantity;
      }
    }
  }
  if (shipping === 'express' && total > 50) {
    total += 15;
  } else if (shipping === 'standard') {
    total += 5;
  }
  return total;
}`,

  // Low complexity code
  LOW_COMPLEXITY: () => `
const PREMIUM_DISCOUNT = 0.9;
const BULK_DISCOUNT = 0.95;
const EXPRESS_SHIPPING = 15;
const STANDARD_SHIPPING = 5;
const FREE_SHIPPING_THRESHOLD = 50;

function calculateItemTotal(item, isPremium, discount) {
  const basePrice = item.price * item.quantity;
  const discountRate = discount || (isPremium ? PREMIUM_DISCOUNT : 1.0);
  return basePrice * discountRate;
}

function calculateShipping(total, shippingType) {
  if (shippingType === 'express' && total > FREE_SHIPPING_THRESHOLD) {
    return EXPRESS_SHIPPING;
  }
  return shippingType === 'standard' ? STANDARD_SHIPPING : 0;
}`,

  // Poor maintainability
  POOR_MAINTAINABILITY: () => `
function x(a,b,c){var d=0;for(var i=0;i<a.length;i++){if(a[i].x>100){if(b.y){if(c&&c[a[i].z]){d+=a[i].x*a[i].y*(1-c[a[i].z])}else{d+=a[i].x*a[i].y*0.9}}else{if(a[i].y>5){d+=a[i].x*a[i].y*0.95}else{d+=a[i].x*a[i].y}}}else{d+=a[i].x*a[i].y}}return d}
const API_URL="http://api.example.com";const KEY="abc123";function getData(){fetch(API_URL+"?key="+KEY).then(r=>r.json())}`,

  // Good maintainability
  GOOD_MAINTAINABILITY: () => `
/**
 * Calculate the total price for an order
 * @param items - Array of order items
 * @param user - User making the order
 * @param discounts - Available discounts
 * @returns Total price in dollars
 */
function calculateOrderTotal(items, user, discounts) {
  const itemsTotal = items.reduce((sum, item) => {
    return sum + calculateItemTotal(item, user, discounts);
  }, 0);

  return itemsTotal;
}

/**
 * Calculate the price for a single item
 */
function calculateItemTotal(item, user, discounts) {
  const basePrice = item.price * item.quantity;
  const discount = getApplicableDiscount(item, user, discounts);
  return basePrice * (1 - discount);
}`,

  // Poor naming conventions
  POOR_NAMING: () => `
function calc(x, y) {
  const temp = x + y;
  return temp;
}

const user_name = "john";
const UserAge = 30;
let $data = getData();
const my-value = 123;`,

  // Good naming conventions
  GOOD_NAMING: () => `
function calculateTotal(subtotal, tax) {
  const total = subtotal + tax;
  return total;
}

const userName = "john";
const userAge = 30;
const userData = getData();
const MAX_RETRIES = 3;`,

  // Missing error handling
  MISSING_ERROR_HANDLING: () => `
async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = await response.json();
  return data;
}

async function processPayment(orderId) {
  const order = await getOrder(orderId);
  const result = await chargeCard(order.total);
  return result;
}`,

  // Good error handling
  GOOD_ERROR_HANDLING: () => `
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw new Error('Unable to retrieve user information');
  }
}

async function processPayment(orderId) {
  try {
    const order = await getOrder(orderId);
    const result = await chargeCard(order.total);
    return result;
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
}`,

  // Missing input validation
  MISSING_VALIDATION: () => `
app.post('/users', (req, res) => {
  const user = {
    name: req.body.name,
    email: req.body.email,
    age: req.body.age
  };
  db.users.insert(user);
  res.json(user);
});

function divide(a, b) {
  return a / b;
}`,

  // Good input validation
  GOOD_VALIDATION: () => `
const { check, validationResult } = require('express-validator');

app.post('/users', [
  check('name').isLength({ min: 1 }),
  check('email').isEmail(),
  check('age').isInt({ min: 0 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const user = {
    name: req.body.name,
    email: req.body.email,
    age: req.body.age
  };
  db.users.insert(user);
  res.json(user);
});

function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}`,

  // TypeScript with poor type safety
  POOR_TYPE_SAFETY: () => `
function processData(data: any) {
  const result: any = transform(data);
  return result;
}

function calculate(a, b) {
  return a + b;
}

const values: any[] = [1, 2, 3];`,

  // TypeScript with good type safety
  GOOD_TYPE_SAFETY: () => `
interface UserData {
  id: number;
  name: string;
  email: string;
}

function processData(data: UserData): UserData {
  const result: UserData = transform(data);
  return result;
}

function calculate(a: number, b: number): number {
  return a + b;
}

const values: number[] = [1, 2, 3];`,

  // Missing documentation
  MISSING_DOCUMENTATION: () => `
function processOrder(order, user, items) {
  const total = calculateTotal(items);
  const tax = total * 0.08;
  return total + tax;
}

class OrderProcessor {
  process(order) {
    return this.validate(order);
  }

  validate(order) {
    return order.items.length > 0;
  }
}`,

  // Good documentation
  GOOD_DOCUMENTATION: () => `
/**
 * Order processing utilities
 * @module OrderProcessor
 */

/**
 * Process an order and calculate the final total including tax
 * @param order - The order to process
 * @param user - The user placing the order
 * @param items - Array of items in the order
 * @returns The total price including tax
 */
function processOrder(order, user, items) {
  const total = calculateTotal(items);
  const tax = total * 0.08;
  return total + tax;
}

/**
 * Handles order processing and validation
 */
class OrderProcessor {
  /**
   * Process an order
   * @param order - The order to process
   */
  process(order) {
    return this.validate(order);
  }

  /**
   * Validate that an order has items
   * @param order - The order to validate
   */
  validate(order) {
    return order.items.length > 0;
  }
}`,
} as const;

/**
 * Expected vulnerability counts for test suites
 */
export const EXPECTED_VULNERABILITY_COUNTS = {
  SQL_INJECTION: 2,      // String concat + template literal
  NOSQL_INJECTION: 2,    // Direct input + $where
  COMMAND_INJECTION: 3,  // exec + spawn + eval
  LDAP_INJECTION: 1,     // Filter construction
  XPATH_INJECTION: 1,    // XPath expression
  TEMPLATE_INJECTION: 2, // Template compile + unescaped
} as const;
