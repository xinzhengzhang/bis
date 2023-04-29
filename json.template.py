#!/usr/bin/env python3

import os
import os.path
import plistlib
import json
import re
from pathlib import Path
from functools import reduce

# root path of workspace
# os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])
workspace_path = os.environ["BUILD_WORKSPACE_DIRECTORY"]
platform_path = os.popen("dirname `xcrun --show-sdk-platform-path`").read().strip()

# cd workspace root
os.chdir(workspace_path)

# .vscode config
Path(".vscode").mkdir(parents=True, exist_ok=True)

content = """%json_items%
"""

def expand(item):
    if not "BIS_XCTEST_RUN_FILE" in item:
        if not "BIS_XCTEST_BUNDLE" in item:
            return item 
        else:
            test_is_device = item.pop("BIS_XCTEST_IS_DEVICE")
            test_arch = item.pop("BIS_XCTEST_ARCH_CPU")
            if test_is_device:
                print("Skip device test, support simulator only")
                return None
            arch = os.popen("arch").read().strip()
            if arch not in test_arch:
                print("Logic test requires that the xctestbundle architecture({}) must has the same value with os architecture({})".format(test_arch, arch))
                print("You can set cpu to --cpu=ios_sim_arm64 under apple silicon or --cpu=ios_x86_64 under intel")
                return None
            test_agent = os.path.join(os.popen("xcrun --sdk iphonesimulator --show-sdk-platform-path").read().strip(), "Developer/Library/Xcode/Agents/xctest")

            test_bundle = item.pop("BIS_XCTEST_BUNDLE")
            bundle_dir= os.path.dirname(test_bundle)
            bundle_file = os.path.basename(test_bundle)

            test_bundle_path = reduce(os.path.join, [bundle_dir, bundle_file.replace(".zip", ".__internal__.__test_bundle_archive-root"), bundle_file.replace(".zip", ".xctest")])
            item["program"] = test_bundle_path
            item["request"] = "custom"
            item["initCommands"] = [
                "settings set target.inherit-env false",
                "platform select ios-simulator"
            ]
            item["targetCreateCommands"] = [
                f"file {test_agent}",
                "target module add ${workspaceFolder}"+f"/{test_bundle_path}",
            ]
            item["processCreateCommands"] = [
                "platform connect ${command:zxz-moe-bis.targetUDID}",
                "br set -E Objective-C",
                "run -XCTest All ${workspaceFolder}" + f"/{test_bundle_path}"
            ]
    else:
        def replace(path):
            replaced_path = path.replace("__TESTROOT__", __TESTROOT__).replace("__PLATFORMS__", platform_path)
            if not test_is_device:
                replaced_path = re.sub(r"__TESTHOST__\/?", "", replaced_path)

            real_path = os.path.realpath(replaced_path)
            if os.path.exists(real_path):
                return real_path
            else:
                return replaced_path

        plist = item.pop("BIS_XCTEST_RUN_FILE")
        test_is_device = item.pop("BIS_XCTEST_IS_DEVICE")
        __TESTROOT__ = os.path.dirname(plist)

        with open(plist, "rb") as fd:
            plist_obj = plistlib.load(fd)
        is_ui_test = "IsUITestBundle" in plist_obj["Runner"] and plist_obj["Runner"]["IsUITestBundle"]
        if is_ui_test:
            print("Skip UI test")
            return None

        is_app_hosted_bundle = "IsAppHostedTestBundle" in plist_obj["Runner"] and plist_obj["Runner"]["IsAppHostedTestBundle"]

        testing_env = plist_obj["Runner"]["TestingEnvironmentVariables"]
        test_bundle_path = plist_obj["Runner"]["TestBundlePath"]
        if is_app_hosted_bundle:
            test_bundle_path = re.sub(r".*/.*\.app/", "",plist_obj["Runner"]["TestBundlePath"])

        testing_env["XCTestBundlePath"] = test_bundle_path
        item["env"] = dict((k, replace(v)) for k, v in testing_env.items())

        test_hosted_path = replace(plist_obj["Runner"]["TestHostPath"])
        test_hosted_info_path = os.path.join(test_hosted_path, "Info.plist")
        with open(test_hosted_info_path, "rb") as fd:
            test_hosted_info_obj = plistlib.load(fd)
            test_hosted_bundle_id = test_hosted_info_obj["CFBundleIdentifier"]

        item["iosBundleId"] = test_hosted_bundle_id
        item["iosTarget"] = "last-selected"
        item["program"] = test_hosted_path
        item["request"] = "launch"

    return item

launch_obj = json.loads(content)
launch_obj["configurations"] = [item for item in map(expand, launch_obj["configurations"]) if item is not None]


with open(".vscode/%config_name%", "w") as fd:
    # fd.write(content)
    json.dump(launch_obj, fd, indent=4, sort_keys=True)
