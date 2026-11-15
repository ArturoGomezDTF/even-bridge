# Even Bridge

Mini agente headless (Node, sin Electron ni POS) para sucursales sin PC ni
Soft Restaurant. Corre en una Raspberry Pi en la red local y **solo imprime**:
recibe `print_job` del backend de Even por WebSocket y los manda por ESC/POS
a impresoras de red (TCP 9100) o USB (`/dev/usb/lpN`). Even Crew funciona como
mini POS para los empleados; el bridge es su salida de impresión.

## Flujo

1. El bridge se conecta a `<backendUrl>/bridge` y emite `register {branchId, token, version}`.
2. El backend responde `register_ack` y `printers_config` (tabla `branch_printers`, la misma que ya edita Crew/portal).
3. El backend emite `print_job` (items ya con `clasificacion`); el bridge reparte por rol (cocina/barra/otros/all), imprime y emite `print_job_ack {jobId}`.
4. Sin ACK (falla de impresora, sin impresoras configuradas) el backend reintenta desde `print_job_queue`.

Requiere la ruta "bridge" de `even-backend` (namespace `/bridge`, tabla `branch_bridges`).

## Configuración

`config.json` (ver `config.example.json`) o variables `EVEN_BACKEND_URL`, `EVEN_BRANCH_ID`, `EVEN_BRIDGE_TOKEN`.
El token se genera con `node scripts/create-bridge.js <branch_id>` en even-backend (provisional).

## Raspberry Pi

Hardware sugerido: Pi 3/4 (o Zero 2 W) 1–2 GB, microSD A1, fuente oficial, Ethernet preferible.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs
sudo useradd -r -m even && sudo usermod -aG lp even
sudo git clone <repo> /opt/even-bridge && cd /opt/even-bridge && sudo npm ci --omit=dev
sudo mkdir /etc/even-bridge && sudo cp config.example.json /etc/even-bridge/config.json   # editar
sudo cp deploy/even-bridge.service /etc/systemd/system/ && sudo systemctl enable --now even-bridge
journalctl -u even-bridge -f
```

Impresoras USB: en `branch_printers` usar `connection_type='usb'` y `usb_device_name='/dev/usb/lp0'`.

## Pendiente (siguientes iteraciones)

- Emparejamiento por código/QR en lugar de token manual.
- Escaneo de impresoras (`scan_printers`) y reporte de USB al backend.
- Logo en el ticket, ticket de pago, auto-actualización, imagen de Pi.

## Tests

`npm test` (node:test, sin dependencias extra).
