import asyncio, click, json, re
from packaging.version import Version
from pymobiledevice3.exceptions import NoDeviceConnectedError
from pymobiledevice3.cli.cli_common import Command
from pymobiledevice3.cli.remote import get_device_list
from pymobiledevice3.lockdown import create_using_usbmux, LockdownClient
from pymobiledevice3.tcp_forwarder import LockdownTcpForwarder
from pymobiledevice3.usbmux import list_devices
from installationProxyService import SimplifiedInstallationProxyService
from typing import Optional
from untils import tunnel_task
from pymobiledevice3.remote.module_imports import MAX_IDLE_TIMEOUT, start_tunnel, verify_tunnel_imports
from functools import partial
from pymobiledevice3.tunneld import TunneldRunner
from pymobiledevice3.remote.utils import TUNNELD_DEFAULT_ADDRESS, stop_remoted
from pymobiledevice3.remote.common import TunnelProtocol
import tempfile
from pymobiledevice3.remote.remote_service_discovery import RemoteServiceDiscoveryService

DEBUGSERVER_CONNECTION_STEPS = '''
Follow the following connections steps from LLDB:

(lldb) platform select remote-ios
(lldb) target create /path/to/local/application.app
(lldb) script lldb.target.module[0].SetPlatformFileSpec(lldb.SBFileSpec('/private/var/containers/Bundle/Application/<APP-UUID>/application.app'))
(lldb) process connect connect://[{host}]:{port}   <-- ACTUAL CONNECTION DETAILS!
(lldb) process launch
'''

def pymobiledevice3_version():
    with open('pymobiledevice_version.bzl', 'r') as f:
        file_content = f.read()
        pattern = r'PYMOBILEDEVICE3_VERSION = "([0-9.]+)"'
        match = re.search(pattern, file_content)
        version = match.group(1) if match else "Version not found"
    return version

@click.group(help=f'pymobiledevicelite cli, based on pymobiledevice3({pymobiledevice3_version()})')
def cli():
    pass

@click.command()
def list_device():
  """ list connected devices """
  connected_devices = []
  for device in list_devices():
      udid = device.serial

      lockdown = create_using_usbmux(udid, autopair=False, connection_type=device.connection_type)
      connected_devices.append(lockdown.short_info)
  json_str = json.dumps(connected_devices)
  click.echo(json_str)

@click.command(cls=Command)
@click.argument('app_path', type=click.Path(exists=True))
def install_app(service_provider: LockdownClient, app_path: str):
   """ install application from the specific path """
   proxyService = SimplifiedInstallationProxyService(lockdown=service_provider)
   proxyService.install_from_local(app_path)

@click.command(cls=Command)
@click.argument('local_port', type=click.INT, required=False)
def debug_server(service_provider: LockdownClient, local_port: Optional[int] = None):
    """
    if local_port is provided, start a debugserver at remote listening on a given port locally.
    if local_port is not provided and iOS version >= 17.0 then just print the connect string

    Please note the connection must be done soon afterwards using your own lldb client.
    This can be done using the following commands within lldb shell:

    (lldb) platform select remote-ios

    (lldb) platform connect connect://localhost:<local_port>
    """

    if Version(service_provider.product_version) < Version('17.0'):
        service_name = 'com.apple.debugserver.DVTSecureSocketProxy'
    else:
        service_name = 'com.apple.internal.dt.remote.debugproxy'

    if local_port is not None:
        click.echo(json.dumps({"host": '127.0.0.1', "port": local_port}))
        LockdownTcpForwarder(service_provider, local_port, service_name).start()
    elif Version(service_provider.product_version) >= Version('17.0'):
        if not isinstance(service_provider, RemoteServiceDiscoveryService):
            raise RSDRequiredError()
        debugserver_port = service_provider.get_service_port(service_name)
        print(DEBUGSERVER_CONNECTION_STEPS.format(host=service_provider.service.address[0], port=debugserver_port))
        click.echo(json.dumps({"host": service_provider.service.address[0], "port": debugserver_port}))
    else:
        click.BadOptionUsage('--local_port', 'local_port is required for iOS < 17.0')

@click.command()
def tunneld():
    """ Start Tunneld service for remote tunneling """
    host = '127.0.0.1'
    port = 5555
    if not verify_tunnel_imports():
        return
    tunneld_runner = partial(TunneldRunner.create, host, port, TunnelProtocol.QUIC)
    try:
        from daemonize import Daemonize
    except ImportError:
        raise NotImplementedError('daemonizing is only supported on unix platforms')
    with tempfile.NamedTemporaryFile('wt') as pid_file:
        daemon = Daemonize(app=f'Tunneld {host}:{port}', pid=pid_file.name,
                            action=tunneld_runner)
        click.echo(json.dumps({"host": host, "port": port}))
        daemon.start()

cli.add_command(list_device)
cli.add_command(install_app)
cli.add_command(debug_server)
cli.add_command(installed_app_path)
cli.add_command(tunneld)

if __name__ == '__main__':
  cli()