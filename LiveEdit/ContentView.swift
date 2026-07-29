import SwiftUI
import AppKit

struct ContentView: View {
    @Binding var document: HTMLDocument
    @StateObject private var bridge = EditorBridge()

    var body: some View {
        VStack(spacing: 0) {
            toolbar
            Divider().opacity(0.4)
            editor
        }
        .frame(minWidth: 640, minHeight: 480)
    }

    // MARK: Toolbar

    private var toolbar: some View {
        HStack(spacing: 2) {
            formattingControls
                .disabled(!bridge.editing)
                .opacity(bridge.editing ? 1 : 0.35)

            Spacer(minLength: 12)

            ModeToggle(editing: bridge.editing) { bridge.setEditing(!bridge.editing) }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
        .background(.regularMaterial)
    }

    @ViewBuilder private var formattingControls: some View {
        ToolButton(symbol: "bold", help: "Bold") { bridge.exec("bold") }
        ToolButton(symbol: "italic", help: "Italic") { bridge.exec("italic") }
        ToolButton(symbol: "underline", help: "Underline") { bridge.exec("underline") }

        separator

        ToolButton(text: "H1", help: "Heading 1") { bridge.exec("formatBlock", value: "<h1>") }
        ToolButton(text: "H2", help: "Heading 2") { bridge.exec("formatBlock", value: "<h2>") }
        ToolButton(symbol: "paragraph", help: "Normal text") { bridge.exec("formatBlock", value: "<p>") }

        separator

        ToolButton(symbol: "list.bullet", help: "Bulleted list") { bridge.exec("insertUnorderedList") }
        ToolButton(symbol: "list.number", help: "Numbered list") { bridge.exec("insertOrderedList") }
        ToolButton(symbol: "link", help: "Add link") { addLink() }

        separator

        ToolButton(symbol: "arrow.uturn.backward", help: "Undo") { bridge.exec("undo") }
        ToolButton(symbol: "arrow.uturn.forward", help: "Redo") { bridge.exec("redo") }
    }

    private var separator: some View {
        Rectangle()
            .fill(Color.primary.opacity(0.12))
            .frame(width: 1, height: 18)
            .padding(.horizontal, 7)
    }

    // MARK: Editor

    private var editor: some View {
        ZStack {
            // Soft shadow drawn behind the page (not on the web view itself).
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white)
                .shadow(color: .black.opacity(0.13), radius: 18, x: 0, y: 8)

            // The live, editable page. Corners are rounded on its own layer.
            WebView(text: $document.text, bridge: bridge)

            // Hairline border on top, non-interactive.
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.black.opacity(0.07), lineWidth: 1)
                .allowsHitTesting(false)
        }
        .padding(26)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .underPageBackgroundColor))
    }

    /// Asks for a URL, then links the selected text to it.
    private func addLink() {
        let alert = NSAlert()
        alert.messageText = "Add a link"
        alert.informativeText = "Select some text first, then enter the address."
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
        field.placeholderString = "https://example.com"
        alert.accessoryView = field
        alert.addButton(withTitle: "Add")
        alert.addButton(withTitle: "Cancel")
        if alert.runModal() == .alertFirstButtonReturn, !field.stringValue.isEmpty {
            bridge.exec("createLink", value: field.stringValue)
        }
    }
}

// MARK: - Edit / Interact toggle

/// Switches between editing the page and interacting with it. In Interact mode
/// the page is a normal browser, so slides, buttons and keyboard navigation work.
private struct ModeToggle: View {
    let editing: Bool
    var action: () -> Void
    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: editing ? "hand.tap" : "pencil")
                    .font(.system(size: 12, weight: .semibold))
                Text(editing ? "Interact" : "Edit")
                    .font(.system(size: 12, weight: .semibold))
            }
            .foregroundStyle(.primary)
            .padding(.horizontal, 12)
            .frame(height: 26)
            .background(
                RoundedRectangle(cornerRadius: 7, style: .continuous)
                    .fill(hovering ? Color.primary.opacity(0.12) : Color.primary.opacity(0.06))
                    .overlay(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .stroke(Color.primary.opacity(0.12), lineWidth: 1)
                    )
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(.easeOut(duration: 0.12), value: hovering)
        .help(editing
              ? "Interact: use the page normally (slides, buttons, links)"
              : "Edit: click and type to change the page")
    }
}

// MARK: - Toolbar button

/// A single flat toolbar button with a soft hover state.
private struct ToolButton: View {
    var symbol: String? = nil
    var text: String? = nil
    var help: String
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if let symbol {
                    Image(systemName: symbol).font(.system(size: 13, weight: .medium))
                } else if let text {
                    Text(text).font(.system(size: 12, weight: .semibold))
                }
            }
            .frame(width: 30, height: 26)
            .contentShape(Rectangle())
        }
        .buttonStyle(ToolButtonStyle())
        .help(help)
    }
}

private struct ToolButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        Hoverable(configuration: configuration)
    }

    private struct Hoverable: View {
        let configuration: Configuration
        @State private var hovering = false

        var body: some View {
            configuration.label
                .foregroundStyle(.primary)
                .background(
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .fill(fill)
                )
                .onHover { hovering = $0 }
                .animation(.easeOut(duration: 0.12), value: hovering)
                .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
        }

        private var fill: Color {
            if configuration.isPressed { return Color.primary.opacity(0.16) }
            if hovering { return Color.primary.opacity(0.08) }
            return Color.clear
        }
    }
}
