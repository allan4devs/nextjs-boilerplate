$ErrorActionPreference = "Stop"

$outputPath = Join-Path $PSScriptRoot "Allan_Rojas_Senior_Software_Engineer_AWS.docx"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("allan-cv-" + [guid]::NewGuid().ToString("N"))

function Escape-Xml([string]$value) {
  return [System.Security.SecurityElement]::Escape($value)
}

function Run([string]$text, [switch]$Bold, [switch]$Italic, [string]$Color = "243447", [int]$Size = 20) {
  $properties = "<w:rFonts w:ascii=`"Aptos`" w:hAnsi=`"Aptos`"/>"
  if ($Bold) { $properties += "<w:b/>" }
  if ($Italic) { $properties += "<w:i/>" }
  $properties += "<w:color w:val=`"$Color`"/><w:sz w:val=`"$Size`"/><w:szCs w:val=`"$Size`"/>"
  return "<w:r><w:rPr>$properties</w:rPr><w:t xml:space=`"preserve`">$(Escape-Xml $text)</w:t></w:r>"
}

function Paragraph([string]$content, [string]$style = "Normal", [int]$before = 0, [int]$after = 80, [int]$line = 240, [string]$align = "left", [switch]$KeepNext) {
  $keep = if ($KeepNext) { "<w:keepNext/>" } else { "" }
  return "<w:p><w:pPr><w:pStyle w:val=`"$style`"/>$keep<w:spacing w:before=`"$before`" w:after=`"$after`" w:line=`"$line`" w:lineRule=`"auto`"/><w:jc w:val=`"$align`"/></w:pPr>$content</w:p>"
}

function Bullet([string]$text) {
  $run = Run $text -Size 19
  return "<w:p><w:pPr><w:pStyle w:val=`"Normal`"/><w:numPr><w:ilvl w:val=`"0`"/><w:numId w:val=`"1`"/></w:numPr><w:spacing w:after=`"45`" w:line=`"235`" w:lineRule=`"auto`"/></w:pPr>$run</w:p>"
}

function Section([string]$title) {
  return Paragraph (Run $title.ToUpperInvariant() -Bold -Color "0B6E99" -Size 20) "SectionHeading" 190 70 240 "left" -KeepNext
}

function Job([string]$role, [string]$company, [string]$location, [string[]]$bullets) {
  $result = Paragraph ((Run $role -Bold -Color "102A43" -Size 22) + (Run "  |  $company" -Bold -Color "0B6E99" -Size 21)) "JobHeading" 90 20 240 "left" -KeepNext
  $result += Paragraph (Run $location -Italic -Color "52677A" -Size 18) "Normal" 0 55 220 "left" -KeepNext
  foreach ($item in $bullets) { $result += Bullet $item }
  return $result
}

$body = ""
$body += Paragraph (Run "ALLAN JOSE ROJAS DURAN" -Bold -Color "102A43" -Size 34) "Name" 0 10 260 "center" -KeepNext
$body += Paragraph (Run "SENIOR SOFTWARE ENGINEER" -Bold -Color "0B6E99" -Size 23) "Title" 0 35 240 "center" -KeepNext
$body += Paragraph (Run "Cloud-Native APIs  |  Distributed Systems  |  AWS  |  Full-Stack Engineering" -Bold -Color "334E68" -Size 19) "Normal" 0 55 220 "center"
$body += Paragraph (Run "Alajuela, Costa Rica (Remote)  |  +506 7225 2296  |  allan4devs@gmail.com  |  github.com/emeraldcr" -Color "52677A" -Size 18) "Contact" 0 120 220 "center"

$body += Section "Professional Summary"
$body += Paragraph (Run "Senior Software Engineer with 10+ years delivering production systems across enterprise, healthcare, and consumer products. Designs and owns cloud-native applications, REST APIs, backend services, web clients, data models, and delivery infrastructure from architecture through production support. Strong in Java/Spring Boot and TypeScript/React stacks on AWS, with hands-on experience in microservices, asynchronous and event-driven patterns, SQL performance, CI/CD, Kubernetes, observability, and cross-functional technical leadership." -Size 20) "Normal" 0 65 245 "left"

$body += Section "Role-Aligned Expertise"
$body += Bullet "API design and backend service development using Java, Spring Boot, Node.js, Express, REST, GraphQL, authentication, and authorization."
$body += Bullet "Cloud-native delivery on AWS using Lambda, ECS/EKS, EC2, S3, RDS, Docker, Kubernetes, and Terraform."
$body += Bullet "Distributed-system integration using REST APIs, microservices, asynchronous processing, and event-driven architectures."
$body += Bullet "Full-stack development with React, Next.js, TypeScript, Redux Toolkit, and operational dashboards with real-time data."
$body += Bullet "Relational data modeling and performance optimization with PostgreSQL, MySQL, SQL tuning, Redis, and caching strategies."
$body += Bullet "Modern software delivery with Git, GitHub Actions, Jenkins, automated testing, code review, monitoring, and production support."
$body += Bullet "System design with practical evaluation of scalability, reliability, maintainability, security, and operational tradeoffs."

$body += Section "Professional Experience"
$body += Job "Senior Full-Stack Engineer" "La Vieja Adventures" "Remote | Costa Rica" @(
  "Architected and shipped a cloud-native tourism platform with Spring Boot, React, Next.js, TypeScript, and GraphQL.",
  "Delivered booking workflows, administration consoles, reservation tools, authentication, and payment integrations end to end.",
  "Designed backend services and MySQL data models for responsive performance and operational reliability.",
  "Containerized services with Docker, ran production workloads on AWS, and owned deployment, monitoring, support, and continuous improvement.",
  "Built AI-assisted tools for reservations, customer communications, reporting, and internal operations."
)
$body += Job "Senior Software Engineer" "Wind River" "Remote | Costa Rica" @(
  "Designed and maintained Spring Boot microservices for cloud-native enterprise platforms.",
  "Delivered event-driven backend services on AWS using Lambda, Kubernetes, and scalable service patterns.",
  "Built React and Redux Toolkit dashboards with real-time visualization for operational insights.",
  "Strengthened delivery through GitHub Actions and Jenkins pipelines for consistent, repeatable releases.",
  "Improved production visibility with Prometheus and Grafana; contributed to design reviews, incident support, code quality, and mentoring."
)
$body += Job "Full-Stack Engineer" "Costa Rica Software Services" "Costa Rica" @(
  "Delivered full-stack web products with React, TypeScript, Node.js, and Express.",
  "Designed REST APIs and system integrations for GPS tracking, payments, and real-time mobility use cases.",
  "Improved API and data-layer performance through SQL tuning, caching, and request-path optimization.",
  "Increased reliability with Jest and Cypress automation and close collaboration across product, QA, and engineering."
)
$body += Job "Software Engineer" "MicroVention - Terumo" "Costa Rica" @(
  "Built Java systems for manufacturing operations in an FDA-regulated medical-device environment.",
  "Automated production reporting and delivered equipment-monitoring dashboards using JavaScript and Chart.js.",
  "Maintained enterprise software under FDA and ISO 13485 quality controls while partnering with manufacturing, quality, and business stakeholders."
)
$body += Job "Software Engineer" "ImagineerCX" "Costa Rica" @(
  "Developed and maintained customer-facing web applications with PHP, JavaScript, HTML/CSS, and MySQL.",
  "Improved frontend rendering and backend-processing performance and supported features through production deployment.",
  "Collaborated in Agile teams with design, QA, and project-management partners."
)

$body += Section "Technical Skills"
$skills = @(
  @("Languages", "TypeScript, JavaScript, Java, Python, SQL"),
  @("Backend & APIs", "Spring Boot, Node.js, Express, REST, GraphQL, microservices, event-driven design, AuthN/AuthZ"),
  @("Cloud & Platform", "AWS Lambda, ECS/EKS, EC2, S3, RDS, Docker, Kubernetes, Terraform, Linux"),
  @("Frontend", "React, Next.js, Redux Toolkit, Tailwind CSS, Material UI, HTML5, CSS3"),
  @("Data", "PostgreSQL, MySQL, Redis, schema design, query optimization, caching"),
  @("Delivery & Operations", "Git, GitHub Actions, Jenkins, CI/CD, Prometheus, Grafana, Jest, Cypress, production support")
)
foreach ($skill in $skills) {
  $body += Paragraph ((Run ($skill[0] + ": ") -Bold -Color "102A43" -Size 19) + (Run $skill[1] -Size 19)) "Normal" 0 35 230 "left"
}

$body += Section "Education & Languages"
$body += Paragraph ((Run "B.S. Computer Engineering" -Bold -Color "102A43" -Size 20) + (Run "  |  Instituto Tecnologico de Costa Rica (TEC)" -Color "334E68" -Size 20)) "Normal" 0 35 235 "left"
$body += Paragraph ((Run "Languages: " -Bold -Color "102A43" -Size 19) + (Run "Spanish - Native  |  English - Professional working proficiency (C1)" -Size 19)) "Normal" 0 0 230 "left"

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    $body
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="850" w:bottom="720" w:left="850" w:header="360" w:footer="360" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$stylesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Aptos"/><w:color w:val="243447"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Name"><w:name w:val="Name"/><w:basedOn w:val="Normal"/><w:next w:val="Title"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Contact"><w:name w:val="Contact"/><w:basedOn w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="SectionHeading"><w:name w:val="Section Heading"/><w:basedOn w:val="Normal"/><w:keepNext/><w:qFormat/><w:pPr><w:pbdr><w:bottom w:val="single" w:sz="8" w:space="4" w:color="5BC0EB"/></w:pbdr></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="JobHeading"><w:name w:val="Job Heading"/><w:basedOn w:val="Normal"/><w:keepNext/><w:qFormat/></w:style>
</w:styles>
"@

$numberingXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="&#x2022;"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="360"/></w:tabs><w:ind w:left="360" w:hanging="180"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="0B6E99"/></w:rPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>
"@

$contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"@

$rootRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"@

$documentRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"@

$timestamp = [DateTime]::UtcNow.ToString("s") + "Z"
$coreXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Allan Rojas - Senior Software Engineer - AWS and Cloud-Native</dc:title>
  <dc:subject>Resume tailored for Senior Software Engineer, EMS Activation Value Stream - Team Kaizen</dc:subject>
  <dc:creator>Allan Jose Rojas Duran</dc:creator>
  <cp:keywords>AWS, REST APIs, cloud-native, distributed systems, Java, Spring Boot, React, SQL, CI/CD</cp:keywords>
  <dc:description>Senior Software Engineer resume</dc:description>
  <dcterms:created xsi:type="dcterms:W3CDTF">$timestamp</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">$timestamp</dcterms:modified>
</cp:coreProperties>
"@

$appXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office Word</Application><AppVersion>16.0000</AppVersion></Properties>
"@

try {
  New-Item -ItemType Directory -Force -Path $tempRoot, (Join-Path $tempRoot "_rels"), (Join-Path $tempRoot "word"), (Join-Path $tempRoot "word\_rels"), (Join-Path $tempRoot "docProps") | Out-Null
  $utf8 = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot "[Content_Types].xml"), $contentTypes, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot "_rels\.rels"), $rootRels, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot "word\document.xml"), $documentXml, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot "word\styles.xml"), $stylesXml, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot "word\numbering.xml"), $numberingXml, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot "word\_rels\document.xml.rels"), $documentRels, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot "docProps\core.xml"), $coreXml, $utf8)
  [System.IO.File]::WriteAllText((Join-Path $tempRoot "docProps\app.xml"), $appXml, $utf8)

  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path $outputPath) { Remove-Item -LiteralPath $outputPath -Force }
  $outputStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::CreateNew)
  $archive = New-Object System.IO.Compression.ZipArchive($outputStream, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    foreach ($sourceFile in Get-ChildItem -LiteralPath $tempRoot -Recurse -File) {
      $relativePath = $sourceFile.FullName.Substring($tempRoot.Length + 1).Replace("\", "/")
      $entry = $archive.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
      $entryStream = $entry.Open()
      $sourceStream = [System.IO.File]::OpenRead($sourceFile.FullName)
      try { $sourceStream.CopyTo($entryStream) }
      finally {
        $sourceStream.Dispose()
        $entryStream.Dispose()
      }
    }
  }
  finally {
    $archive.Dispose()
    $outputStream.Dispose()
  }
  Write-Output $outputPath}
finally {
  if (Test-Path $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
