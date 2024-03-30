from parameter_decorators import str_to_path
from pathlib import Path
from pymobiledevice3.exceptions import AppInstallError
from pymobiledevice3.lockdown import LockdownClient
from pymobiledevice3.lockdown_service_provider import LockdownServiceProvider
from pymobiledevice3.services.afc import AfcService
from pymobiledevice3.services.lockdown_service import LockdownService
from tempfile import TemporaryDirectory
from typing import Callable, List, Mapping
from zipfile import ZIP_DEFLATED, ZipFile
import click, os, json, posixpath

GET_APPS_ADDITIONAL_INFO = {'ReturnAttributes': ['CFBundleIdentifier', 'StaticDiskUsage', 'DynamicDiskUsage']}

TEMP_REMOTE_IPA_FILE = '/pymobiledevice3.ipa'

def create_ipa_contents_from_directory(directory: str) -> bytes:
    payload_prefix = 'Payload/' + os.path.basename(directory)
    with TemporaryDirectory() as temp_dir:
        zip_path = Path(temp_dir) / 'ipa'
        with ZipFile(zip_path, 'w', ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(directory):
                for file in files:
                    full_path = Path(root) / file
                    full_path.touch()
                    zip_file.write(full_path,
                                   arcname=f'{payload_prefix}/{os.path.relpath(full_path, directory)}')
        return zip_path.read_bytes()

class SimplifiedInstallationProxyService(LockdownService):
    SERVICE_NAME = 'com.apple.mobile.installation_proxy'
    RSD_SERVICE_NAME = 'com.apple.mobile.installation_proxy.shim.remote'

    def __init__(self, lockdown: LockdownServiceProvider):
        if isinstance(lockdown, LockdownClient):
            super().__init__(lockdown, self.SERVICE_NAME)
        else:
            super().__init__(lockdown, self.RSD_SERVICE_NAME)

    def upgrade(self, ipa_path: str, options: Mapping = None, handler: Callable = None, *args) -> None:
        """ upgrade given ipa from device path """
        self.install_from_local(ipa_path, 'Upgrade', options, handler, args)

    @str_to_path('ipa_or_app_path')
    def install_from_local(self, ipa_or_app_path: Path, cmd='Install', options: Mapping = None, handler: Callable = None,
                           *args) -> None:
        """ upload given ipa onto device and install it """
        if options is None:
            options = {}
        if ipa_or_app_path.is_dir():
            # treat as app, convert into an ipa
            ipa_contents = create_ipa_contents_from_directory(str(ipa_or_app_path))
        else:
            # treat as ipa
            ipa_contents = ipa_or_app_path.read_bytes()

        with AfcService(self.lockdown) as afc:
            afc.set_file_contents(TEMP_REMOTE_IPA_FILE, ipa_contents)
        self.service.send_plist({
            'Command': cmd,
            'ClientOptions': options,
            'PackagePath': TEMP_REMOTE_IPA_FILE
        })
        while True:
            response = self.service.recv_plist()
            if not response:
                break
            click.echo(json.dumps({"code": 0, "data": response}))
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