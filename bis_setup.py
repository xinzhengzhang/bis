#!/usr/bin/env python3

import os
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description='Setup bis project')

parser.add_argument('--compilation_mode', default = 'dbg', type = str, help='dbg or opt')
parser.add_argument('--cpu', default = '', type = str, help='ios_arm64')
parser.add_argument('--pre_compile_swift_module', default = True, type = bool, help='pre compile swift module')
parser.add_argument('--targets', nargs= '+', default = [], help='target labels')

args = parser.parse_args()

targets = ', '.join([f'"{target}"' for target in args.targets])
optionals = f'"--compilation_mode={args.compilation_mode} --cpu={args.cpu}"'

template = f"""
load("@bis//:bis.bzl", "bis_proj")

bis_proj(
	name = "bis_proj",
	targets = [
		{targets}
	],
	optionals = {optionals},
	pre_compile_swift_module = {args.pre_compile_swift_module},
	tags = ["manual"],
)
"""

os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])
Path(".vscode").mkdir(parents=True, exist_ok=True)
Path(".bis").mkdir(parents=True, exist_ok=True)

with open(".vscode/tasks.json", "w") as fd:
    fd.write("""// See https://go.microsoft.com/fwlink/?LinkId=733558
// for the documentation about the tasks.json format
{
	"version": "2.0.0",
	"tasks": [
    {
      "label": "Build",
      "type": "process",
      "command": "bazel",
      "args": [
        "build",
        "${command:zxz-moe-bis.buildTarget}",
        "--cpu=${command:zxz-moe-bis.cpu}",
        "--compilation_mode=${command:zxz-moe-bis.compilationMode}"
      ],
      "group": {
        "kind":  "build",
      },
    },
    {
      "label": "RefreshIndex",
      "type": "process",
      "command": "bazel",
      "args": [
        "run",
        "//.bis:bis_proj",
        "--cpu=${command:zxz-moe-bis.cpu}",
        "--compilation_mode=${command:zxz-moe-bis.compilationMode}"
      ],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "dependsOn": ["SetupProj"],
      "runOptions": {
        "runOn": "folderOpen"
      }
    },
    {
      "label": "SetupProj",
      "type": "process",
      "command": "bazel",
      "args": [
        "run",
        "@bis//:setup",
        "--",
        "--cpu",
        "${command:zxz-moe-bis.cpu}",
        "--compilation_mode",
        "${command:zxz-moe-bis.compilationMode}",
        "--pre_compile_swift_module",
        "${input:pre_compile_swift_module}",
        "--targets",
        "${command:zxz-moe-bis.buildTarget}"
      ],
      "group": {
        "kind": "build",
      },
  }
  ],
    "inputs": [
        {
            "type": "pickString",
            "id": "pre_compile_swift_module",
            "description": "Do you want to pre compile swift? (It will slow the indexing phase and you can write swift module without compile)",
            "options": [
              "True",
              "False",
            ],
            "default": "True"
        }
    ]
}
""")

with open('.bis/BUILD', 'w') as output_file:
    output_file.write(template)