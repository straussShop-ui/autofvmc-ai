$env:Path = "C:\Windows\System32;C:\Windows;C:\Program Files\nodejs;$env:Path"

$env:AUTOFVMC_HOST = "0.0.0.0"
$env:AUTOFVMC_PORT = "47880"
$env:AUTOFVMC_ALLOWED_ORIGINS = "https://fvmc.vercel.app"
$env:OPENAI_API_KEY = "your-openai-key"
$env:OPENAI_MODEL = "gpt-4.1-mini"
$env:ALLOW_LIVE_WRITES = "false"
$env:ALLOW_HOST_IP_CHANGES = "false"
$env:BACNET_PORT = "47808"
$env:AUTOFVMC_INFRALINK_WEBHOOK_URL = ""
$env:AUTOFVMC_INFRALINK_TOKEN = ""
$env:AUTOFVMC_INFRALINK_OUTBOX = "C:\AutoFVMC\logs\infralink-outbox.jsonl"

New-Item -ItemType Directory -Force -Path "C:\AutoFVMC\logs" | Out-Null
node server/bacnetServer.cjs
