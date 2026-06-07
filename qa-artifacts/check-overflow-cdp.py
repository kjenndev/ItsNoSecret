import base64
import json
import os
import socket
import struct
import subprocess
import time
import urllib.request

port = 9223
url = 'http://127.0.0.1:5173/'
proc = subprocess.Popen([
    'chromium',
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    f'--remote-debugging-port={port}',
    '--window-size=390,900',
    url,
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    ws_url = None
    deadline = time.time() + 15
    while time.time() < deadline:
        try:
            pages = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json', timeout=1))
            for page in pages:
                if page.get('type') == 'page':
                    ws_url = page['webSocketDebuggerUrl']
                    break
            if ws_url:
                break
        except Exception:
            time.sleep(0.2)
    if not ws_url:
        raise SystemExit('No debugger websocket')

    rest = ws_url[5:]
    hostport, path = rest.split('/', 1)
    host, port_s = hostport.split(':')
    path = '/' + path
    sock = socket.create_connection((host, int(port_s)), timeout=5)
    key = base64.b64encode(os.urandom(16)).decode()
    req = (
        f'GET {path} HTTP/1.1\r\n'
        f'Host: {hostport}\r\n'
        'Upgrade: websocket\r\n'
        'Connection: Upgrade\r\n'
        f'Sec-WebSocket-Key: {key}\r\n'
        'Sec-WebSocket-Version: 13\r\n\r\n'
    )
    sock.sendall(req.encode())
    resp = sock.recv(4096)
    if b'101' not in resp.split(b'\r\n', 1)[0]:
        raise SystemExit(resp.decode(errors='ignore'))

    def send(obj):
        data = json.dumps(obj).encode()
        header = bytearray([0x81])
        n = len(data)
        if n < 126:
            header.append(0x80 | n)
        elif n < 65536:
            header.extend([0x80 | 126])
            header.extend(struct.pack('!H', n))
        else:
            header.extend([0x80 | 127])
            header.extend(struct.pack('!Q', n))
        mask = os.urandom(4)
        header.extend(mask)
        masked = bytes(byte ^ mask[index % 4] for index, byte in enumerate(data))
        sock.sendall(bytes(header) + masked)

    def recv():
        h = sock.recv(2)
        if not h:
            return None
        b1, b2 = h
        n = b2 % 128
        if n == 126:
            n = struct.unpack('!H', sock.recv(2))[0]
        elif n == 127:
            n = struct.unpack('!Q', sock.recv(8))[0]
        chunks = []
        remaining = n
        while remaining:
            chunk = sock.recv(remaining)
            chunks.append(chunk)
            remaining -= len(chunk)
        data = b''.join(chunks)
        if b1 % 16 == 8:
            return None
        return json.loads(data.decode())

    def request(command_id, method, params=None):
        send({'id': command_id, 'method': method, 'params': params or {}})
        deadline = time.time() + 10
        while time.time() < deadline:
            message = recv()
            if message and message.get('id') == command_id:
                return message
        raise SystemExit(f'No {method} response')

    request(1, 'Emulation.setDeviceMetricsOverride', {
        'width': 390,
        'height': 900,
        'deviceScaleFactor': 1,
        'mobile': True,
    })
    time.sleep(0.5)

    expr = """JSON.stringify({innerWidth: window.innerWidth, docScrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, clientWidth: document.documentElement.clientWidth, offenders: [...document.querySelectorAll('*')].filter(el => el.scrollWidth > document.documentElement.clientWidth).slice(0,10).map(el => ({tag: el.tagName, aria: el.getAttribute('aria-label'), cls: String(el.className), sw: el.scrollWidth, cw: el.clientWidth})), liveRegion: [...document.querySelectorAll('[aria-live]')].map(el => ({width:getComputedStyle(el).width,height:getComputedStyle(el).height,position:getComputedStyle(el).position,overflow:getComputedStyle(el).overflow}))})"""
    send({'id': 2, 'method': 'Runtime.evaluate', 'params': {'expression': expr, 'returnByValue': True}})
    deadline = time.time() + 10
    while time.time() < deadline:
        msg = recv()
        if msg and msg.get('id') == 2:
            print(msg['result']['result']['value'])
            break
    else:
        raise SystemExit('No Runtime.evaluate response')
finally:
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except subprocess.TimeoutExpired:
        proc.kill()
