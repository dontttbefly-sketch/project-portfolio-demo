#!/usr/bin/env python3
"""开发用 HTTP 服务器：发送 no-store 头，避免浏览器缓存任何资源。
运行：python3 serve.py [port]
默认端口 8088。
"""
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8088
    addr = ('127.0.0.1', port)
    print(f'Serving on http://localhost:{port} (no cache)')
    HTTPServer(addr, NoCacheHandler).serve_forever()
