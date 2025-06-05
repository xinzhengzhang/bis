#!/usr/bin/env python3

import argparse
import json
import locale
import os
import subprocess
import sys
import types
import re

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


def create_bis_build(args):
    target = f'"{args.target}"'
    outputs_group_str = ""

    if not args.ignore_parsing_targets:
        target_statment = f'deps({args.target})'
        if args.subtarget:
            target_statment = f"{target_statment} intersect deps({args.subtarget})"
        if len(args.file_path) > 0:
            fname = re.escape(os.path.basename(args.file_path))
            target_statment = f"let v = {target_statment} in attr(hdrs, '{fname}', $v) + attr(srcs, '{fname}', $v)"

        aquery_args = [
            'bazel',
            'aquery',
            f"mnemonic('(Swift|Objc|Cpp)Compile', {target_statment})",
            '--output=jsonproto',
            '--include_artifacts=false',
            '--ui_event_filters=-info',
            '--noshow_progress',
        ] + args.optionals.split()

        print("Start generating .bis/BUILD")
        print(f"Start query command = {' '.join(aquery_args)}", flush=True)

        aquery_process = subprocess.run(
            aquery_args,
            capture_output=True,
            encoding=locale.getpreferredencoding(),
            check=False
        )

        for line in aquery_process.stderr.splitlines():
            print(line, file=sys.stderr)

        try:
            parsed_aquery_output = json.loads(
                aquery_process.stdout, object_hook=lambda d: types.SimpleNamespace(**d))
            if not hasattr(parsed_aquery_output, 'targets'):
                print("No target found", file=sys.stderr)
                os._exit(ERR_NO_TARGET_FOUND)

            def label_transfer(label):
                result = [label]
                if label.startswith('@@'):
                    pass
                elif label.startswith('//'):
                    # Compatibility for old Bazel
                    result.append(label.replace('//','@//', 1))
                    result.append(label.replace('//', '@@//', 1))
                elif label.startswith('@//'):
                    # Compatibility for old Bazel
                    result.append(label.replace('@//', '@@//', 1))
                elif label.startswith('@'):
                    result.append(label.replace('@', '@@', 1))
                return result

            flat_targets = [target for target in parsed_aquery_output.targets for target in label_transfer(target.label)]
            outputs_group_str = ','.join(
                [f"bis all index dependents {target}" for target in flat_targets])

        except json.JSONDecodeError:
            print("Bazel aquery failed. Command:",
                  aquery_args, file=sys.stderr)
        print(f"End query", flush=True)

    template = f"""
load("@bis//:refresh_compile_commands.bzl", "refresh_compile_commands")
load("@bis//:refresh_launch_json.bzl", "refresh_launch_json")
refresh_compile_commands(
  name = "refresh_compile_commands",
  targets = [
    {target}
  ],
  exclude_headers = "all",
  optionals = "{args.optionals}",
  tags = ["manual"],
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
    if not args.ignore_parsing_targets:
        cmd = f'bazel build {target} {args.optionals} --aspects=@bis//:bisproject_aspect.bzl%bis_aspect --output_groups="{outputs_group_str}"'
        
        print(f"Start build command = {cmd}", flush=True)
        process = subprocess.run(cmd, shell=True, encoding=locale.getpreferredencoding(), check=False)
        print(f"End build", flush=True)
    
        cmd = f"bazel run //.bis:refresh_compile_commands {args.optionals}"
        if len(args.file_path) > 0:
            cmd += f" -- --file={args.file_path}"
        elif len(args.subtarget) > 0:
            cmd += f" -- --subtarget={args.subtarget}"
        print(f"Start refresh_compile_commands command = {cmd}", flush=True)
        pricess = subprocess.run(cmd, shell=True, encoding=locale.getpreferredencoding(), check=False)
        print(f"End refresh_compile_commands", flush=True)


# main
parser = argparse.ArgumentParser(description='Setup bis project')

parser.add_argument('--optionals', default='',
                    type=str, help='--compilation_mode=dbg --cpu=ios_x86_64')
parser.add_argument('--target', required=True, type=str, help='target labels')
parser.add_argument('--subtarget', default='', type=str, help='subtarget label')
parser.add_argument('--file_path', default='',
                    type=str, help='source code path')
parser.add_argument('--ignore_parsing_targets', default=False, type=str2bool,
                    help='skip searching compile targets')

args = parser.parse_args()

os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])

create_bis_build(args)
