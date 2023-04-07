import SwiftUI
import srcs_shared_module_a_module_a
import srcs_shared_module_d_module_d

@main
struct iOSApp: App {
    var body: some Scene {
        WindowGroup {
            VStack {
                Text(foo())
                Text(ModuleDObjc().callSwiftMethod())
                Text(ModuleDSwift().callObjcMethod())
                Button("click me") {
                    print("clicked")
                }
            }

        }
    }
}

