from pymobiledevice3.exceptions import AppInstallError
from pymobiledevice3.lockdown import LockdownClient
from pymobiledevice3.services.afc import AfcService
from pymobiledevice3.services.lockdown_service import LockdownService
from typing import Callable, List, Mapping
import click, os, json, posixpath

GET_APPS_ADDITIONAL_INFO = {'ReturnAttributes': ['CFBundleIdentifier', 'StaticDiskUsage', 'DynamicDiskUsage']}

class SimplifiedInstallationProxyService(LockdownService):
    SERVICE_NAME = 'com.apple.mobile.installation_proxy'
    RSD_SERVICE_NAME = 'com.apple.mobile.installation_proxy.shim.remote'

    def __init__(self, lockdown: LockdownClient):
        if isinstance(lockdown, LockdownClient):
            super().__init__(lockdown, self.SERVICE_NAME)
        else:
            super().__init__(lockdown, self.RSD_SERVICE_NAME)

    def _watch_completion(self, handler: Callable = None, *args) -> None:
        while True:
            response = self.service.recv_plist()
            if not response:
                break
            error = response.get('Error')
            if error:
                raise AppInstallError(f'{error}: {response.get("ErrorDescription")}')
            completion = response.get('PercentComplete')
            if completion:
                if handler:
                    self.logger.debug('calling handler')
                    handler(completion, *args)
                self.logger.info(f'{response.get("PercentComplete")}% Complete')
            if response.get('Status') == 'Complete':
                return
        raise AppInstallError()

    def upgrade(self, ipa_path: str, options: Mapping = None, handler: Callable = None, *args) -> None:
        """ upgrade given ipa from device path """
        self.install_from_local(ipa_path, 'Upgrade', options, handler, args)

    def install_from_local(self, ipa_path: str, cmd='Install', options: Mapping = None, handler: Callable = None,
                           *args) -> None:
        """ upload given ipa onto device and install it """
        if options is None:
            options = {"PackageType": "Developer"}
        remote_path = posixpath.join('/', os.path.basename(ipa_path))
        with AfcService(self.lockdown) as afc:
            afc.set_file_contents(remote_path, open(ipa_path, 'rb').read())
        cmd = {'Command': cmd,
               'ClientOptions': options,
               'PackagePath': remote_path}
        self.service.send_plist(cmd)
        while True:
            response = self.service.recv_plist()
            if not response:
                break
            click.echo(json.dumps(response))
            error = response.get('Error')
            if error:
                raise AppInstallError(f'{error}: {response.get("ErrorDescription")}')
            if response.get('Status') == 'Complete':
                return
        raise AppInstallError()

    def lookup(self, options: Mapping = None) -> Mapping:
        """ search installation database """
        if options is None:
            options = {}
        cmd = {'Command': 'Lookup', 'ClientOptions': options}
        return self.service.send_recv_plist(cmd).get('LookupResult')

    def get_apps(self, app_types: List[str] = None) -> Mapping[str, Mapping]:
        """ get applications according to given criteria """
        result = self.lookup()
        # query for additional info
        additional_info = self.lookup(GET_APPS_ADDITIONAL_INFO)
        for bundle_identifier, app in additional_info.items():
            result[bundle_identifier].update(app)
        # filter results
        filtered_result = {}
        for bundle_identifier, app in result.items():
            if (app_types is None) or (app['ApplicationType'] in app_types):
                filtered_result[bundle_identifier] = app
        return filtered_result