//
//  app2Tests.m
//  app2Tests
//
//  Created by xinzheng zhang on 2023/4/23.
//

#import <XCTest/XCTest.h>

@interface app2Tests : XCTestCase

@end

@implementation app2Tests

- (void)setUp {
    // Put setup code here. This method is called before the invocation of each test method in the class.
}

- (void)tearDown {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
}

- (void)testExample {
    // In bis UITest is not supported for debugging
    // DONT use api include XCUIApplication

    // This is an example of a functional test case.
    // Use XCTAssert and related functions to verify your tests produce the correct results.
}

- (void)testExample2 {
    // This is an example of a functional test case.
    // Use XCTAssert and related functions to verify your tests produce the correct results.
}

- (void)testPerformanceExample {
    // This is an example of a performance test case.
    [self measureBlock:^{
        // Put the code you want to measure the time of here.
    }];
}

@end
