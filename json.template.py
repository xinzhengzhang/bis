#!/usr/bin/env python3

import os
import os.path
from pathlib import Path

# root path of workspace
# os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])
workspace_path = os.environ["BUILD_WORKSPACE_DIRECTORY"]

# cd workspace root
os.chdir(workspace_path)

# .vscode config
Path(".vscode").mkdir(parents=True, exist_ok=True)

with open(".vscode/%config_name%.json", "w") as fd:
    fd.write("""%json_items%
""")