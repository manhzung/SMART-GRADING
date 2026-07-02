$targetDir = "C:\TAILIEU\DATN\SMART_GRADING\client\mobile\.dart_tool\hooks_runner\shared\dartcv4\build\b184b5af3a\_deps\opencv-src\.cache"
$sourceFile = "C:\TAILIEU\DATN\SMART_GRADING\client\mobile\kleidicv-0.7.0.tar.gz"

Write-Host "Monitoring for cache directory creation..."
for ($i = 0; $i -lt 240; $i++) {
    if (Test-Path $targetDir) {
        $destDir = Join-Path $targetDir "kleidicv"
        $null = New-Item -ItemType Directory -Force -Path $destDir
        Copy-Item -Path $sourceFile -Destination (Join-Path $destDir "e8f94e427bd78a745afa5c8cd073b416-kleidicv-0.7.0.tar.gz") -Force
        Write-Host "Successfully injected KleidiCV archive into CMake cache!"
        break
    }
    Start-Sleep -Milliseconds 500
}
