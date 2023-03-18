#import <Foundation/Foundation.h>
#import "sub_b.h"
#import "a.h"

const NSString* foo() {
    __unused SubModuleB *b = [SubModuleB new];
    [b bar];
    return module_b_name;
}
