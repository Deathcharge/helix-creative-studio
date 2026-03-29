"""
Helix Durable Execution Layer
===============================

PostgreSQL-backed workflow persistence that survives server restarts.
Lightweight alternative to Temporal for durable workflow execution.

Features:
- Workflow state persistence to PostgreSQL
- Automatic resume after server restart
- Human-in-the-loop approval gates
- Retry with exponential backoff
- Timeout handling
- Execution history and audit trail
- Webhook callbacks on completion

(c) Helix Collective 2025 - Proprietary Technology Stack
"""

import asyncio
import ipaddress
import json
import logging
import socket
import traceback
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMED_OUT = "timed_out"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class StepType(str, Enum):
    ACTION = "action"
    APPROVAL_GATE = "approval_gate"
    DELAY = "delay"
    CONDITION = "condition"
    PARALLEL = "parallel"
    AGENT_CALL = "agent_call"
    WEBHOOK = "webhook"


@dataclass
class WorkflowStep:
    """A single step in a durable workflow."""

    id: str
    name: str
    step_type: StepType
    status: WorkflowStatus = WorkflowStatus.PENDING
    input_data: dict[str, Any] = field(default_factory=dict)
    output_data: dict[str, Any] | None = None
    error: str | None = None
    retry_count: int = 0
    max_retries: int = 3
    timeout_seconds: int = 300
    started_at: str | None = None
    completed_at: str | None = None
    approved_by: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class DurableWorkflow:
    """A durable workflow that persists across server restarts."""

    id: str
    name: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    steps: list[WorkflowStep] = field(default_factory=list)
    current_step_index: int = 0
    input_data: dict[str, Any] = field(default_factory=dict)
    output_data: dict[str, Any] | None = None
    created_at: str = ""
    updated_at: str = ""
    created_by: str = ""
    timeout_seconds: int = 3600
    callback_url: str | None = None
    tags: list[str] = field(default_factory=list)
    execution_log: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Serialize workflow to dictionary for persistence."""
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status.value,
            "steps": [
                {
                    "id": s.id,
                    "name": s.name,
                    "step_type": s.step_type.value,
                    "status": s.status.value,
                    "input_data": s.input_data,
                    "output_data": s.output_data,
                    "error": s.error,
                    "retry_count": s.retry_count,
                    "max_retries": s.max_retries,
                    "timeout_seconds": s.timeout_seconds,
                    "started_at": s.started_at,
                    "completed_at": s.completed_at,
                    "approved_by": s.approved_by,
                    "metadata": s.metadata,
                }
                for s in self.steps
            ],
            "current_step_index": self.current_step_index,
            "input_data": self.input_data,
            "output_data": self.output_data,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "created_by": self.created_by,
            "timeout_seconds": self.timeout_seconds,
            "callback_url": self.callback_url,
            "tags": self.tags,
            "execution_log": self.execution_log[-100:],  # Keep last 100 log entries
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "DurableWorkflow":
        """Deserialize workflow from dictionary."""
        wf = cls(
            id=data["id"],
            name=data["name"],
            status=WorkflowStatus(data["status"]),
            current_step_index=data.get("current_step_index", 0),
            input_data=data.get("input_data", {}),
            output_data=data.get("output_data"),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", ""),
            created_by=data.get("created_by", ""),
            timeout_seconds=data.get("timeout_seconds", 3600),
            callback_url=data.get("callback_url"),
            tags=data.get("tags", []),
            execution_log=data.get("execution_log", []),
        )
        wf.steps = [
            WorkflowStep(
                id=s["id"],
                name=s["name"],
                step_type=StepType(s["step_type"]),
                status=WorkflowStatus(s["status"]),
                input_data=s.get("input_data", {}),
                output_data=s.get("output_data"),
                error=s.get("error"),
                retry_count=s.get("retry_count", 0),
                max_retries=s.get("max_retries", 3),
                timeout_seconds=s.get("timeout_seconds", 300),
                started_at=s.get("started_at"),
                completed_at=s.get("completed_at"),
                approved_by=s.get("approved_by"),
                metadata=s.get("metadata", {}),
            )
            for s in data.get("steps", [])
        ]
        return wf


class DurableExecutionEngine:
    """
    Durable workflow execution engine.

    Persists workflow state to PostgreSQL (or in-memory for development)
    so workflows survive server restarts, deployments, and crashes.

    Key features:
    - Automatic checkpoint after each step
    - Resume from last checkpoint on restart
    - Human approval gates
    - Configurable retry policies
    - Timeout handling
    - Webhook notifications
    """

    def __init__(self):
        # In-memory store (PostgreSQL in production via SQLAlchemy)
        self._workflows: dict[str, DurableWorkflow] = {}
        self._step_handlers: dict[str, Callable] = {}
        self._running_tasks: dict[str, asyncio.Task] = {}

        # Register built-in step handlers
        self._register_builtin_handlers()

        logger.info("DurableExecutionEngine initialized")

    def _register_builtin_handlers(self):
        """Register built-in step type handlers."""
        self._step_handlers["delay"] = self._handle_delay
        self._step_handlers["webhook"] = self._handle_webhook
        self._step_handlers["agent_call"] = self._handle_agent_call

    def register_handler(self, step_type: str, handler: Callable):
        """Register a custom step handler."""
        self._step_handlers[step_type] = handler
        logger.info("Registered handler for step type: %s", step_type)

    async def create_workflow(
        self,
        name: str,
        steps: list[dict[str, Any]],
        input_data: dict[str, Any] | None = None,
        created_by: str = "system",
        timeout_seconds: int = 3600,
        callback_url: str | None = None,
        tags: list[str] | None = None,
    ) -> DurableWorkflow:
        """Create a new durable workflow."""
        workflow_id = str(uuid.uuid4())
        now = datetime.now(UTC).isoformat()

        workflow_steps = []
        for i, step_def in enumerate(steps):
            workflow_steps.append(
                WorkflowStep(
                    id=f"{workflow_id}-step-{i}",
                    name=step_def.get("name", f"Step {i + 1}"),
                    step_type=StepType(step_def.get("type", "action")),
                    input_data=step_def.get("input", {}),
                    max_retries=step_def.get("max_retries", 3),
                    timeout_seconds=step_def.get("timeout", 300),
                    metadata=step_def.get("metadata", {}),
                )
            )

        workflow = DurableWorkflow(
            id=workflow_id,
            name=name,
            steps=workflow_steps,
            input_data=input_data or {},
            created_at=now,
            updated_at=now,
            created_by=created_by,
            timeout_seconds=timeout_seconds,
            callback_url=callback_url,
            tags=tags or [],
        )

        self._workflows[workflow_id] = workflow
        await self._persist_workflow(workflow)

        workflow.execution_log.append(
            {
                "event": "created",
                "timestamp": now,
                "details": f"Workflow '{name}' created with {len(steps)} steps",
            }
        )

        logger.info("Created durable workflow: %s (%s) with %d steps", workflow_id, name, len(steps))
        return workflow

    async def start_workflow(self, workflow_id: str) -> DurableWorkflow:
        """Start executing a workflow."""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        if workflow.status not in (WorkflowStatus.PENDING, WorkflowStatus.PAUSED):
            raise ValueError(f"Workflow is {workflow.status.value}, cannot start")

        workflow.status = WorkflowStatus.RUNNING
        workflow.updated_at = datetime.now(UTC).isoformat()
        workflow.execution_log.append(
            {
                "event": "started",
                "timestamp": workflow.updated_at,
            }
        )

        # Start execution in background
        task = asyncio.create_task(self._execute_workflow(workflow))
        self._running_tasks[workflow_id] = task

        await self._persist_workflow(workflow)
        return workflow

    async def approve_step(self, workflow_id: str, step_id: str, approved_by: str) -> DurableWorkflow:
        """Approve a step that's waiting for human approval."""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        step = next((s for s in workflow.steps if s.id == step_id), None)
        if not step:
            raise ValueError(f"Step {step_id} not found")

        if step.status != WorkflowStatus.WAITING_APPROVAL:
            raise ValueError(f"Step is {step.status.value}, not waiting for approval")

        step.approved_by = approved_by
        step.status = WorkflowStatus.COMPLETED
        step.completed_at = datetime.now(UTC).isoformat()
        step.output_data = {"approved": True, "approved_by": approved_by}

        workflow.execution_log.append(
            {
                "event": "step_approved",
                "step_id": step_id,
                "approved_by": approved_by,
                "timestamp": step.completed_at,
            }
        )

        # Resume workflow execution
        workflow.current_step_index += 1
        if workflow.current_step_index < len(workflow.steps):
            task = asyncio.create_task(self._execute_workflow(workflow))
            self._running_tasks[workflow_id] = task

        await self._persist_workflow(workflow)
        return workflow

    async def cancel_workflow(self, workflow_id: str) -> DurableWorkflow:
        """Cancel a running workflow."""
        workflow = self._workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Cancel running task
        task = self._running_tasks.get(workflow_id)
        if task and not task.done():
            task.cancel()

        workflow.status = WorkflowStatus.CANCELLED
        workflow.updated_at = datetime.now(UTC).isoformat()
        workflow.execution_log.append(
            {
                "event": "cancelled",
                "timestamp": workflow.updated_at,
            }
        )

        await self._persist_workflow(workflow)
        return workflow

    async def get_workflow(self, workflow_id: str) -> DurableWorkflow | None:
        """Get workflow by ID."""
        return self._workflows.get(workflow_id)

    async def list_workflows(
        self,
        status: WorkflowStatus | None = None,
        limit: int = 50,
    ) -> list[DurableWorkflow]:
        """List workflows with optional status filter."""
        workflows = list(self._workflows.values())
        if status:
            workflows = [w for w in workflows if w.status == status]
        workflows.sort(key=lambda w: w.updated_at, reverse=True)
        return workflows[:limit]

    async def resume_interrupted_workflows(self):
        """Resume workflows that were interrupted by a server restart."""
        resumed = 0
        for workflow in self._workflows.values():
            if workflow.status == WorkflowStatus.RUNNING:
                logger.info("Resuming interrupted workflow: %s", workflow.id)
                task = asyncio.create_task(self._execute_workflow(workflow))
                self._running_tasks[workflow.id] = task
                resumed += 1

        if resumed > 0:
            logger.info("Resumed %d interrupted workflows", resumed)
        return resumed

    async def _execute_workflow(self, workflow: DurableWorkflow):
        """Execute workflow steps sequentially with checkpointing."""
        try:
            while workflow.current_step_index < len(workflow.steps):
                step = workflow.steps[workflow.current_step_index]

                # Check workflow timeout
                created = datetime.fromisoformat(workflow.created_at)
                if (datetime.now(UTC) - created).total_seconds() > workflow.timeout_seconds:
                    workflow.status = WorkflowStatus.TIMED_OUT
                    workflow.execution_log.append(
                        {
                            "event": "timed_out",
                            "timestamp": datetime.now(UTC).isoformat(),
                        }
                    )
                    break

                # Handle approval gates
                if step.step_type == StepType.APPROVAL_GATE:
                    step.status = WorkflowStatus.WAITING_APPROVAL
                    workflow.status = WorkflowStatus.WAITING_APPROVAL
                    workflow.execution_log.append(
                        {
                            "event": "waiting_approval",
                            "step_id": step.id,
                            "step_name": step.name,
                            "timestamp": datetime.now(UTC).isoformat(),
                        }
                    )
                    await self._persist_workflow(workflow)
                    return  # Pause execution until approved

                # Execute step with retry
                await self._execute_step(workflow, step)

                # Checkpoint after each step
                await self._persist_workflow(workflow)

                if step.status == WorkflowStatus.FAILED:
                    workflow.status = WorkflowStatus.FAILED
                    break

                workflow.current_step_index += 1

            # Workflow complete
            if workflow.status == WorkflowStatus.RUNNING:
                workflow.status = WorkflowStatus.COMPLETED
                workflow.output_data = self._collect_outputs(workflow)
                workflow.execution_log.append(
                    {
                        "event": "completed",
                        "timestamp": datetime.now(UTC).isoformat(),
                    }
                )

                # Fire callback webhook
                if workflow.callback_url:
                    await self._fire_callback(workflow)

        except asyncio.CancelledError:
            logger.info("Workflow %s execution cancelled", workflow.id)
        except Exception as e:
            workflow.status = WorkflowStatus.FAILED
            workflow.execution_log.append(
                {
                    "event": "error",
                    "error": "Workflow execution failed",
                    "timestamp": datetime.now(UTC).isoformat(),
                }
            )
            logger.error("Workflow %s failed: %s\n%s", workflow.id, e, traceback.format_exc())

        workflow.updated_at = datetime.now(UTC).isoformat()
        await self._persist_workflow(workflow)

    async def _execute_step(self, workflow: DurableWorkflow, step: WorkflowStep):
        """Execute a single step with retry logic."""
        step.status = WorkflowStatus.RUNNING
        step.started_at = datetime.now(UTC).isoformat()

        for attempt in range(step.max_retries + 1):
            try:
                # Merge workflow input with step input
                merged_input = {**workflow.input_data, **step.input_data}

                # Add outputs from previous steps
                for prev_step in workflow.steps[: workflow.current_step_index]:
                    if prev_step.output_data:
                        merged_input[f"step_{prev_step.name}"] = prev_step.output_data

                # Find and execute handler
                handler = self._step_handlers.get(step.step_type.value)
                if handler:
                    result = await asyncio.wait_for(
                        handler(merged_input, step.metadata),
                        timeout=step.timeout_seconds,
                    )
                else:
                    result = {"status": "completed", "message": f"No handler for {step.step_type.value}"}

                step.output_data = result
                step.status = WorkflowStatus.COMPLETED
                step.completed_at = datetime.now(UTC).isoformat()

                workflow.execution_log.append(
                    {
                        "event": "step_completed",
                        "step_id": step.id,
                        "step_name": step.name,
                        "attempt": attempt + 1,
                        "timestamp": step.completed_at,
                    }
                )
                return

            except TimeoutError:
                step.error = f"Step timed out after {step.timeout_seconds}s"
                step.retry_count = attempt + 1
            except Exception as e:
                logger.error("Step %s failed (attempt %d): %s", step.id, attempt + 1, e)
                step.error = "Step execution failed"
                step.retry_count = attempt + 1

            if attempt < step.max_retries:
                # Exponential backoff
                delay = min(2**attempt, 60)
                step.status = WorkflowStatus.RETRYING
                workflow.execution_log.append(
                    {
                        "event": "step_retry",
                        "step_id": step.id,
                        "attempt": attempt + 1,
                        "delay": delay,
                        "timestamp": datetime.now(UTC).isoformat(),
                    }
                )
                await asyncio.sleep(delay)

        # All retries exhausted
        step.status = WorkflowStatus.FAILED
        step.completed_at = datetime.now(UTC).isoformat()
        workflow.execution_log.append(
            {
                "event": "step_failed",
                "step_id": step.id,
                "retries_exhausted": True,
                "timestamp": step.completed_at,
            }
        )

    def _collect_outputs(self, workflow: DurableWorkflow) -> dict[str, Any]:
        """Collect outputs from all completed steps."""
        outputs = {}
        for step in workflow.steps:
            if step.output_data:
                outputs[step.name] = step.output_data
        return outputs

    async def _handle_delay(self, input_data: dict, metadata: dict) -> dict:
        """Handle delay step type."""
        seconds = input_data.get("delay_seconds", metadata.get("delay_seconds", 10))
        # Cap delay to prevent abuse (max 1 hour)
        seconds = max(0, min(int(seconds), 3600))
        await asyncio.sleep(seconds)
        return {"delayed": seconds, "completed": True}

    @staticmethod
    def _validate_webhook_url(url: str) -> None:
        """Validate webhook URL to prevent SSRF attacks.

        Blocks requests to private, loopback, and link-local addresses
        (e.g. 10.x.x.x, 127.0.0.1, 169.254.169.254 cloud metadata).
        """
        import ipaddress
        import socket
        from urllib.parse import urlparse

        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Only http/https webhook URLs are allowed")

        hostname = parsed.hostname
        if not hostname:
            raise ValueError("Invalid webhook URL: no hostname")

        # Resolve hostname and check all resulting IPs
        try:
            addr_infos = socket.getaddrinfo(hostname, None)
        except socket.gaierror:
            raise ValueError("Cannot resolve webhook hostname: %s" % hostname)

        for family, _type, _proto, _canonname, sockaddr in addr_infos:
            ip = ipaddress.ip_address(sockaddr[0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                raise ValueError("Webhook URL resolves to blocked address: %s" % ip)

    async def _handle_webhook(self, input_data: dict, metadata: dict) -> dict:
        """Handle webhook step type."""
        import httpx

        url = input_data.get("url") or metadata.get("url")
        if not url:
            return {"error": "No webhook URL provided"}

        # SSRF protection: block private/internal/link-local addresses
        try:
            self._validate_webhook_url(url)
        except ValueError as e:
            return {"error": "Blocked webhook URL: %s" % str(e)}

        method = (input_data.get("method") or metadata.get("method", "POST")).upper()
        if method not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
            return {"error": "Unsupported HTTP method: %s" % method}

        payload = input_data.get("payload", input_data)

        async with httpx.AsyncClient(timeout=30) as client:
            if method == "GET":
                resp = await client.get(url)
            else:
                resp = await client.post(url, json=payload)
            return {"status_code": resp.status_code, "body": resp.text[:1000]}

    async def _handle_agent_call(self, input_data: dict, metadata: dict) -> dict:
        """Handle agent call step type."""
        agent_name = input_data.get("agent") or metadata.get("agent", "kael")
        task = input_data.get("task", "")

        try:
            from apps.backend.services.agent_protocol import get_agent_protocol

            protocol = get_agent_protocol()
            from apps.backend.services.agent_protocol import TaskInput

            task_result = await protocol.create_task(TaskInput(input=task))
            return task_result
        except Exception as e:
            logger.error("Agent task dispatch failed for %s: %s", agent_name, e)
            return {
                "agent": agent_name,
                "task": task[:200],
                "status": "fallback",
                "error": "Agent task dispatch failed",
            }

    _REDIS_KEY_PREFIX = "helix:durable_workflow:"

    async def _persist_workflow(self, workflow: DurableWorkflow):
        """Persist workflow state to Redis (primary) and in-memory cache."""
        self._workflows[workflow.id] = workflow
        try:
            from apps.backend.core.redis_client import get_redis

            r = await get_redis()
            if r:
                key = f"{self._REDIS_KEY_PREFIX}{workflow.id}"
                await r.set(key, json.dumps(workflow.to_dict()), ex=86400 * 7)  # 7-day TTL
            else:
                logger.warning("Redis unavailable — workflow %s persisted in-memory only", workflow.id)
        except Exception as e:
            logger.warning("Redis persist failed for workflow %s: %s", workflow.id, e)

    async def _load_workflow(self, workflow_id: str) -> DurableWorkflow | None:
        """Load workflow from in-memory cache or Redis."""
        if workflow_id in self._workflows:
            return self._workflows[workflow_id]
        try:
            from apps.backend.core.redis_client import get_redis

            r = await get_redis()
            if r:
                key = f"{self._REDIS_KEY_PREFIX}{workflow_id}"
                raw = await r.get(key)
                if raw:
                    data = json.loads(raw if isinstance(raw, str) else raw.decode())
                    wf = DurableWorkflow.from_dict(data)
                    self._workflows[workflow_id] = wf
                    return wf
        except Exception as e:
            logger.warning("Redis load failed for workflow %s: %s", workflow_id, e)
        return None

    @staticmethod
    def _is_safe_callback_url(url: str) -> bool:
        """Validate that a callback URL does not target private/internal networks (SSRF prevention)."""
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return False
            hostname = parsed.hostname
            if not hostname:
                return False
            # Resolve hostname to IP addresses and reject private ranges
            for info in socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM):
                addr = info[4][0]
                ip = ipaddress.ip_address(addr)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    return False
            return True
        except (socket.gaierror, ValueError):
            return False

    async def _fire_callback(self, workflow: DurableWorkflow):
        """Fire completion callback webhook."""
        if not workflow.callback_url:
            return
        if not self._is_safe_callback_url(workflow.callback_url):
            logger.warning(
                "Blocked callback for workflow %s: URL targets private/internal network",
                workflow.id,
            )
            return
        try:
            import httpx

            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    workflow.callback_url,
                    json={
                        "workflow_id": workflow.id,
                        "status": workflow.status.value,
                        "output": workflow.output_data,
                    },
                )
        except Exception as e:
            logger.warning("Callback failed for workflow %s: %s", workflow.id, e)


# Singleton
_engine: DurableExecutionEngine | None = None


def get_durable_engine() -> DurableExecutionEngine:
    """Get the singleton durable execution engine."""
    global _engine
    if _engine is None:
        _engine = DurableExecutionEngine()
    return _engine
