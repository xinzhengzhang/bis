#import <Foundation/Foundation.h>

extern const NSString *module_b_name;

@interface SubModuleB: NSObject

@property (readonly) NSString *str1;
@property (readwrite) NSString *str2;

- (void)bar;

@end
