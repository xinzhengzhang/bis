import sys, click, json, re
from io import StringIO
from functools import partial
from installationProxyService import SimplifiedInstallationProxyService
from packaging.version import Version
from pymobiledevice3.cli.cli_common import Command, RSDCommand
from pymobiledevice3.exceptions import *
from pymobiledevice3.exceptions import AppInstallError
from pymobiledevice3.lockdown import create_using_usbmux, LockdownClient
from pymobiledevice3.tcp_forwarder import LockdownTcpForwarder
from pymobiledevice3.tunneld import TunneldRunner
from pymobiledevice3.remote.common import TunnelProtocol
from pymobiledevice3.remote.module_imports import verify_tunnel_imports
from pymobiledevice3.remote.remote_service_discovery import RemoteServiceDiscoveryService
from pymobiledevice3.usbmux import list_devices
from typing import Optional

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
  json_str = json.dumps({"code": 0, "data": connected_devices})
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
    This can be done using the following commands within lldb shell.
    """
    if Version(service_provider.product_version) < Version('17.0'):
        service_name = 'com.apple.debugserver.DVTSecureSocketProxy'
    else:
        service_name = 'com.apple.internal.dt.remote.debugproxy'

    if local_port is not None:
        click.echo(json.dumps({"code": 0, "data": {"host": '127.0.0.1', "port": local_port}}))
        LockdownTcpForwarder(service_provider, local_port, service_name).start()
    elif Version(service_provider.product_version) >= Version('17.0'):
        debugserver_port = service_provider.get_service_port(service_name)
        click.echo(json.dumps({"code": 0, "data": {"host": service_provider.service.address[0], "port": debugserver_port, "usage": DEBUGSERVER_CONNECTION_STEPS.format(host=service_provider.service.address[0], port=debugserver_port)}}))
    else:
        click.echo(json.dump({"code": -998, "message": "local_port is required for iOS < 17.0"}))

@click.command(cls=Command)
def installed_app_path(service_provider: LockdownClient):
    """ get installed app path """
    result = SimplifiedInstallationProxyService(service_provider).get_apps(['User'])
    click.echo(json.dumps({"code": 0, "data": result}))

@click.command()
@click.option('--host', default='127.0.0.1')
@click.option('--port', type=click.INT, default=5555)
@click.option('--pid_file', default='/tmp/bis_pymobieldevicelite.pid')
def tunneld(host: str, port: int, pid_file: str):
    """ Start Tunneld service for remote tunneling """
    if not verify_tunnel_imports():
        return
    tunneld_runner = partial(TunneldRunner.create, host, port, TunnelProtocol.QUIC)
    try:
        from daemonize import Daemonize
    except ImportError:
        raise NotImplementedError('daemonizing is only supported on unix platforms')
    daemon = Daemonize(
        app=f'Tunneld {host}:{port}',
        pid=pid_file,
        action=tunneld_runner
    )
    code = 0
    message = ""
    try:
        captured_output = StringIO()
        original_stdout = sys.stdout
        sys.stdout = captured_output
        daemon.start()
    except SystemExit as e:
        code = e.code
    finally:
        message = captured_output.getvalue()
        sys.stdout = original_stdout
        click.echo(json.dumps({"code": 0, "data": {"host": host, "port": port, "pid": pid_file, "message": message, "code": code}}))

@click.command(cls=RSDCommand)
def rsd_info(service_provider: RemoteServiceDiscoveryService):
    """ show info extracted from RSD peer """
    host = service_provider.service.address[0]
    port = service_provider.service.address[1]
    click.echo(json.dumps({"code": 0, "data": {"host": host, "port": port}}))

cli.add_command(list_device)
cli.add_command(install_app)
cli.add_command(debug_server)
cli.add_command(installed_app_path)
cli.add_command(tunneld)
cli.add_command(rsd_info)

if __name__ == '__main__':
    try:
        cli()
    except NoDeviceConnectedError as e:
        click.echo(json.dumps({"code": 100, "message": "No device connected"}))
    except DeviceNotFoundError as e:
        click.echo(json.dumps({"code": 100, "message": f"Device Not Found: {e.udid}"}))
    except AppInstallError as e:
        click.echo(json.dumps({"code": 100, "message": f"App Install Error: {e.args}"}))
    except TunneldConnectionError as e:
        click.echo(json.dumps({"code": 100, "message": "Tunneld Connect Failed"}))
    except PasswordRequiredError as e:
        click.echo(json.dumps({"code": 100, "message": "Device is locked"}))
    except DeveloperModeError as e:
        click.echo(json.dumps({"code": 100, "message": "amfid failed to enable developer mode"}))
    except DeveloperModeIsNotEnabledError as e:
        click.echo(json.dumps({"code": 100, "message": "Developer mode is not enabled"}))
    except NotTrustedError as e:
        click.echo(json.dumps({"code": 100, "message": "Device is not trusted"}))
    except PyMobileDevice3Exception as e:
        click.echo(json.dumps({"code": 100, "message": f"PyMobileDevice3Exception: {type(e).__name__}"}))
    except OSError as e:
        click.echo(json.dumps({"code": e.errno, "message": f"OSError: {e.strerror}"}))
    except Exception as e:
        click.echo(json.dumps({"code": 999, "message": f"Unknown Error: {type(e).__name__}"}))