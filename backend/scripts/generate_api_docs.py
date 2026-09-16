"""Generate docs/API.md from the application's OpenAPI schema.

Usage (from the backend directory):
    python scripts/generate_api_docs.py [--output ../docs/API.md]

The file is generated, so re-run it after changing endpoints. It uses a
TestClient, so no running server is required.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


def _param_table(operation: dict) -> str:
    params = operation.get("parameters", [])
    if not params:
        return ""
    lines = ["", "| Name | In | Required | Description |",
             "| --- | --- | --- | --- |"]
    for p in params:
        schema = p.get("schema", {})
        desc = (p.get("description") or "").replace("\n", " ")
        default = schema.get("default")
        if default is not None:
            desc = f"{desc} (default: `{default}`)".strip()
        lines.append(
            f"| `{p.get('name')}` | {p.get('in')} | "
            f"{'yes' if p.get('required') else 'no'} | {desc} |"
        )
    return "\n".join(lines)


def _responses(operation: dict) -> str:
    responses = operation.get("responses", {})
    if not responses:
        return ""
    lines = ["", "**Responses:**"]
    for code in sorted(responses, key=str):
        desc = (responses[code].get("description") or "").replace("\n", " ")
        lines.append(f"- `{code}` — {desc}")
    return "\n".join(lines)


def generate(spec: dict) -> str:
    info = spec.get("info", {})
    title = info.get("title", "API")
    version = info.get("version", "")
    paths = spec.get("paths", {})

    by_tag: dict[str, list[tuple[str, str, dict]]] = {}
    untagged: list[tuple[str, str, dict]] = []
    for path in sorted(paths):
        for method in sorted(paths[path]):
            if method not in {"get", "post", "put", "patch", "delete"}:
                continue
            op = paths[path][method]
            tags = op.get("tags", [])
            if tags:
                by_tag.setdefault(tags[0], []).append((method, path, op))
            else:
                untagged.append((method, path, op))

    out = [
        f"# {title} — API Reference",
        "",
        f"Version: `{version}`",
        "",
        "Generated from the application's OpenAPI schema (`GET /openapi.json`).",
        "Interactive docs are served at `/docs` (Swagger UI) and `/redoc`.",
        "To regenerate this file: `python scripts/generate_api_docs.py`",
        "",
        "All versioned endpoints live under `/api/v1`. JWT bearer auth is",
        "required except for `/health`, `/auth/register`, `/auth/login`,",
        "`/auth/google` and `/auth/oauth/config`.",
        "",
        "## Contents",
        "",
    ]
    for tag in sorted(by_tag):
        anchor = tag.lower().replace(" ", "-")
        out.append(f"- [{tag}](#{anchor})")
    if untagged:
        out.append("- [Other](#other)")
    out.append("")

    def section(tag: str, items: list[tuple[str, str, dict]]) -> None:
        out.append(f"## {tag}")
        out.append("")
        for method, path, op in items:
            summary = op.get("summary") or ""
            desc = (op.get("description") or "").replace("\n", " ").strip()
            out.append(f"### `{method.upper()} {path}`")
            out.append("")
            if summary:
                out.append(f"*{summary}*")
                out.append("")
            if desc and desc != summary:
                out.append(desc)
                out.append("")
            params = _param_table(op)
            if params:
                out.append(params)
                out.append("")
            responses = _responses(op)
            if responses:
                out.append(responses)
                out.append("")

    for tag in sorted(by_tag):
        section(tag, by_tag[tag])
    if untagged:
        section("Other", untagged)
    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate docs/API.md")
    parser.add_argument("--output", default=str(BACKEND_DIR.parent / "docs" / "API.md"))
    args = parser.parse_args()

    from fastapi.testclient import TestClient

    from app.main import create_app

    client = TestClient(create_app())
    response = client.get("/openapi.json")
    response.raise_for_status()
    markdown = generate(response.json())

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(markdown, encoding="utf-8")
    print(f"Wrote {output} ({len(markdown)} chars)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
