"""Disposable OpenAI-compatible server used only by process-level local tests."""

from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    """Serve the minimal models and chat endpoints required by the E2E flow."""

    model_name = "Qwen/Qwen3.8-27B"

    def do_GET(self) -> None:
        """Serve readiness metadata for the configured model alias."""

        if self.path != "/v1/models":
            self.send_error(404)
            return
        self.respond({"object": "list", "data": [{"id": self.model_name}]})

    def do_POST(self) -> None:
        """Serve a deterministic chat completion for process-level tests."""

        if self.path != "/v1/chat/completions":
            self.send_error(404)
            return
        size = int(self.headers.get("Content-Length", "0"))
        request = json.loads(self.rfile.read(size))
        self.respond(
            {
                "model": request["model"],
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "The current web source was included within the token budget.",
                        }
                    }
                ],
            }
        )

    def log_message(self, _format: str, *_args: object) -> None:
        """Suppress default request logs to keep test output concise."""

        return

    def respond(self, payload: dict[str, object]) -> None:
        """Write one successful JSON response with explicit headers."""

        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    """Run the fixture server on an explicitly selected loopback port."""

    arguments = argparse.ArgumentParser()
    arguments.add_argument("--port", required=True, type=int)
    options = arguments.parse_args()
    ThreadingHTTPServer(("127.0.0.1", options.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
