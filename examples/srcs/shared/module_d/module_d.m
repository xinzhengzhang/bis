#import "module_d.h"
#import "srcs/shared/module_d/srcs_shared_module_d_module_d-Swift.h"

@implementation ModuleDObjc

- (NSString *)callSwiftMethod {
    return [ModuleDSwift new].calledByObjcMethod;
}

- (NSString *)calledBySwiftMethod {
    return @"i am objc, called by swift";
}

@end