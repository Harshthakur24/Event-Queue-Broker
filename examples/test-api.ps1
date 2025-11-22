# Example PowerShell script to test the Event Broker API
# Make sure the server is running: npm run dev

$baseUrl = "http://localhost:3000/api"

Write-Host "Testing Event Broker API" -ForegroundColor Green
Write-Host "========================`n" -ForegroundColor Green

# Health check
Write-Host "1. Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
Write-Host "Status: $($health.status)`n" -ForegroundColor Cyan

# Enqueue events
Write-Host "2. Enqueueing events..." -ForegroundColor Yellow
$event1 = Invoke-RestMethod -Uri "$baseUrl/events" -Method Post -Body (@{message="Hello World"; priority="high"} | ConvertTo-Json) -ContentType "application/json"
Write-Host "Event 1 ID: $($event1.id)" -ForegroundColor Cyan

$event2 = Invoke-RestMethod -Uri "$baseUrl/events?topic=test" -Method Post -Body (@{message="Test event"; topic="test"} | ConvertTo-Json) -ContentType "application/json"
Write-Host "Event 2 ID: $($event2.id)`n" -ForegroundColor Cyan

# Wait a bit
Start-Sleep -Seconds 1

# Check status
Write-Host "3. Checking status..." -ForegroundColor Yellow
$status = Invoke-RestMethod -Uri "$baseUrl/status" -Method Get
Write-Host "Queue size: $($status.queue.size)" -ForegroundColor Cyan
Write-Host "Inflight: $($status.inflight.count)" -ForegroundColor Cyan
Write-Host "Committed: $($status.committed.count)`n" -ForegroundColor Cyan

# Consume events
Write-Host "4. Consuming events..." -ForegroundColor Yellow
$consumed = Invoke-RestMethod -Uri "$baseUrl/events/consume?maxEvents=5&timeoutMs=5000" -Method Get
Write-Host "Consumed $($consumed.count) events" -ForegroundColor Cyan

if ($consumed.events.Count -gt 0) {
    $receiptIds = $consumed.events | ForEach-Object { $_.receiptId }
    Write-Host "Receipt IDs: $($receiptIds -join ', ')`n" -ForegroundColor Cyan
    
    # Acknowledge events
    Write-Host "5. Acknowledging events..." -ForegroundColor Yellow
    $ackBody = @{receiptIds=$receiptIds} | ConvertTo-Json
    $ack = Invoke-RestMethod -Uri "$baseUrl/events/acknowledge" -Method Post -Body $ackBody -ContentType "application/json"
    Write-Host "Acknowledged: $($ack.acknowledged.Count)" -ForegroundColor Cyan
    if ($ack.failed.Count -gt 0) {
        Write-Host "Failed: $($ack.failed.Count)" -ForegroundColor Red
    }
}

# Check metrics
Write-Host "`n6. Checking metrics..." -ForegroundColor Yellow
$metrics = Invoke-RestMethod -Uri "$baseUrl/metrics" -Method Get
Write-Host "Events enqueued: $($metrics.events.enqueued)" -ForegroundColor Cyan
Write-Host "Events consumed: $($metrics.events.consumed)" -ForegroundColor Cyan
Write-Host "Events acknowledged: $($metrics.events.acknowledged)" -ForegroundColor Cyan

Write-Host "`nTest complete!" -ForegroundColor Green
