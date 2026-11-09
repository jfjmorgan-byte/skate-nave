param([string]$Root, [int]$Port = 8765)
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
Write-Output "Sirviendo $Root en http://localhost:$Port/"
while ($l.IsListening) {
  $c = $l.GetContext()
  $p = $c.Request.Url.AbsolutePath.TrimStart('/')
  if ($p -eq '') { $p = 'pixel-skate.html' }
  $f = Join-Path $Root $p
  if (Test-Path $f -PathType Leaf) {
    $b = [System.IO.File]::ReadAllBytes($f)
    $c.Response.ContentType = 'text/html; charset=utf-8'
    $c.Response.Headers.Add('Cache-Control', 'no-store')
    $c.Response.OutputStream.Write($b, 0, $b.Length)
  } else { $c.Response.StatusCode = 404 }
  $c.Response.Close()
}
