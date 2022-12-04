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

def query_escape(str):
  return str.replace("+", "\+").replace("-", "\-")

parser = argparse.ArgumentParser(description='Setup bis project')

parser.add_argument('--compilation_mode', default = 'dbg', type = str, help='dbg or opt')
parser.add_argument('--cpu', default = '', type = str, help='ios_arm64')
parser.add_argument('--target', required=True, type = str, help='target labels')
parser.add_argument('--file_path', default = '.*', type = str, help='source code path')
parser.add_argument('--pre_compile_swift_module', default = True, type = str2bool, help='pre compile swift module')

args = parser.parse_args()

optionals = f'"--compilation_mode={args.compilation_mode} --cpu={args.cpu}"'

template = f"""
load("@bis//:refresh_compile_commands.bzl", "refresh_compile_commands")
load("@bis//:refresh_launch_json.bzl", "refresh_launch_json")

refresh_compile_commands(
  name = "refresh_compile_commands",
  targets = [
    "{args.target}"
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
