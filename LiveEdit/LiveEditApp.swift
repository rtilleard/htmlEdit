import SwiftUI
import AppKit

@main
struct LiveEditApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        // Shown on launch: a calm welcome screen instead of the system open dialog.
        Window("htmlEdit", id: "welcome") {
            WelcomeView()
        }
        .windowResizability(.contentSize)
        .windowStyle(.hiddenTitleBar)

        // Document windows appear once a file is opened.
        DocumentGroup(newDocument: HTMLDocument()) { file in
            ContentView(document: file.$document)
        }
    }
}

/// Stops the app from auto-creating an untitled document / open panel at launch,
/// so the welcome window is the first thing the user sees.
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationShouldOpenUntitledFile(_ sender: NSApplication) -> Bool { false }
}

// MARK: - Welcome screen

struct WelcomeView: View {
    var body: some View {
        VStack(spacing: 26) {
            Spacer(minLength: 0)

            // Pilcrow mark in a soft, wireframe card.
            Text("¶")
                .font(.system(size: 40, weight: .regular, design: .serif))
                .foregroundStyle(.primary.opacity(0.82))
                .frame(width: 84, height: 84)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color.white)
                        .shadow(color: .black.opacity(0.12), radius: 16, x: 0, y: 8)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Color.black.opacity(0.07), lineWidth: 1)
                )

            VStack(spacing: 6) {
                Text("htmlEdit")
                    .font(.system(size: 22, weight: .semibold))
                Text("Edit HTML like a document.")
                    .font(.system(size: 13.5))
                    .foregroundStyle(.secondary)
            }

            OpenButton(action: openFile)
                .padding(.top, 2)

            Spacer(minLength: 0)
        }
        .frame(width: 440, height: 380)
        .background(Color(red: 0.96, green: 0.96, blue: 0.95))
        .preferredColorScheme(.light)
    }

    private func openFile() {
        NSDocumentController.shared.openDocument(nil)
    }
}

/// A flat, hairline-bordered button with a soft shadow and gentle hover lift.
private struct OpenButton: View {
    var action: () -> Void
    @State private var hovering = false

    var body: some View {
        Button(action: action) {
            Text("Open an HTML file")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.primary)
                .padding(.horizontal, 22)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .fill(Color.white)
                        .shadow(color: .black.opacity(hovering ? 0.16 : 0.10),
                                radius: hovering ? 14 : 9, x: 0, y: hovering ? 7 : 4)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .stroke(Color.black.opacity(0.09), lineWidth: 1)
                )
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .keyboardShortcut(.defaultAction)
        .onHover { hovering = $0 }
        .animation(.easeOut(duration: 0.14), value: hovering)
    }
}
