# Set environment variables
$env:DATABASE_URL="file:./prisma/dev.db"
$env:JWT_SECRET="your-super-secret-jwt-key-here-make-it-long-and-random"
$env:PORT="4000"
$env:FRONTEND_URL="http://localhost:5173"

# Start the server
Write-Host "Starting server with environment variables..."
Write-Host "DATABASE_URL: $env:DATABASE_URL"
Write-Host "JWT_SECRET: Set"
Write-Host "PORT: $env:PORT"
Write-Host "FRONTEND_URL: $env:FRONTEND_URL"
Write-Host ""

node src/index.js
