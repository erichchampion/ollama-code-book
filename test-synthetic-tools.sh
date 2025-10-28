#!/bin/bash

# Test script for synthetic tool calling with complex scenarios

echo "=========================================="
echo "Testing Synthetic Tool Calling"
echo "=========================================="
echo ""

# Test 1: Multiple file creation
echo "Test 1: Creating multiple files..."
timeout 60 yarn start <<EOF
Create three files: hello.txt with "Hello", world.txt with "World", and test.txt with "Test"
exit
EOF

echo ""
echo "Checking files created in Test 1..."
ls -la hello.txt world.txt test.txt 2>/dev/null || echo "Some files missing"
echo ""

# Clean up Test 1
rm -f hello.txt world.txt test.txt

# Test 2: Command execution
echo "Test 2: Running ls command..."
timeout 60 yarn start <<EOF
Run the ls command to list files in the current directory
exit
EOF

echo ""

# Test 3: Multi-turn conversation
echo "Test 3: Multi-turn conversation..."
timeout 60 yarn start <<EOF
Create a file called data.txt
Now add the content "Line 1" to it
exit
EOF

echo ""
echo "Checking file created in Test 3..."
cat data.txt 2>/dev/null || echo "data.txt not found"
echo ""

# Clean up Test 3
rm -f data.txt

# Test 4: Complex file with special characters
echo "Test 4: File with special characters..."
timeout 60 yarn start <<EOF
Create a file called special.txt with content "Hello, World! This is a test with special chars: @#$%"
exit
EOF

echo ""
echo "Checking file created in Test 4..."
cat special.txt 2>/dev/null || echo "special.txt not found"
echo ""

# Clean up Test 4
rm -f special.txt

echo ""
echo "=========================================="
echo "All tests completed!"
echo "=========================================="
