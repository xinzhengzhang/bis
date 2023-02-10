#!/usr/bin/env python3

import argparse
import subprocess
import json
import types
import locale
import os
import sys

from pathlib import Path

# Error define
ERR_NO_TARGET_FOUND = 166


def str2bool(v):
    if isinstance(v, bool):
        return v
    if v.lower() in ('yes', 'true', 't', 'y', '1'):
        return True
    elif v.lower() in ('no', 'false', 'f', 'n', '0'):
        return False
    else:
        raise argparse.ArgumentTypeError('Boolean value expected.')


def get_target_info(args):
    Path(".bis/extractor").mkdir(parents=True, exist_ok=True)
    with open('.bis/extractor/BUILD', 'w') as output_file:
        template = f"""
load("@bis//:extract_target_info.bzl", "extract_target_info")

extract_target_info(
  name = "extract_target",
  target = "{args.target}",
  testonly = True,
  tags = ["manual"],
  testonly = True,

)
  """
        output_file.write(template)
    info_process = subprocess.run(
        ["bazel", "run", "//.bis/extractor:extract_target",
            "--check_visibility=false"],
        capture_output=True,
        encoding=locale.getpreferredencoding(),
    )

    # Get target info
    for line in info_process.stderr.splitlines():
        print(line, file=sys.stderr)
    try:
        target_info = json.loads(info_process.stdout)
    except json.JSONDecodeError:
        print(
            "Bazel action failed. Command: //.bis/extractor:extract_target", file=sys.stderr)
    return target_info


def create_bis_build(args, target_info):
    def query_escape(str):
        return str.replace("+", "\+").replace("-", "\-")

    targets = f'"{args.target}"'
    pre_compile_targets = f'"{args.target}"'
    if not args.ignore_parsing_targets:
        aquery_args = [
            'bazel',
            'aquery',
            f"mnemonic('(Swift|Objc|Cpp)Compile', inputs('{query_escape(args.file_path)}', deps({args.target})))",
            '--output=jsonproto',
            '--include_artifacts=false',
            '--ui_event_filters=-info',
            '--noshow_progress',
            '--features=-layering_check'
        ]

        print("Run process start !!!")
        print("It may tooks a few minutes depends on the size of target")
        print(f"command = {' '.join(aquery_args)}")

        aquery_process = subprocess.run(
            aquery_args,
            capture_output=True,
            encoding=locale.getpreferredencoding(),
        )

        print("Run process end !!!")

        for line in aquery_process.stderr.splitlines():
            print(line, file=sys.stderr)

        try:
            parsed_aquery_output = json.loads(
                aquery_process.stdout, object_hook=lambda d: types.SimpleNamespace(**d))
            if not hasattr(parsed_aquery_output, 'targets'):
                os._exit(ERR_NO_TARGET_FOUND)
            pre_compile_targets = ', '.join(
                [f'"{target.label}"' for target in parsed_aquery_output.targets])
        except json.JSONDecodeError:
            print("Bazel aquery failed. Command:",
                  aquery_args, file=sys.stderr)

    optionals = f'"--compilation_mode={args.compilation_mode} --cpu={args.cpu}"'
    refresh_rule = "refresh_compile_commands_ios_cfg" if target_info[
        "is_ios"] else "refresh_compile_commands"
    minimum_os_version_string = f'minimum_os_version = "{target_info["minimum_os_version"]}",' if target_info["is_ios"] else ""

    template = f"""
load("@bis//:refresh_compile_commands.bzl", "refresh_compile_commands")
load("@bis//:refresh_compile_commands.bzl", "refresh_compile_commands_ios_cfg")
load("@bis//:refresh_launch_json.bzl", "refresh_launch_json")

{refresh_rule}(
  name = "refresh_compile_commands",
  targets = [
    {targets}
  ],
  pre_compile_targets = [
    {pre_compile_targets}
  ],
  optionals = {optionals},
  file_path = "{args.file_path}",
  {minimum_os_version_string}
  pre_compile_swift_module = {args.pre_compile_swift_module},
  tags = ["manual"],
  testonly = True,
)

refresh_launch_json(
  name = "refresh_launch_json",
  target = "{args.target}",
  tags = ["manual"],
  testonly = True,
)

"""
    Path(".bis").mkdir(parents=True, exist_ok=True)
    with open('.bis/BUILD', 'w') as output_file:
        output_file.write(template)


# main
parser = argparse.ArgumentParser(description='Setup bis project')

parser.add_argument('--compilation_mode', default='dbg',
                    type=str, help='dbg or opt')
parser.add_argument('--cpu', default='', type=str, help='ios_arm64')
parser.add_argument('--target', required=True, type=str, help='target labels')
parser.add_argument('--file_path', default='.*',
                    type=str, help='source code path')
parser.add_argument('--pre_compile_swift_module', default=True,
                    type=str2bool, help='pre compile swift module')
parser.add_argument('--ignore_parsing_targets', default=False, type=str2bool,
                    help='ignoring parsing targets phase just pass --target to targets in `refresh_compile_commands`')

args = parser.parse_args()

os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])

target_info = get_target_info(args)
create_bis_build(args, target_info)
