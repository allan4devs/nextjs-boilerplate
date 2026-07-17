param(
  [switch]$Apply,
  [string]$Workbook = (Join-Path $PSScriptRoot "estado.xlsx"),
  [string]$EmailReport = (Join-Path $PSScriptRoot "email-alignment-report.json")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Workbook -PathType Leaf)) {
  throw "No existe el archivo: $Workbook"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-CellValue {
  param($Cell, [string[]]$SharedStrings)
  if ($null -eq $Cell) { return "" }
  if ($Cell.t -eq "s") { return [string]$SharedStrings[[int]$Cell.v] }
  if ($Cell.t -eq "inlineStr") { return [string]$Cell.is.InnerText }
  return [string]$Cell.v
}

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Workbook))
$tempJson = Join-Path ([System.IO.Path]::GetTempPath()) ("xtreme-estado-{0}.json" -f [guid]::NewGuid())

try {
  $sharedStrings = @()
  $sharedEntry = $zip.GetEntry("xl/sharedStrings.xml")
  if ($sharedEntry) {
    $reader = [IO.StreamReader]::new($sharedEntry.Open())
    try { [xml]$sharedXml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $manager = [Xml.XmlNamespaceManager]::new($sharedXml.NameTable)
    $manager.AddNamespace("x", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $sharedStrings = @($sharedXml.SelectNodes("//x:si", $manager) | ForEach-Object { $_.InnerText })
  }

  $sheetEntry = $zip.GetEntry("xl/worksheets/sheet1.xml")
  if (-not $sheetEntry) { throw "El libro no contiene xl/worksheets/sheet1.xml" }
  $reader = [IO.StreamReader]::new($sheetEntry.Open())
  try { [xml]$sheetXml = $reader.ReadToEnd() } finally { $reader.Dispose() }

  $rows = @($sheetXml.worksheet.sheetData.row)
  if ($rows.Count -lt 3) { throw "La hoja no contiene filas para importar." }

  $headers = @{}
  foreach ($cell in @($rows[1].c)) {
    $column = ([regex]::Match([string]$cell.r, "^[A-Z]+")).Value
    $headers[$column] = Get-CellValue $cell $sharedStrings
  }

  $records = foreach ($row in $rows | Select-Object -Skip 2) {
    $record = [ordered]@{}
    foreach ($header in $headers.Values) { $record[$header] = "" }
    foreach ($cell in @($row.c)) {
      $column = ([regex]::Match([string]$cell.r, "^[A-Z]+")).Value
      if ($headers.ContainsKey($column)) {
        $record[$headers[$column]] = Get-CellValue $cell $sharedStrings
      }
    }
    [pscustomobject]$record
  }

  $json = ConvertTo-Json -InputObject @($records) -Depth 4 -Compress
  [IO.File]::WriteAllText($tempJson, $json, [Text.UTF8Encoding]::new($false))
} finally {
  $zip.Dispose()
}

try {
  $arguments = @(
    "--env-file=.env",
    (Join-Path $PSScriptRoot "import-estado.mjs"),
    "--input", $tempJson,
    "--report", $EmailReport
  )
  if ($Apply) { $arguments += "--apply" }
  & node @arguments
  if ($LASTEXITCODE -ne 0) { throw "La importacion termino con codigo $LASTEXITCODE." }
} finally {
  Remove-Item -LiteralPath $tempJson -Force -ErrorAction SilentlyContinue
}
