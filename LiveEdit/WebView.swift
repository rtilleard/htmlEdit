import SwiftUI
import WebKit

/// Renders the HTML and makes the rendered page directly editable (WYSIWYG).
/// Edits in the page are streamed back into the document so Save just works.
///
/// The web view is wrapped in a clipping container so its rounded corners come
/// from the container's layer — never from masking the WKWebView's own layer,
/// which renders out-of-process and can intermittently blank when masked.
struct WebView: NSViewRepresentable {
    @Binding var text: String
    var bridge: EditorBridge

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    func makeNSView(context: Context) -> NSView {
        let container = NSView()
        container.wantsLayer = true
        container.layer?.cornerRadius = 12
        container.layer?.cornerCurve = .continuous
        container.layer?.masksToBounds = true

        let config = WKWebViewConfiguration()
        config.userContentController.add(context.coordinator, name: "htmlChanged")

        let webView = EditorWebView(frame: container.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = context.coordinator
        webView.appearance = NSAppearance(named: .aqua) // render docs as light pages
        webView.pendingHTML = text

        bridge.webView = webView
        context.coordinator.webView = webView
        context.coordinator.lastLoaded = text

        container.addSubview(webView)
        return container
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        guard let webView = context.coordinator.webView else { return }
        webView.pendingHTML = text
        guard webView.didLoadOnce else { return }

        // Reload only when the text changed from the outside (e.g. a file was
        // opened) — never for edits the user just made inside the page.
        if text != context.coordinator.lastLoaded,
           text != context.coordinator.lastReported {
            webView.loadHTMLString(text, baseURL: nil)
            context.coordinator.lastLoaded = text
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        let parent: WebView
        var webView: EditorWebView?
        var lastLoaded = ""
        var lastReported = ""

        init(_ parent: WebView) { self.parent = parent }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Turn the whole rendered page into an editable surface, preserve the
            // doctype on save, and report every change back to the document.
            let js = """
            (function () {
              document.designMode = 'on';
              function doctype() {
                var d = document.doctype;
                if (!d) return '';
                var s = '<!DOCTYPE ' + d.name;
                if (d.publicId) s += ' PUBLIC "' + d.publicId + '"';
                if (d.systemId) s += (d.publicId ? '' : ' SYSTEM') + ' "' + d.systemId + '"';
                return s + '>\\n';
              }
              function report() {
                window.webkit.messageHandlers.htmlChanged
                  .postMessage(doctype() + document.documentElement.outerHTML);
              }
              document.addEventListener('input', report, true);
            })();
            """
            webView.evaluateJavaScript(js)
        }

        func userContentController(_ controller: WKUserContentController,
                                   didReceive message: WKScriptMessage) {
            guard let html = message.body as? String else { return }
            lastReported = html
            parent.text = html
        }
    }
}

/// A WKWebView that defers its first load until it actually has a non-zero
/// size. Loading into a zero-size web view can render a permanently blank page,
/// so we wait for the first real layout pass — the only reliable signal.
final class EditorWebView: WKWebView {
    var pendingHTML: String?
    var didLoadOnce = false

    override func layout() {
        super.layout()
        guard !didLoadOnce, bounds.width > 1, bounds.height > 1,
              let html = pendingHTML else { return }
        didLoadOnce = true
        loadHTMLString(html, baseURL: nil)
    }
}
