import Foundation

@objc public class AssistiveTouchPlugin: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
