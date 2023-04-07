import Foundation

@objcMembers
public class ModuleDSwift : NSObject {

    public func callObjcMethod() -> String {
        let moduleDObjc = ModuleDObjc()
        return moduleDObjc.calledBySwiftMethod()
    }

    public func calledByObjcMethod() -> String {
        return "i am swift, called by objc"
    }

}