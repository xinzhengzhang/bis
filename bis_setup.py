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
        "${input:target}",
        "--cpu=${input:cpu}",
        "--compilation_mode=${input:compilation_mode}"
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
        "--cpu=${input:cpu}",
        "--compilation_mode=${input:compilation_mode}"
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
        "${input:cpu}",
        "--compilation_mode",
        "${input:compilation_mode}",
        "--pre_compile_swift_module",
        "${input:pre_compile_swift_module}",
        "--targets",
        "${input:target}"
      ],
      "group": {
        "kind": "build",
      },
  }
  ],
    "inputs": [
        {
          "type": "pickString",
          "id": "compilation_mode",
          "description": "What type of compilation_mode do you want?",
          "options": [
            "dbg",
            "opt",
          ],
          "default": "dbg"
        },
        {
            "type": "pickString",
            "id": "cpu",
            "description": "What type of cpu do you want? (Simulator: cpu = '', device: cpu = ios_arm64",
            "options": [
              "",
              "ios_arm64",
            ],
            "default": ""
        },
        {
            "type": "pickString",
            "id": "pre_compile_swift_module",
            "description": "Do you want to pre compile swift? (It will slow the indexing phase and you can write swift module without compile)",
            "options": [
              "True",
              "False",
            ],
            "default": "True"
        },
        {
          "type": "promptString",
          "id": "target",
          "description": "What target do you want build?",
        }
    ]
}
""")

with open('.bis/BUILD', 'w') as output_file:
    output_file.write(template)