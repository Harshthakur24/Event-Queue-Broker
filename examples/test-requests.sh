#!/bin/bash
# Example bash script to test the HTTP Request Proxy feature
# This shows how to queue HTTP requests to be executed by workers

BASE_URL="http://localhost:3000/api"

echo "Testing HTTP Request Proxy"
echo "=========================="
echo ""

# Example 1: Simple GET request
echo "1. Queuing GET request..."
REQUEST1='{
  "url": "https://jsonplaceholder.typicode.com/users/1",
  "method": "GET"
}'

RESPONSE1=$(curl -s -X POST "$BASE_URL/requests" \
  -H "Content-Type: application/json" \
  -d "$REQUEST1")

echo "Response: $RESPONSE1"
echo ""

# Example 2: POST request with body
echo "2. Queuing POST request with body..."
REQUEST2='{
  "url": "https://jsonplaceholder.typicode.com/posts",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "title": "Test Post",
    "body": "This is a test post",
    "userId": 1
  }
}'

RESPONSE2=$(curl -s -X POST "$BASE_URL/requests" \
  -H "Content-Type: application/json" \
  -d "$REQUEST2")

echo "Response: $RESPONSE2"
echo ""

# Example 3: Request with callback URL
echo "3. Queuing request with callback..."
REQUEST3='{
  "url": "https://api.github.com/users/octocat",
  "method": "GET",
  "headers": {
    "Accept": "application/json"
  },
  "callbackUrl": "https://your-webhook.com/results"
}'

RESPONSE3=$(curl -s -X POST "$BASE_URL/requests" \
  -H "Content-Type: application/json" \
  -d "$REQUEST3")

echo "Response: $RESPONSE3"
echo ""

echo "Test complete! Check your callback URL or consume events to see results."
echo ""
echo "To see request results, consume from 'http_requests' topic:"
echo "curl '$BASE_URL/events/consume?topic=http_requests&maxEvents=10'"

