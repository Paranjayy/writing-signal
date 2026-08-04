// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "WritingSignalTracker",
  platforms: [.macOS(.v14)],
  products: [
    .executable(name: "writing-signal-tracker", targets: ["WritingSignalTracker"]),
  ],
  targets: [
    .executableTarget(name: "WritingSignalTracker"),
  ]
)
