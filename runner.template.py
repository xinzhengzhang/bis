#!/usr/bin/env python3

import os
import os.path
from subprocess import call
from pathlib import Path
import argparse
import tempfile
import uuid
import shutil
import json

# root path of workspace
# os.chdir(os.environ["BUILD_WORKSPACE_DIRECTORY"])
workspace_path = os.environ["BUILD_WORKSPACE_DIRECTORY"]
# extractor path
extractor_path="%python_sources%"
# get relative path for extractor_path based workspace
relative_path=os.path.relpath(extractor_path, workspace_path)

# cd workspace root
os.chdir(workspace_path)

parser = argparse.ArgumentParser(description='refresh_compile_commands')
parser.add_argument('--merge', action=argparse.BooleanOptionalAction, default = False)
args = parser.parse_args()

if args.merge and os.path.isfile('compile_commands.json'):
    with tempfile.TemporaryDirectory() as tmpdirname:
        dst = tmpdirname + "/" + str(uuid.uuid4())
        shutil.copyfile('compile_commands.json', dst)

        # generate files based worksapce root
        # -----------------------------------
        # compile_commands.json
        # python3 "${relative_path}"
        call(["python3", relative_path])

        f1 = open('compile_commands.json')
        f2 = open(dst)

        result1 = []
        result2 = []
        try:
            result1 = json.load(f1)
            result2 = json.load(f2)
        except:
            print("Seem the compile_commands.json has broken")

        f1.close()
        f2.close()

        index = set([i["file"] for i in result1])
        filterd = [entry for entry in result2 if entry["file"] not in index]

        with open('compile_commands.json', 'w') as output_file:
            json.dump(
                result1 + filterd,
                output_file,
                indent=2, # Yay, human readability!
                check_circular=False # For speed.
            )
else:
    call(["python3", relative_path])
