---
name: verification-shallow-rejection-trap
description: Proof-depth rule for "preserved" and "still works" verdicts in the End-to-End Verifier. An artifact produced by a layer that runs before the changed code path (request validation, arg parsing, signature check, flag default, IDE/extension that did not activate, build target that did not compile the changed file) does not prove the changed code executed. Must reach past the early-exit layer before counting as proof.
---
# Shallow-rejection trap

An artifact produced by a layer that runs *before* the changed code path is not proof of preservation, even when it is byte-identical before and after the change. Common shapes:

- **HTTP/RPC**: top-level 4xx naming missing or invalid request fields (`Missing X`, `schema invalid`, `required Y`, gRPC `INVALID_ARGUMENT`). Validation runs before the handler; the same 4xx is produced whether the handler body is intact or deleted.
- **CLI/TUI**: arg-parser error (`unknown flag`, `missing required argument`, usage-on-stderr) returned before the command dispatches.
- **UI/web**: form-validation toast or disabled-submit state surfaced before the network call fires.
- **Webhook/async/job**: signature, auth, or schema rejection returned before the handler dispatches.
- **Feature flag**: flag evaluating to its default; the gated branch never runs and the un-gated behavior is identical regardless of the gated change.
- **IDE/extension**: extension failed to activate or load, so every behavior looks "preserved" because none of the changed code ran.
- **Build/test**: target that does not exist, test file not collected, or build short-circuited before compiling the changed file.

# Reach past the early-exit layer

For every "preserved" or "still works" claim, the proof scenario must reach *past* the early-exit layer and exercise the changed code path. Use any error body or rejection signal as instructions for constructing a follow-up scenario the early-exit layer accepts, then assert on an artifact the changed code path actually produces — a 2xx or authentic business-logic error (e.g. `404 not found`, `409 conflict`) from a validated request, the dispatched command's output / exit code, the rendered downstream state after the network call, the handler's log line / correlation ID, the gated branch's behavior, the loaded extension's RPC handshake, the test result for the recompiled target.

If reaching past the early-exit layer is not safely possible — requires real downstream state you cannot fabricate, would mutate shared resources, requires credentials you do not hold, requires a binary you cannot build — state that explicitly, cap confidence at 🟡 Medium, and label the unreached layers in the verdict. Do not claim the changed code executed when it did not.
