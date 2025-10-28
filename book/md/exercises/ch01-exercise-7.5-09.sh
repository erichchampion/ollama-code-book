# Profile a complete workflow
node --prof dist/src/index.js generate "Create a REST API"

# Process profiling output
node --prof-process isolate-*.log > profile.txt