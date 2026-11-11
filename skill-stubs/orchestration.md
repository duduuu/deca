# Deca Orchestration

This discovery stub loads the version-matched guide from the Deca executable used for this session.

Never substitute a non-Deca subagent tool when the user asked for Deca orchestration.

<!-- shared: resolver -->

## Load the version-matched guide before running Deca commands

```text
ORCA skills get orchestration
```

That prints the compact, version-matched guide for the exact binary that will handle your
next commands. It covers the normal local coordinator loop and dispatched-worker
obligations. For a conditional action gate such as remote placement, uncertain release
recovery, or expanded DAG work, load only the reference that gate names with
`ORCA skills get orchestration --reference references/<file>.md`
(`--references` lists the names). If that binary rejects `--reference`, run
`ORCA skills get orchestration --full` and read the named bundled reference before acting.

<!-- shared-omit: no-guessing -->

Use the selected executable's `--help` for commands or flags the guide does not cover. If a
command reports that Deca is not running, start it with `ORCA open --json` and retry. If it
fails with `runtime_access_denied`, your sandbox blocked the connection: re-run it with
escalated permissions, and do not run `ORCA open` or restart Deca. If `skills get` is unknown,
explain that updating Deca restores the guide; use `--help` for read-only discovery and do not
guess unsupported commands.
