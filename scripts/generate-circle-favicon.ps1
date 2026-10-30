Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\rockn\art_speaks\public\brand\logo-large.jpg"
if (-not (Test-Path $srcPath)) {
    $srcPath = "c:\Users\rockn\art_speaks\public\brand\logo.jpg"
}

$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)

function Create-Circular-Icon([int]$targetSize, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $targetSize, $targetSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Inset slightly for border stroke
    $borderWidth = [Math]::Max(1.5, $targetSize * 0.05)
    $inset = $borderWidth / 2.0
    $rect = New-Object System.Drawing.RectangleF $inset, $inset, ($targetSize - $borderWidth), ($targetSize - $borderWidth)

    # Clip to circle
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse($rect)
    $g.SetClip($path)

    # Draw source image centered
    $g.DrawImage($srcImg, 0, 0, $targetSize, $targetSize)
    $g.ResetClip()

    # Draw candy-pink border (#FFB7CE -> R=255, G=183, B=206)
    $pinkColor = [System.Drawing.Color]::FromArgb(255, 255, 183, 206)
    $pen = New-Object System.Drawing.Pen $pinkColor, $borderWidth
    $pen.Alignment = [System.Drawing.Drawing2D.PenAlignment]::Center
    $g.DrawEllipse($pen, $rect)

    $pen.Dispose()
    $path.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# Generate 192x192 app/icon.png
Create-Circular-Icon 192 "c:\Users\rockn\art_speaks\app\icon.png"

# Generate 180x180 app/apple-icon.png
Create-Circular-Icon 180 "c:\Users\rockn\art_speaks\app\apple-icon.png"

# Generate 32x32 and 48x48 PNGs for ICO packaging
Create-Circular-Icon 32 "c:\Users\rockn\art_speaks\public\icon-32.png"
Create-Circular-Icon 48 "c:\Users\rockn\art_speaks\public\icon-48.png"

$srcImg.Dispose()
Write-Output "Circular PNGs generated successfully!"
