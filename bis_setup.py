#!/usr/bin/env python3

import argparse
import subprocess
import json
import types
import locale
import os
import sys

from pathlib import Path

def str2bool(v):
    if isinstance(v, bool):
        return v
    if v.lower() in ('yes', 'true', 't', 'y', '1'):
        return True
    elif v.lower() in ('no', 'false', 'f', 'n', '0'):
        return False
    else:
        raise argparse.ArgumentTypeError('Boolean value expected.')

parser = argparse.ArgumentParser(description='Setup bis project')

parser.add_argument('--compilation_mode', default = 'dbg', type = str, help='dbg or opt')
parser.add_argument('--cpu', default = '', type = str, help='ios_arm64')
parser.add_argument('--target', required=True, type = str, help='target labels')
parser.add_argument('--file_path', default = '.*', type = str, help='source code path')
parser.add_argument('--pre_compile_swift_module', default = True, type = str2bool, help='pre compile swift module')


args = parser.parse_args()

aquery_args = [
  'bazel',
  'aquery',
  f"mnemonic('(Swift|Objc|Cpp)Compile', inputs({args.file_path}, deps({args.target})))",
  '--output=jsonproto',
  '--include_artifacts=false',
  '--ui_event_filters=-info',
  '--noshow_progress',
  # Disable layering_check during, because it causes large-scale dependence on generated module map files that prevent header extraction before their generation
      # For more context, see https://github.com/hedronvision/bazel-compile-commands-extractor/issues/83
      # If https://github.com/clangd/clangd/issues/123 is resolved and we're not doing header extraction, we could try removing this, checking that there aren't erroneous red squigglies squigglies before the module maps are generated.
      # If Bazel starts supporting modules (https://github.com/bazelbuild/bazel/issues/4005), we'll probably need to make changes that subsume this.
  '--features=-layering_check',
  f'--cpu={args.cpu}',
  f'--compilation_mode={args.compilation_mode}'
]

# process start
os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])

aquery_process = subprocess.run(
	aquery_args,
	capture_output= True,
	encoding=locale.getpreferredencoding(),
)

for line in aquery_process.stderr.splitlines():
	print(line, file=sys.stderr)

try:
  parsed_aquery_output = json.loads(aquery_process.stdout, object_hook=lambda d: types.SimpleNamespace(**d))
  if not hasattr(parsed_aquery_output, 'targets'):
    parsed_aquery_output.targets = []
except json.JSONDecodeError:
  print("Bazel aquery failed. Command:", aquery_args, file=sys.stderr)

targets = ', '.join([f'"{target.label}"' for target in parsed_aquery_output.targets])
optionals = f'"--compilation_mode={args.compilation_mode} --cpu={args.cpu}"'

template = f"""
load("@bis//:refresh_compile_commands.bzl", "refresh_compile_commands")
load("@bis//:refresh_launch_json.bzl", "refresh_launch_json")

refresh_compile_commands(
  name = "refresh_compile_commands",
  targets = [
    {targets}
  ],
  optionals = {optionals},
  file_path = "{args.file_path}",
  pre_compile_swift_module = {args.pre_compile_swift_module},
  tags = ["manual"],
)

refresh_launch_json(
  name = "refresh_launch_json",
  target = "{args.target}",
  tags = ["manual"],
)

"""

Path(".bis").mkdir(parents=True, exist_ok=True)

with open('.bis/BUILD', 'w') as output_file:
    output_file.write(template)
