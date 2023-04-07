// Copyright 2017 The Bazel Authors. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#import "AppDelegate.h"
#include "srcs/shared/module_d/module_d.h"
#import "srcs/shared/module_d/srcs_shared_module_d_module_d-Swift.h"
#import "srcs/shared/module_d/srcs_shared_module_d_module_d.h"

@interface AppDelegate ()

@property (strong) NSWindow *window;

@end

@implementation AppDelegate
- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    // Initialize window
    self.window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 400, 300)
                                            styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable
                                                backing:NSBackingStoreBuffered
                                                defer:YES];
    [self.window setTitle:@"Hello World"];

    // Add text label in center of view
    NSTextField *label = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 200, 50)];
    NSString *str = [NSString stringWithFormat:@"%@\n%@", ModuleDObjc.new.callSwiftMethod, ModuleDSwift.new.callObjcMethod];
    [label setStringValue:str];
    [label setAlignment:NSTextAlignmentCenter];
    [label setEditable:NO];
    [label setBordered:NO];
    [label setDrawsBackground:NO];
    [label sizeToFit];
    [label setFrameOrigin:NSMakePoint(NSMidX([self.window.contentView bounds]) - NSWidth([label frame]) / 2,
                                    NSMidY([self.window.contentView bounds]) - NSHeight([label frame]) / 2)];
    [[self.window contentView] addSubview:label];
    [self.window makeKeyAndOrderFront:nil];
}

- (void)applicationWillTerminate:(NSNotification *)aNotification {
    // Insert code here to tear down your application
}

@end

