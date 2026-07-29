import SwiftUI
import WebKit

/// Lets the SwiftUI toolbar send formatting commands into the live web page,
/// and toggles between editing and previewing the page.
final class EditorBridge: ObservableObject {
    weak var webView: WKWebView?

    /// Whether the page is currently editable. When false, the page behaves like
    /// a normal browser, so interactive content (slides, buttons, keyboard
    /// navigation) works instead of being swallowed by edit mode.
    @Published var editing = true

    /// Runs a rich-text command on the current selection in the live page.
    func exec(_ command: String, value: String = "") {
        guard editing else { return }
        let safe = value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        webView?.evaluateJavaScript("document.execCommand('\(command)', false, '\(safe)');")
    }

    /// Turns editing on or off by flipping the page's designMode.
    func setEditing(_ on: Bool) {
        editing = on
        webView?.evaluateJavaScript("document.designMode = '\(on ? "on" : "off")';")
    }
}
