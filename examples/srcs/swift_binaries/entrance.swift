import Foundation
import srcs_shared_module_b_module_b
import ArgumentParser

@main
struct Entrance: ParsableCommand {
    @Argument(help: "The name of the person to greet.")
    var name: String = "hello swift binary"

    func run() throws {
        print(name)
        print(greeting_from_module_b())
    }
}
