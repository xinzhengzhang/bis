import SwiftUI
import srcs_shared_module_a_module_a

@main
struct iOSApp: App {
    var body: some Scene {
        WindowGroup {
            VStack {
                Text(foo())
                Button("click me") {
                    print("clicked")
                }
            }

        }
    }
}

