import SwiftUI

@main
struct LiveEditApp: App {
    var body: some Scene {
        DocumentGroup(newDocument: HTMLDocument()) { file in
            ContentView(document: file.$document)
        }
    }
}
