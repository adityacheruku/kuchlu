// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Assistivetouch",
    platforms: [.iOS(.v14)],
    products: [
        .library(
            name: "Assistivetouch",
            targets: ["AssistiveTouchPluginPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0")
    ],
    targets: [
        .target(
            name: "AssistiveTouchPluginPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/AssistiveTouchPluginPlugin"),
        .testTarget(
            name: "AssistiveTouchPluginPluginTests",
            dependencies: ["AssistiveTouchPluginPlugin"],
            path: "ios/Tests/AssistiveTouchPluginPluginTests")
    ]
)