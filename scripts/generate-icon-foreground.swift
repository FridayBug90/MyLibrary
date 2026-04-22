// Genera ic_launcher_foreground.png: logo centrato nel safe-zone (72/108 dp)
// senza testo e senza sfondo — il bianco viene dal layer background
import AppKit

let logoPath   = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let canvas     = CGFloat(1024)
let logoScale  = CGFloat(0.60)   // ~60% → ben dentro la safe zone

guard let logo = NSImage(contentsOfFile: logoPath) else {
    print("ERROR: cannot load logo"); exit(1)
}

let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: Int(canvas), pixelsHigh: Int(canvas),
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
    isPlanar: false, colorSpaceName: .calibratedRGB, bytesPerRow: 0, bitsPerPixel: 0
)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)!

let side = canvas * logoScale
let x    = (canvas - side) / 2
let y    = (canvas - side) / 2
logo.draw(in: NSRect(x: x, y: y, width: side, height: side),
          from: .zero, operation: .sourceOver, fraction: 1.0)

NSGraphicsContext.restoreGraphicsState()

let data = rep.representation(using: .png, properties: [:])!
try! data.write(to: URL(fileURLWithPath: outputPath))
print("Saved: \(outputPath)")
