import AppKit
import CoreGraphics

// MARK: - Config
let logoPath    = CommandLine.arguments[1]
let outputPath  = CommandLine.arguments[2]
let canvasSize  = CGFloat(1024)
let cornerPct   = CGFloat(0.22)   // ~225px radius → stile iOS

// MARK: - Load logo
guard let logoImage = NSImage(contentsOfFile: logoPath) else {
    print("ERROR: cannot load logo at \(logoPath)"); exit(1)
}

// MARK: - Create canvas (offscreen)
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(canvasSize),
    pixelsHigh: Int(canvasSize),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .calibratedRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
)!

NSGraphicsContext.saveGraphicsState()
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx
let cgCtx = ctx.cgContext

// MARK: - Rounded rect background (bianco)
let corner = canvasSize * cornerPct
let bgRect = CGRect(x: 0, y: 0, width: canvasSize, height: canvasSize)
let bgPath = CGPath(roundedRect: bgRect, cornerWidth: corner, cornerHeight: corner, transform: nil)
cgCtx.addPath(bgPath)
cgCtx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
cgCtx.fillPath()

// MARK: - Logo (centrato, scala ~55% dell'altezza utile, sopra il testo)
let textAreaH = canvasSize * 0.22  // zona riservata al testo
let logoArea  = canvasSize - textAreaH
let logoScale = CGFloat(0.60)
let logoW     = logoArea * logoScale
let logoH     = logoArea * logoScale
let logoX     = (canvasSize - logoW) / 2
let logoY     = textAreaH + (logoArea - logoH) / 2   // CoreGraphics ha Y=0 in basso

let logoRect  = CGRect(x: logoX, y: logoY, width: logoW, height: logoH)
let logoNSRect = NSRect(x: logoX, y: logoY, width: logoW, height: logoH)
logoImage.draw(in: logoNSRect,
               from: .zero,
               operation: .sourceOver,
               fraction: 1.0)

// MARK: - Testo "My Library"
let fontSize  = canvasSize * 0.085
let fontName  = "Georgia-BoldItalic"   // fallback su system se manca
let font: NSFont = NSFont(name: fontName, size: fontSize)
              ?? NSFont.boldSystemFont(ofSize: fontSize)

let paraStyle = NSMutableParagraphStyle()
paraStyle.alignment = .center

let attrs: [NSAttributedString.Key: Any] = [
    .font:            font,
    .foregroundColor: NSColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1),
    .paragraphStyle:  paraStyle,
]
let text       = "My Library" as NSString
let textRect   = NSRect(x: 0, y: 18, width: canvasSize, height: textAreaH)
text.draw(in: textRect, withAttributes: attrs)

NSGraphicsContext.restoreGraphicsState()

// MARK: - Export PNG
guard let pngData = rep.representation(using: .png, properties: [:]) else {
    print("ERROR: cannot create PNG"); exit(1)
}
do {
    try pngData.write(to: URL(fileURLWithPath: outputPath))
    print("Saved: \(outputPath)")
} catch {
    print("ERROR writing: \(error)"); exit(1)
}
