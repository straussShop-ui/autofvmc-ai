# AutoFVMC AI

AutoFVMC AI is a desktop-oriented commissioning console for iSMA QTQP controllers used in VAV and fan-powered-box applications.

## Current scope

- BACnet/IP and BACnet MS/TP transport selection
- Model-neutral BACnet controller profile with QTQP as the default example
- Point mapping status for zone temperature, setpoint, airflow, and damper command
- Guided commissioning checklist for sensor zero and airflow balancing
- FPB controller readiness view
- AI review panel as an advisory layer; controller writes require an authenticated session
- Engineering sequence upload with temperature, airflow, humidity, damper, fan, and reheat settings
- English programming-procedure PDF upload with protected AI interpretation and engineer confirmation
- Firmware package staging with configuration backup and model/maintenance approval checks
- Help Center troubleshooting chat for HVAC controls, electrical systems, Ethernet/IP, BACnet/IP, BACnet MS/TP, and Modbus TCP/RTU
- Local adapter/subnet match workflow before a controller deployment can be authorized
- Advanced VAV/FPB engineering profile for setpoints, airflow calibration, actuator behavior, fan/reheat configuration, and control-loop tuning
- Restricted network CLI for adapter inspection, IP ping, subnet matching, and gated laptop static-IP configuration

For the normal BACnet/IP path, the technician connects the computer to the controller network with an RJ45 cable and starts discovery. The QTQP device should then appear from BACnet Who-Is/I-Am traffic; local IP/subnet matching is a communication check, not a manual controller setup step. BACnet MS/TP remains a separate path that requires an RS-485 interface and serial adapter settings.

## Run locally

Install Node.js 20 or newer, then run:

```powershell
npm install
npm run dev
```

Build for production with `npm run build`.

## Laptop desktop app

For development, launch the single-window desktop app with:

```powershell
npm run desktop:dev
```

Create the Windows package with:

```powershell
npm run desktop:build
```

The portable runnable app is generated at `dist/win-unpacked/AutoFVMC AI.exe`. The Electron window starts the local BACnet bridge automatically. Connect the laptop to the controller network over RJ45 before running discovery. Live writes remain disabled unless `ALLOW_LIVE_WRITES=true` is explicitly set. An NSIS installer can be attempted with `npm run desktop:installer`; on locked-down Windows machines, distribute the portable `win-unpacked` folder instead. This unsigned build may be blocked by Microsoft Defender Exploit Guard on managed devices. Ask your IT team to review and approve/allowlist it; do not disable organization security controls.

## Web deployment

The web build is an installable Progressive Web App. Host it over HTTPS (or localhost for testing), open it in Microsoft Edge on Windows, then use **Settings and more (...) > Apps > Install this site as an app**. It opens in its own window and receives updates automatically. Chrome also supports installing it from the browser menu.

The app shell and static assets are cached for startup when offline. BACnet discovery, controller reads and writes, network tools, AI, and InfraLink reporting still require the protected gateway and its network connection; operational API responses are not cached.

Build and publish the web application:

```powershell
npm install
npm run web:build
```

Publish the generated `dist` folder to the approved web host. The BACnet bridge must run on an approved gateway that has network access to the controllers, because browser JavaScript cannot send BACnet UDP traffic directly. By default the bridge listens only on localhost:

```powershell
npm run server
```

For a gateway intentionally placed on a protected controller LAN, bind it explicitly and put it behind the site's authenticated reverse proxy:

```powershell
$env:AUTOFVMC_HOST="192.168.10.18"
npm run server
```

Do not expose the bridge directly to the public internet. Keep UDP `47808` available only between the gateway and the BACnet/IP controller network.

## Network CLI

The in-app command console is allowlisted; it does not execute arbitrary shell input. Supported commands are `help`, `ipconfig`, `ping <IPv4>`, and `match-ip <controller IPv4>`. Static laptop IP setup uses `configure-ip "<adapter name>" <IPv4> <subnet mask> <gateway IPv4|none> CONFIRM`. That operation is disabled unless the local gateway is deliberately started with `ALLOW_HOST_IP_CHANGES=true`, and Windows administrator privileges may be required. Changing the laptop adapter can disconnect the browser/gateway session. Controller IP changes are not performed by this CLI.

## PDF programming assistant

The authenticated console accepts text-based programming PDFs. The gateway extracts the text and can send it to an AI provider when `OPENAI_API_KEY` is configured on the gateway. The AI returns steps, warnings, and only explicitly mapped BACnet changes; it must not invent object identifiers. The technician reviews the result and confirms it with their employee number before the sequence write endpoint can run. Scanned PDFs require OCR first.

## Firmware upgrades

Firmware is intentionally separated from BACnet point programming. The console stages `.bin` or `.hex` packages, requires a configuration backup and model/maintenance approval, and then hands the package to a vendor-specific `FirmwareAdapter`. A real QTQP firmware adapter must be validated against the manufacturer's supported upgrade mechanism before enabling transfer.

## Troubleshooting assistant

The Help Center chat provides advisory troubleshooting only; it has no controller-write tools. Configure `OPENAI_API_KEY` on the protected gateway and set `AUTOFVMC_ALLOWED_ORIGINS` to the exact web origin (for example, `https://fvmc.vercel.app`). At web build time, set `VITE_AUTOFVMC_GATEWAY_URL` to the authenticated HTTPS gateway endpoint. The gateway must be protected by the site's approved authentication/reverse-proxy controls; the employee number sent by the UI is not, by itself, identity verification. The assistant advises qualified technicians to follow site electrical safety and lockout/tagout procedures.

## InfraLink reports

After all BACnet write acknowledgements succeed, the gateway creates a report containing the InfraLink job/work-order ID, operator number, controller identity, source procedure, changed BACnet objects, timestamp, and verification status. It appends the report and each delivery receipt to the gateway-local `server/data/infralink-outbox.jsonl`. If `AUTOFVMC_INFRALINK_WEBHOOK_URL` is configured, the gateway posts the same JSON report and optionally uses `AUTOFVMC_INFRALINK_TOKEN` as a Bearer token. Queued reports retry every 60 seconds with the same report ID as an idempotency key. Delivery failures do not mask the BACnet write result.

This is a generic HTTPS webhook adapter, not yet a verified native InfraLink API integration. InfraLink's tenant API documentation, authentication method, and job/report endpoint are required to map this payload to the official M.C. Dean workflow. Keep credentials on the protected gateway; never put the token in the browser or Vercel frontend configuration.

The current UI uses representative values and a sample QTQP profile. BACnet discovery, reads, writes, MS/TP serial access, and device-specific point identifiers still need to be implemented and verified against the target hardware. Any BACnet controller can be supported by adding a discovered device profile and mapping its object names or instance numbers to the sequence capabilities.

## Open source

This project is licensed under the MIT License; see [LICENSE](LICENSE). To distribute it as open source, publish the source repository and include its license and notices. Do not commit gateway credentials, tenant tokens, customer data, or controller network details.

## Sequence upload

The first upload format is JSON so a technician can bring an approved engineering sequence into the console without rebuilding it through menus:

```json
{
	"name": "Lab 02 VAV sequence",
	"application": "VAV",
	"setpoints": { "temperature": 22, "minFlow": 180, "maxFlow": 620, "humidity": 55 },
	"controls": { "damper": true, "fan": false, "reheat": true }
}
```

The UI validates the sequence shape, summarizes the settings, and checks that the local computer subnet matches the discovered QTQP device before a future deployment adapter can write values. The current network scan is representative UI behavior; production discovery should use a native BACnet/IP and MS/TP adapter with OS network-interface access, device-instance verification, read-back validation, and an engineer-approved write transaction.

The advanced parameter editor exports an AutoFVMC profile with range checks. Its parameter set is a general VAV/FPB engineering baseline, not a verified IC Tool parameter list or a QTQP BACnet point map. Confirm manufacturer-specific names, ranges, defaults, and object mappings against the approved controller documentation before enabling hardware writes.

## BACnet adapter boundary

The typed contracts in `src/bacnet` keep transport and hardware behavior independent from the UI:

- `BacnetDiscoveryAdapter` handles BACnet/IP or MS/TP device discovery.
- `BacnetPointAdapter` handles reads and writes; writes include the approving engineer identity.
- `MsTpAdapter` owns RS-485 connection settings and lifecycle.
- `PointMap` represents model-specific BACnet object mappings without hardcoding them into the dashboard.

`DemoBacnetDiscoveryAdapter` is representative-only and must be replaced by a native BACnet implementation before connecting to live controllers.
