from pymobiledevice3.remote.remote_service_discovery import RemoteServiceDiscoveryService
import asyncio, click, logging, json

logger = logging.getLogger(__name__)

try:
    from pymobiledevice3.remote.core_device_tunnel_service import start_quic_tunnel
except ImportError:
    start_quic_tunnel = None
    logger.warning(
        'start_quic_tunnel failed to be imported. Some feature may not work.\n'
        'You can debug this by trying the import yourself:\n\n'
        'from pymobiledevice3.remote.core_device_tunnel_service import create_core_device_tunnel_service')

async def tunnel_task(service_provider: RemoteServiceDiscoveryService) -> None:
    if start_quic_tunnel is None:
        raise NotImplementedError('failed to start the QUIC tunnel on your platform')

    async with start_quic_tunnel(service_provider, secrets=None) as tunnel_result:
        result = {'host': tunnel_result.address, 'port': tunnel_result.port}
        click.echo(json.dumps(result))

        while True:
            # wait user input while the asyncio tasks execute
            await asyncio.sleep(.5)