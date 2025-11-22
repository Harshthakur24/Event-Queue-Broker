#!/bin/bash
# Example bash script to test the Event Broker API
# Make sure the server is running: npm run dev

BASE_URL="http://localhost:3000/api"

echo "Testing Event Broker API"
echo "========================"
echo ""

# Health check
echo "1. Health Check..."
HEALTH=$(curl -s "$BASE_URL/health")
echo "Response: $HEALTH"
echo ""

# Enqueue events
echo "2. Enqueueing events..."
EVENT1=$(curl -s -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello World","priority":"high"}')
EVENT1_ID=$(echo $EVENT1 | jq -r '.id')
echo "Event 1 ID: $EVENT1_ID"

EVENT2=$(curl -s -X POST "$BASE_URL/events?topic=test" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test event","topic":"test"}')
EVENT2_ID=$(echo $EVENT2 | jq -r '.id')
echo "Event 2 ID: $EVENT2_ID"
echo ""

# Wait a bit
sleep 1

# Check status
echo "3. Checking status..."
STATUS=$(curl -s "$BASE_URL/status")
echo "Queue size: $(echo $STATUS | jq -r '.queue.size')"
echo "Inflight: $(echo $STATUS | jq -r '.inflight.count')"
echo "Committed: $(echo $STATUS | jq -r '.committed.count')"
echo ""

# Consume events
echo "4. Consuming events..."
CONSUMED=$(curl -s "$BASE_URL/events/consume?maxEvents=5&timeoutMs=5000")
COUNT=$(echo $CONSUMED | jq -r '.count')
echo "Consumed $COUNT events"

if [ "$COUNT" -gt 0 ]; then
  RECEIPT_IDS=$(echo $CONSUMED | jq -r '.events[].receiptId' | jq -R -s -c 'split("\n")[:-1]')
  echo "Receipt IDs: $RECEIPT_IDS"
  echo ""
  
  # Acknowledge events
  echo "5. Acknowledging events..."
  ACK=$(curl -s -X POST "$BASE_URL/events/acknowledge" \
    -H "Content-Type: application/json" \
    -d "{\"receiptIds\":$RECEIPT_IDS}")
  ACK_COUNT=$(echo $ACK | jq -r '.acknowledged | length')
  echo "Acknowledged: $ACK_COUNT"
fi

# Check metrics
echo ""
echo "6. Checking metrics..."
METRICS=$(curl -s "$BASE_URL/metrics")
echo "Events enqueued: $(echo $METRICS | jq -r '.events.enqueued')"
echo "Events consumed: $(echo $METRICS | jq -r '.events.consumed')"
echo "Events acknowledged: $(echo $METRICS | jq -r '.events.acknowledged')"

echo ""
echo "Test complete!"
