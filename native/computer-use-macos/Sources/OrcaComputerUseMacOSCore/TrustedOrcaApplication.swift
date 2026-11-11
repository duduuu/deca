/// Bundle ids of the apps whose computer-use sidecar may drive this helper.
public enum TrustedOrcaApplication {
    public static func isTrusted(bundleId: String) -> Bool {
        // Why: `pnpm dev` launches as `com.deca.app.dev` and per-worktree wrapper apps use
        // `com.deca.app.dev.<name>`; the sidecar peer check must authorize both (#26498).
        bundleId == "com.deca.app" ||
            bundleId == "com.deca.app.dev" ||
            bundleId.hasPrefix("com.deca.app.dev.") ||
            bundleId == "com.github.Electron"
    }
}
