#!/usr/bin/env python3

import os
import os.path
from subprocess import call
from pathlib import Path

# root path of workspace
# os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])
workspace_path = os.environ["BUILD_WORKSPACE_DIRECTORY"]
# extractor path
extractor_path="%python_sources%"
# get relative path for extractor_path based workspace
relative_path=os.path.relpath(extractor_path, workspace_path)

# cd workspace root
os.chdir(workspace_path)

# generate files based worksapce root
# -----------------------------------
# compile_commands.json
# python3 "${relative_path}" 
call(["python3", relative_path])

# .vscode config
Path(".vscode").mkdir(parents=True, exist_ok=True)

with open(".vscode/launch.json", "w") as fd:
    fd.write("""%launch_items%
""")
