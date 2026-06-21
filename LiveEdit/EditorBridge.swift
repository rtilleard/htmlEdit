import SwiftUI
import WebKit

/// Lets the SwiftUI toolbar send formatting commands into the live web page.
final class EditorBridge: ObservableObject {
    weak var webView: WKWebView?

    /// Runs a rich-text command on the current selection in the live page.
    func exec(_ command: String, value: String = "") {
        let safe = value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        webView?.evaluateJavaScript("document.execCommand('\(command)', false, '\(safe)');")
    }
}
