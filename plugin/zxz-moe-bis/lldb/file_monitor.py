#!/usr/bin/env python
# -*- coding: utf-8 -*-

import lldb
import os
import sys
import optparse
import shlex
import threading
import time

class FileMonitor:
    """Class to monitor a file for changes and print updates to LLDB"""
    
    def __init__(self, filename, result):
        self.filename = filename
        self.result = result
        self.last_position = 0
        self.running = False
        self.thread = None
    
    def start_monitoring(self):
        """Start monitoring the file in a separate thread"""
        self.running = True
        self.thread = threading.Thread(target=self._monitor_file)
        self.thread.daemon = True
        self.thread.start()
        
    def stop_monitoring(self):
        """Stop the file monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
    
    def _monitor_file(self):
        """Monitor the file for changes and print new content"""
        try:
            # Get initial file size
            if os.path.exists(self.filename):
                self.last_position = os.path.getsize(self.filename)
            else:
                self.result.Print(f"Waiting for file {self.filename} to be created...\n")
            self.result.SetImmediateOutputFile(sys.stdout)
            while self.running:
                self.result.flush()
                # self.result.Clear()
                if not os.path.exists(self.filename):
                    time.sleep(0.5)
                    continue
                    
                # Get current file size
                current_size = os.path.getsize(self.filename)
                
                # If file has new content
                if current_size > self.last_position:
                    with open(self.filename, 'r') as file:
                        # Move to the last read position
                        file.seek(self.last_position)
                        # Read new content
                        new_content = file.read()
                        
                    self.result.Print(f"{new_content.rstrip()}\n")

                    # Update last position
                    self.last_position = current_size
                
                # Sleep to avoid high CPU usage
                time.sleep(0.1)
                
        except Exception as e:
            self.result.Print(f"Error monitoring file: {str(e)}\n")
            self.running = False

def create_options():
    """Create the command options"""
    usage = "usage: %prog filename"
    parser = optparse.OptionParser(usage=usage)
                      
    return parser

# Dictionary to store active file monitors
active_monitors = {}

def monitor_file_command(debugger, command, result, internal_dict):
    """
    LLDB command function that monitors a file for changes and prints new content.
    Syntax: monitor_file <filename>
    """
    # Parse the command arguments
    command_args = shlex.split(command)
    parser = create_options()
    
    try:
        (options, args) = parser.parse_args(command_args)
        
        if len(args) != 1:
            result.SetError("Please provide a filename to monitor.")
            return
            
        filename = args[0]
            
        # Check if already monitoring this file
        if filename in active_monitors:
            result.Print(f"Already monitoring {filename}. Stopping previous monitor. \n")
            active_monitors[filename].stop_monitoring()
            
        # Start new monitor
        result.Print(f"Starting to monitor {filename}...\n") 
        monitor = FileMonitor(filename, result)
        monitor.start_monitoring()
        active_monitors[filename] = monitor
        
    except Exception as e:
        result.SetError(f"Command error: {str(e)}")

def stop_monitor_command(debugger, command, result, internal_dict):
    """Stop monitoring a specific file or all files"""
    command_args = shlex.split(command)
    
    if len(command_args) == 0:
        # Stop all monitors
        for filename, monitor in list(active_monitors.items()):
            monitor.stop_monitoring()
            del active_monitors[filename]
            result.Print(f"Stopped monitoring {filename}\n")
        
        if not active_monitors:
            result.Print("No active file monitors to stop.\n")
    else:
        # Stop specific monitor
        filename = command_args[0]
        if filename in active_monitors:
            active_monitors[filename].stop_monitoring()
            del active_monitors[filename]
            result.Print(f"Stopped monitoring {filename}\n")
        else:
            result.SetError(f"Not monitoring {filename}")

def list_monitors_command(debugger, command, result, internal_dict):
    """List all active file monitors"""
    if not active_monitors:
        result.Print("No active file monitors.\n")
    else:
        result.Print("Active file monitors:\n")
        for filename in active_monitors:
            result.Print(f"- {filename}\n")

def __lldb_init_module(debugger, internal_dict):
    """Initialize the LLDB module and add the custom commands"""
    # Add command help
    monitor_help = """
    monitor_file - Monitor a file for changes and print new content to LLDB console
    
    Syntax: monitor_file <filename>
    
    Examples:
        (lldb) monitor_file /path/to/log.txt
        (lldb) monitor_file /path/to/data.log
    """
    
    stop_help = """
    stop_monitor - Stop monitoring a file or all files
    
    Syntax: stop_monitor [filename]
    
    If filename is omitted, stops all active monitors.
    
    Examples:
        (lldb) stop_monitor
        (lldb) stop_monitor /path/to/log.txt
    """
    
    list_help = """
    list_monitors - List all active file monitors
    
    Syntax: list_monitors
    """
    
    debugger.HandleCommand(f'command script add -s asynchronous -h "{monitor_help}" -f file_monitor.monitor_file_command monitor_file')
    debugger.HandleCommand(f'command script add -s asynchronous -h "{stop_help}" -f file_monitor.stop_monitor_command stop_monitor')
    debugger.HandleCommand(f'command script add -s asynchronous -h "{list_help}" -f file_monitor.list_monitors_command list_monitors')
    
    print('The file monitoring commands have been installed:')
    print('  - monitor_file: Start monitoring a file')
    print('  - stop_monitor: Stop monitoring a file')
    print('  - list_monitors: List active monitors')

# For testing outside of LLDB
if __name__ == "__main__":
    print("This script is meant to be run from within LLDB.")
    print("Load it in LLDB with:")
    print("(lldb) command script import /path/to/file_monitor.py")