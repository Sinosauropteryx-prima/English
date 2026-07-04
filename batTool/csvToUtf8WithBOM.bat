@setlocal & set PS1="%TEMP%\%~n0.%TIME::=%.ps1"
@more +3 "%~f0">%PS1% && powershell -nop -exec bypass -f %PS1% %*
@del %PS1% & pause & exit /b
if ($args.Count -eq 0) {
    Write-Host "[ERROR] Please drag and drop CSV file(s) onto this batch file." -ForegroundColor Red
    exit
}

Write-Host "Excel CSV Loader (UTF-8 BOM Converter)..." -ForegroundColor Cyan

# Function to launch Excel
function Open-WithExcel($filePath) {
    try {
        # Open with Excel directly
        Start-Process "excel" -ArgumentList "`"$filePath`""
        Write-Host "Opened with Excel: $filePath" -ForegroundColor Green
    } catch {
        # Fallback if Excel is not found on the system path
        try {
            Invoke-Item $filePath
            Write-Host "Opened with default application: $filePath" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Failed to open file: $_" -ForegroundColor Red
        }
    }
}

foreach ($inputPath in $args) {
    if (-not (Test-Path $inputPath)) {
        Write-Host "[WARNING] File not found: $inputPath" -ForegroundColor Yellow
        continue
    }

    $ext = [System.IO.Path]::GetExtension($inputPath).ToLower()
    if ($ext -ne ".csv") {
        Write-Host "[WARNING] Not a CSV file. Skipped: $inputPath" -ForegroundColor Yellow
        continue
    }

    $dir = [System.IO.Path]::GetDirectoryName($inputPath)
    $name = [System.IO.Path]::GetFileNameWithoutExtension($inputPath)
    
    # Read raw bytes to inspect the encoding
    $bytes = [System.IO.File]::ReadAllBytes($inputPath)
    $isBomUtf8 = $false
    $isNoBomUtf8 = $false

    # 1. Check for UTF-8 BOM (EF BB BF)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $isBomUtf8 = $true
    } else {
        # 2. Verify if it is UTF-8 without BOM (Throws exception on invalid byte sequences)
        $utf8ThrowException = New-Object System.Text.UTF8Encoding($false, $true)
        try {
            $null = $utf8ThrowException.GetString($bytes)
            $isNoBomUtf8 = $true
        } catch {
            $isNoBomUtf8 = $false
        }
    }

    if ($isBomUtf8) {
        # Already BOM-UTF8, no conversion needed. Open original file directly.
        Write-Host "Detected: UTF-8 with BOM" -ForegroundColor DarkGreen
        Open-WithExcel $inputPath
    } else {
        # Create output path (Original filename + _bom.csv)
        # ※ To overwrite the original file directly, please check the 'Technical Note' below.
        $outputPath = [System.IO.Path]::Combine($dir, $name + "_bom" + $ext)
        
        if ($isNoBomUtf8) {
            Write-Host "Detected: UTF-8 without BOM" -ForegroundColor Yellow
            Write-Host "Converting to UTF-8 with BOM -> $outputPath"
            try {
                $text = [System.IO.File]::ReadAllText($inputPath, [System.Text.Encoding]::UTF8)
                [System.IO.File]::WriteAllText($outputPath, $text, [System.Text.Encoding]::UTF8)
                Open-WithExcel $outputPath
            } catch {
                Write-Host "[ERROR] Conversion failed: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "Detected: Shift-JIS (or other compatible encoding)" -ForegroundColor Yellow
            Write-Host "Converting to UTF-8 with BOM -> $outputPath"
            try {
                # Read as Shift-JIS (CP932) and write as UTF-8 (with BOM)
                $sjis = [System.Text.Encoding]::GetEncoding(932)
                $text = [System.IO.File]::ReadAllText($inputPath, $sjis)
                [System.IO.File]::WriteAllText($outputPath, $text, [System.Text.Encoding]::UTF8)
                Open-WithExcel $outputPath
            } catch {
                Write-Host "[ERROR] Conversion failed: $_" -ForegroundColor Red
            }
        }
    }
}

Write-Host "Done." -ForegroundColor Cyan