# OWASP ZAP
zap-cli quick-scan http://localhost:3000

# Burp Suite
# Manual testing

# SQLMap (if using database)
sqlmap -u "http://localhost:3000/api/user?id=1"

# Nikto
nikto -h http://localhost:3000