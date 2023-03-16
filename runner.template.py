#!/usr/bin/env python3

import os
from subprocess import call
import json

# root path of workspace
# os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])
workspace_path = os.environ["BUILD_WORKSPACE_DIRECTORY"]
# extractor path
extractor_path = "%python_sources%"
# get relative path for extractor_path based workspace
relative_path = os.path.relpath(extractor_path, workspace_path)

# cd workspace root
os.chdir(workspace_path)
call(["python3", relative_path, "--file=%filter_file_path%"])
