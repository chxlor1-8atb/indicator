[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Aegis Quant Terminal - MT5 1-Click Auto Installer"

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "   Aegis Quant Terminal v3.0 - MT5 1-Click Auto Installer" -ForegroundColor Cyan
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[*] Searching for MetaTrader 5 Data Folders on your system..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$mqlDir = Join-Path $projectRoot "mql"
if (-not (Test-Path $mqlDir)) {
    $mqlDir = $scriptDir
}

$eaSource = Join-Path $mqlDir "Aegis_Quant_Terminal.mq5"
if (-not (Test-Path $eaSource)) {
    Write-Host "[-] Error: Aegis_Quant_Terminal.mq5 not found at: $eaSource" -ForegroundColor Red
    Write-Host "Press Enter to exit..." -ForegroundColor Gray
    Read-Host
    exit 1
}

$appData = [System.Environment]::GetFolderPath('ApplicationData')
$terminalBase = Join-Path $appData 'MetaQuotes\Terminal'
$installedCount = 0

$metaEditorPaths = @(
    "C:\Program Files\MetaTrader 5\metaeditor64.exe",
    "C:\Program Files (x86)\MetaTrader 5\metaeditor64.exe",
    "C:\Program Files\Weltrade MetaTrader 5\metaeditor64.exe",
    "C:\Program Files\XM Global MT5\metaeditor64.exe",
    "C:\Program Files\Exness MT5 Terminal\metaeditor64.exe",
    "C:\Program Files\IC Markets MT5\metaeditor64.exe"
)

$meFound = $null
foreach ($me in $metaEditorPaths) {
    if (Test-Path $me) {
        $meFound = $me
        break
    }
}

if (Test-Path $terminalBase) {
    $terminals = Get-ChildItem -Path $terminalBase -Directory | Where-Object { $_.Name -ne 'Common' -and $_.Name -ne 'Community' }
    foreach ($t in $terminals) {
        $mql5Dir = Join-Path $t.FullName 'MQL5'
        if (Test-Path $mql5Dir) {
            $expertsDir = Join-Path $mql5Dir 'Experts'
            $presetsDir = Join-Path $mql5Dir 'Presets'
            if (-not (Test-Path $expertsDir)) { New-Item -ItemType Directory -Path $expertsDir -Force | Out-Null }
            if (-not (Test-Path $presetsDir)) { New-Item -ItemType Directory -Path $presetsDir -Force | Out-Null }

            Copy-Item -Path $eaSource -Destination $expertsDir -Force
            Get-ChildItem -Path $mqlDir -Filter '*.set' | Copy-Item -Destination $presetsDir -Force
            $templatesDir = Join-Path $mql5Dir 'Profiles\Templates'
            if (Test-Path $templatesDir) {
                Get-ChildItem -Path $mqlDir -Filter '*.tpl' | Copy-Item -Destination $templatesDir -Force
            }

            Write-Host "[+] Successfully installed into MT5 Instance: $($t.Name)" -ForegroundColor Green
            Write-Host "    -> Experts: $expertsDir" -ForegroundColor Gray
            Write-Host "    -> Presets: $presetsDir" -ForegroundColor Gray
            $installedCount++

            if ($meFound) {
                Write-Host "    [*] Compiling .mq5 -> .ex5 with MetaEditor ($meFound)..." -ForegroundColor Yellow
                $targetMq5 = Join-Path $expertsDir "Aegis_Quant_Terminal.mq5"
                $logFile = Join-Path $expertsDir "compile.log"
                Start-Process -FilePath $meFound -ArgumentList "/compile:`"$targetMq5`" /log:`"$logFile`"" -Wait
                $targetEx5 = Join-Path $expertsDir "Aegis_Quant_Terminal.ex5"
                if (Test-Path $targetEx5) {
                    Write-Host "    [✓] Compiled .ex5 is ready!" -ForegroundColor Green
                } else {
                    Write-Host "    [!] Compilation completed. You can also press F7 in MetaEditor." -ForegroundColor Yellow
                }
            }
        }
    }
}

Write-Host ""
if ($installedCount -gt 0) {
    Write-Host "=======================================================================" -ForegroundColor Green
    Write-Host "  Success! Installed EA & Presets to $installedCount MT5 terminal(s)!" -ForegroundColor Green
    Write-Host "=======================================================================" -ForegroundColor Green
} else {
    Write-Host "[!] No active MT5 Terminal folder detected in AppData." -ForegroundColor Yellow
    Write-Host "[*] Opening EA folder so you can copy to MT5..." -ForegroundColor Cyan
    Start-Process "explorer.exe" -ArgumentList "`"$mqlDir`""
}

Write-Host ""
Write-Host "Quick Setup Guide for MT5:" -ForegroundColor Cyan
Write-Host "  1. Open MetaTrader 5 (login to your account)" -ForegroundColor White
Write-Host "  2. Press Ctrl + O -> 'Expert Advisors' tab:" -ForegroundColor White
Write-Host "     - Check [X] Allow Algo Trading" -ForegroundColor White
Write-Host "     - Check [X] Allow WebRequest for listed URL" -ForegroundColor White
Write-Host "     - Add URL: http://localhost:3000 (or your server domain)" -ForegroundColor Yellow
Write-Host "  3. In Navigator window (press Ctrl + N):" -ForegroundColor White
Write-Host "     - Right-click 'Expert Advisors' -> Click 'Refresh'" -ForegroundColor White
Write-Host "  4. Drag 'Aegis_Quant_Terminal' onto XAUUSD chart (15M or 1H)" -ForegroundColor White
Write-Host "     - In Inputs tab, click 'Load' to select preset if desired:" -ForegroundColor Gray
Write-Host "       * Aegis_Gold_Standard_Compound.set ($10-$50 Compounding)" -ForegroundColor Gray
Write-Host "       * Aegis_MultiSymbol_AllInOne.set (One-Chart Multi-Symbol)" -ForegroundColor Gray
Write-Host "  5. Click OK and ensure the top 'Algo Trading' button is GREEN!" -ForegroundColor Green
Write-Host "  6. The Dark Glassmorphism HUD will appear on chart: BRIDGE: ONLINE" -ForegroundColor Green
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Gray
Read-Host