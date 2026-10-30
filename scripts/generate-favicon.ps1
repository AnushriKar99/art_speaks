Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\rockn\art_speaks\public\brand\logo.jpg"
$icoPath = "c:\Users\rockn\art_speaks\app\favicon.ico"
$publicIcoPath = "c:\Users\rockn\art_speaks\public\favicon.ico"
$pngIconPath = "c:\Users\rockn\art_speaks\app\icon.png"
$appleIconPath = "c:\Users\rockn\art_speaks\app\apple-icon.png"

$img = [System.Drawing.Image]::FromFile($srcPath)

# 1. Generate 32x32 favicon.ico
$bmp32 = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($bmp32)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, 0, 0, 32, 32)
$g.Dispose()

$hIcon = $bmp32.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$fs = [System.IO.File]::Create($icoPath)
$icon.Save($fs)
$fs.Close()

# Also save to public/favicon.ico for static requests
$fs2 = [System.IO.File]::Create($publicIcoPath)
$icon.Save($fs2)
$fs2.Close()

$icon.Dispose()
$bmp32.Dispose()

# 2. Generate 192x192 app/icon.png
$bmp192 = New-Object System.Drawing.Bitmap 192, 192
$g192 = [System.Drawing.Graphics]::FromImage($bmp192)
$g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g192.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g192.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g192.DrawImage($img, 0, 0, 192, 192)
$g192.Dispose()
$bmp192.Save($pngIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp192.Dispose()

# 3. Generate 180x180 app/apple-icon.png
$bmp180 = New-Object System.Drawing.Bitmap 180, 180
$g180 = [System.Drawing.Graphics]::FromImage($bmp180)
$g180.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g180.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g180.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g180.DrawImage($img, 0, 0, 180, 180)
$g180.Dispose()
$bmp180.Save($appleIconPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp180.Dispose()

$img.Dispose()
Write-Output "Favicons successfully generated!"
