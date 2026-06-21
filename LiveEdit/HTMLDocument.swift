import SwiftUI
import UniformTypeIdentifiers

/// A plain HTML file the app can open, edit and save.
struct HTMLDocument: FileDocument {
    var text: String

    init(text: String = HTMLDocument.starter) {
        self.text = text
    }

    static var readableContentTypes: [UTType] { [.html] }
    static var writableContentTypes: [UTType] { [.html] }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents,
              let string = String(data: data, encoding: .utf8) else {
            throw CocoaError(.fileReadCorruptFile)
        }
        text = string
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: Data(text.utf8))
    }

    /// Content shown when you create a brand-new document.
    static let starter = """
    <!doctype html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, system-ui, sans-serif; line-height: 1.5; max-width: 720px; margin: 40px auto; padding: 0 20px;">
      <h1>New document</h1>
      <p>Click anywhere and start typing. Use the toolbar to format.</p>
    </body>
    </html>
    """
}
