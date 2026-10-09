"""Small ComfyUI API client for executing the saved image workflow."""

import asyncio
import json
import logging
import uuid
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl, urlencode as encode_query
from typing import Awaitable, Callable

import aiohttp
import httpx

from app.config import settings as app_settings

logger = logging.getLogger(__name__)

ProgressCallback = Callable[[int | None, str], Awaitable[None]]


async def _report_progress(
    callback: ProgressCallback | None, percentage: int | None, message: str
) -> None:
    if callback:
        await callback(percentage, message)


def _websocket_url(base_url: str, client_id: str) -> str:
    parsed = urlsplit(base_url)
    query = dict(parse_qsl(parsed.query))
    query["clientId"] = client_id
    return urlunsplit(
        ("wss" if parsed.scheme == "https" else "ws", parsed.netloc,
         parsed.path.rstrip("/") + "/ws", encode_query(query), "")
    )

COMFYUI_BASE_URL = app_settings.COMFYUI_BASE_URL.rstrip("/")
WORKFLOW_PATH = Path(__file__).parent.parent / "workflows" / "z_image_turbo_api.json"


async def generate_workflow_image(
    prompt: str | None = None,
    *,
    base_url: str | None = None,
    output_path: Path | None = None,
    timeout_seconds: int = 300,
    poll_interval_seconds: float = 1.0,
    progress_callback: ProgressCallback | None = None,
) -> Path:
    """Execute the saved workflow, optionally replacing its prompt, and download its first output."""
    if not WORKFLOW_PATH.is_file():
        raise FileNotFoundError(f"ComfyUI workflow not found: {WORKFLOW_PATH}")

    workflow = json.loads(WORKFLOW_PATH.read_text(encoding="utf-8"))
    if not isinstance(workflow, dict) or not workflow:
        raise ValueError(f"ComfyUI workflow is empty or invalid: {WORKFLOW_PATH}")

    if prompt is not None:
        prompt_node = workflow.get("57:27")
        if not prompt_node:
            raise ValueError("Workflow prompt node '57:27' was not found")
        inputs = prompt_node.get("inputs", {})
        if "text" not in inputs:
            raise ValueError("Workflow prompt node '57:27' has no 'text' input")
        inputs["text"] = prompt
        logger.info("Injected dynamic image prompt (%d characters)", len(prompt))

    base_url = (base_url or COMFYUI_BASE_URL).rstrip("/")
    output_path = output_path or Path(app_settings.ASSETS_DIR) / "comfyui-smoke-test.png"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    client_id = f"contentforge-{uuid.uuid4()}"
    websocket_url = _websocket_url(base_url, client_id)
    timeout = aiohttp.ClientTimeout(total=None, sock_connect=30, sock_read=None)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        websocket = None
        try:
            try:
                websocket = await session.ws_connect(websocket_url, heartbeat=20)
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                # Image generation should still work if this ComfyUI build does not expose WS.
                logger.warning("ComfyUI progress WebSocket unavailable: %s", exc)
                await _report_progress(progress_callback, None, "Generating image (live progress unavailable)…")

            async with session.get(f"{base_url}/system_stats") as response:
                response.raise_for_status()
            logger.info("Connected to ComfyUI at %s", base_url)

            async with session.post(
                f"{base_url}/prompt", json={"prompt": workflow, "client_id": client_id}
            ) as response:
                response.raise_for_status()
                submission = await response.json()
            prompt_id = submission.get("prompt_id")
            if not prompt_id:
                raise RuntimeError(f"ComfyUI did not return a prompt_id: {submission}")
            logger.info("Submitted workflow to ComfyUI: prompt_id=%s", prompt_id)
            await _report_progress(progress_callback, None, "Queued in ComfyUI…")

            deadline = asyncio.get_running_loop().time() + timeout_seconds
            image_info = None
            next_history_poll = 0.0
            while asyncio.get_running_loop().time() < deadline:
                if websocket is not None:
                    try:
                        message = await asyncio.wait_for(
                            websocket.receive(), timeout=min(0.25, poll_interval_seconds)
                        )
                        if message.type == aiohttp.WSMsgType.TEXT:
                            event = json.loads(message.data)
                            event_data = event.get("data", {})
                            if event_data.get("prompt_id") == prompt_id:
                                event_type = event.get("type")
                                if event_type == "execution_start":
                                    await _report_progress(progress_callback, 0, "Starting image generation…")
                                elif event_type == "executing":
                                    node = event_data.get("node")
                                    if node is not None:
                                        await _report_progress(progress_callback, None, "Processing image…")
                                elif event_type == "progress":
                                    maximum = event_data.get("max") or 0
                                    value = event_data.get("value") or 0
                                    percentage = round(100 * value / maximum) if maximum else None
                                    await _report_progress(progress_callback, percentage, "Generating image…")
                                elif event_type == "execution_error":
                                    raise RuntimeError(f"ComfyUI execution error: {event_data}")
                                elif event_type == "execution_success":
                                    await _report_progress(progress_callback, 99, "Finishing and saving image…")
                        elif message.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                            websocket = None
                    except asyncio.TimeoutError:
                        pass

                if asyncio.get_running_loop().time() >= next_history_poll:
                    async with session.get(f"{base_url}/history/{prompt_id}") as response:
                        response.raise_for_status()
                        history_payload = await response.json()
                    history = history_payload.get(prompt_id, {})
                    outputs = history.get("outputs", {})
                    for node_output in outputs.values():
                        images = node_output.get("images", [])
                        if images:
                            image_info = images[0]
                            break
                    if image_info:
                        break

                    status = history.get("status", {})
                    if status.get("status_str") == "error" or (
                        status.get("completed") is False and status.get("messages")
                    ):
                        raise RuntimeError(f"ComfyUI workflow failed: {status}")
                    next_history_poll = asyncio.get_running_loop().time() + poll_interval_seconds
                else:
                    await asyncio.sleep(min(0.1, poll_interval_seconds))

            if not image_info:
                raise TimeoutError(
                    f"ComfyUI produced no image within {timeout_seconds} seconds (prompt_id={prompt_id})"
                )

            query = urlencode(
                {
                    "filename": image_info["filename"],
                    "subfolder": image_info.get("subfolder", ""),
                    "type": image_info.get("type", "output"),
                }
            )
            async with session.get(f"{base_url}/view?{query}") as response:
                response.raise_for_status()
                output_path.write_bytes(await response.read())
            await _report_progress(progress_callback, 100, "Image ready")
        finally:
            if websocket is not None:
                await websocket.close()

    logger.info("Saved ComfyUI smoke-test image to %s (%d bytes)", output_path, output_path.stat().st_size)
    return output_path


async def test_comfyui_connection(base_url: str | None = None) -> tuple[bool, str]:
    """Check whether the configured ComfyUI server is reachable."""
    url = (base_url or COMFYUI_BASE_URL).rstrip("/")
    try:
        async with httpx.AsyncClient(base_url=url, timeout=10) as client:
            response = await client.get("/system_stats")
            response.raise_for_status()
        return True, f"Connected to ComfyUI at {url}"
    except Exception as exc:
        logger.warning("ComfyUI connection check failed for %s: %s", url, exc)
        return False, f"ComfyUI not reachable at {url}: {str(exc)[:100]}"
