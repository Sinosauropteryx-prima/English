@setlocal & set PS1="%TEMP%\%~n0.%TIME::=%.ps1"
@more +3 "%~f0">%PS1% && powershell -nop -exec bypass -f %PS1% %*
@del %PS1% & pause & exit /b
if ($args.Count -eq 0) {
    Write-Host "[ERROR] Please drag and drop CSV file(s) onto this batch file." -ForegroundColor Red
    exit
}

Write-Host "Starting CSV Double-Quote Wrapper (UTF-8 Output)..." -ForegroundColor Cyan

[void][Reflection.Assembly]::LoadWithPartialName('Microsoft.VisualBasic')

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
    $outputPath = [System.IO.Path]::Combine($dir, $name + "_quoted" + $ext)

    Write-Host "Processing: $inputPath"
    
    $reader = $null
    $writer = $null
    try {
        # Auto-detects BOM (UTF-8) or falls back to default encoding (Shift-JIS) for input
        $reader = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($inputPath, [System.Text.Encoding]::Default)
        $reader.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
        $reader.SetDelimiters(",")
        $reader.HasFieldsEnclosedInQuotes = $true

        # Outputs in UTF-8 (With BOM for Excel compatibility)
        $writer = New-Object System.IO.StreamWriter($outputPath, $false, [System.Text.Encoding]::UTF8)

        while (-not $reader.EndOfData) {
            $fields = $reader.ReadFields()
            $escapedFields = New-Object System.Collections.Generic.List[string]
            foreach ($field in $fields) {
                $val = if ($field -eq $null) { "" } else { $field }
                $escaped = $val.Replace('"', '""')
                [void]$escapedFields.Add('"' + $escaped + '"')
            }
            $line = [string]::Join(",", $escapedFields)
            $writer.WriteLine($line)
        }
        Write-Host "Success: $outputPath" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to process $inputPath. Reason: $_" -ForegroundColor Red
    } finally {
        if ($reader -ne $null) { $reader.Close() }
        if ($writer -ne $null) { $writer.Close() }
    }
}

Write-Host "All processes completed." -ForegroundColor Cyan