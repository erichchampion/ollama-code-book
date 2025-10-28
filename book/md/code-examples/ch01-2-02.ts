// User: "Explain what this regex does"
const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// AI explains:
// This regex validates strong passwords requiring:
// - At least 8 characters
// - At least one lowercase letter (?=.*[a-z])
// - At least one uppercase letter (?=.*[A-Z])
// - At least one digit (?=.*\d)
// - At least one special character (?=.*[@$!%*?&])