# Example PowerShell script to test the HTTP Request Proxy feature
# This shows how to queue HTTP requests to be executed by workers

$baseUrl = "http://localhost:3000/api"

Write-Host "Testing HTTP Request Proxy" -ForegroundColor Green
Write-Host "========================`n" -ForegroundColor Green

# Example 1: Simple GET request
Write-Host "1. Queuing GET request..." -ForegroundColor Yellow
$request1 = @{
    url = "https://jsonplaceholder.typicode.com/users/1"
    method = "GET"
} | ConvertTo-Json

$response1 = Invoke-RestMethod -Uri "$baseUrl/requests" -Method Post -Body $request1 -ContentType "application/json"
Write-Host "Request ID: $($response1.id)" -ForegroundColor Cyan
Write-Host "Status: $($response1.status)`n" -ForegroundColor Cyan

# Example 2: POST request with body
Write-Host "2. Queuing POST request with body..." -ForegroundColor Yellow
$request2 = @{
    url = "https://jsonplaceholder.typicode.com/posts"
    method = "POST"
    headers = @{
        "Content-Type" = "application/json"
    }
    body = @{
        title = "Test Post"
        body = "This is a test post"
        userId = 1
    }
} | ConvertTo-Json -Depth 5

$response2 = Invoke-RestMethod -Uri "$baseUrl/requests" -Method Post -Body $request2 -ContentType "application/json"
Write-Host "Request ID: $($response2.id)" -ForegroundColor Cyan
Write-Host "Status: $($response2.status)`n" -ForegroundColor Cyan

# Example 3: Request with callback URL
Write-Host "3. Queuing request with callback..." -ForegroundColor Yellow
$request3 = @{
    url = "https://api.github.com/users/octocat"
    method = "GET"
    headers = @{
        "Accept" = "application/json"
    }
    callbackUrl = "https://your-webhook.com/results"
} | ConvertTo-Json

$response3 = Invoke-RestMethod -Uri "$baseUrl/requests" -Method Post -Body $request3 -ContentType "application/json"
Write-Host "Request ID: $($response3.id)" -ForegroundColor Cyan
Write-Host "Status: $($response3.status)`n" -ForegroundColor Cyan

Write-Host "Test complete! Check your callback URL or consume events to see results." -ForegroundColor Green
Write-Host "`nTo see request results, consume from 'http_requests' topic:" -ForegroundColor Yellow
Write-Host "curl '$baseUrl/events/consume?topic=http_requests&maxEvents=10'" -ForegroundColor Cyan

