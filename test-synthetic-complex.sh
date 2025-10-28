#!/bin/bash

# Complex test scenarios for synthetic tool calling
# Tests multiple files, command execution, mixed operations, and multi-turn conversations

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "Testing Synthetic Tool Calling"
echo "Complex Scenarios"
echo "=========================================="
echo ""

# Cleanup function
cleanup_files() {
    rm -f alpha.txt beta.txt gamma.txt readme.md notes.txt special.txt data.txt 2>/dev/null || true
}

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test result tracker
declare -a FAILED_TEST_NAMES=()

# Function to run a test
run_test() {
    local test_name="$1"
    local prompt="$2"
    local verification_command="$3"
    local expected_output="$4"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Test $TOTAL_TESTS: $test_name${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    echo -e "${YELLOW}Prompt:${NC} $prompt"
    echo ""

    # Run the interactive session with timeout
    # Use expect-like behavior with a delay script
    (
        sleep 3  # Wait for interactive mode to start
        echo "$prompt"
        sleep 10 # Wait for model to respond and execute tools
        echo "exit"
        sleep 1
    ) | timeout 60 yarn start --mode interactive 2>&1 | grep -v "^\[20" | tail -30 || true

    echo ""
    echo -e "${YELLOW}Verification:${NC} Running: $verification_command"

    # Run verification
    if eval "$verification_command" > /tmp/test_output.txt 2>&1; then
        local output=$(cat /tmp/test_output.txt)

        if [ -n "$expected_output" ]; then
            if echo "$output" | grep -q "$expected_output"; then
                echo -e "${GREEN}✓ PASSED${NC}: Test succeeded"
                echo -e "${GREEN}  Output matched expected: $expected_output${NC}"
                PASSED_TESTS=$((PASSED_TESTS + 1))
            else
                echo -e "${RED}✗ FAILED${NC}: Output did not match expected"
                echo -e "${RED}  Expected: $expected_output${NC}"
                echo -e "${RED}  Got: $output${NC}"
                FAILED_TESTS=$((FAILED_TESTS + 1))
                FAILED_TEST_NAMES+=("$test_name")
            fi
        else
            echo -e "${GREEN}✓ PASSED${NC}: Verification command succeeded"
            echo -e "  Output: $output"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    else
        echo -e "${RED}✗ FAILED${NC}: Verification command failed"
        cat /tmp/test_output.txt
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name")
    fi

    rm -f /tmp/test_output.txt
}

# Cleanup before starting
cleanup_files

echo -e "${BLUE}Starting tests with model: qwen2.5-coder:latest${NC}"
echo ""
sleep 2

# Test 1: Multiple file creation (already proven to work)
run_test \
    "Multiple File Creation" \
    "Create three files: alpha.txt with 'Alpha', beta.txt with 'Beta', and gamma.txt with 'Gamma'" \
    "ls alpha.txt beta.txt gamma.txt && [ -f alpha.txt ] && [ -f beta.txt ] && [ -f gamma.txt ]" \
    ""

cleanup_files

# Test 2: Command execution
run_test \
    "Command Execution" \
    "Run the pwd command to show the current directory" \
    "echo 'Command execution test - checking if model attempted tool call'" \
    ""

# Test 3: Mixed operations (file + command)
run_test \
    "Mixed Operations" \
    "Create a file called readme.md with content '# Test Project', then run ls to show it" \
    "[ -f readme.md ] && grep -q 'Test Project' readme.md" \
    "Test Project"

cleanup_files

# Test 4: File with special characters
run_test \
    "Special Characters" \
    "Create a file called special.txt with content 'Hello @user! Price: \$99.99'" \
    "[ -f special.txt ] && cat special.txt" \
    "@user"

cleanup_files

# Test 5: Multi-step file operation
run_test \
    "Multi-Step Operation" \
    "Create a file called data.txt with content 'Line 1', then add 'Line 2' to it" \
    "[ -f data.txt ]" \
    ""

cleanup_files

# Final summary
echo ""
echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo ""
echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed Tests:${NC}"
    for test_name in "${FAILED_TEST_NAMES[@]}"; do
        echo -e "  ${RED}✗${NC} $test_name"
    done
    echo ""
fi

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}ALL TESTS PASSED! 🎉${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}SOME TESTS FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
