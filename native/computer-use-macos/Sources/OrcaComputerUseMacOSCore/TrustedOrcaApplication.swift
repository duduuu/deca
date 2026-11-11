/// Bundle ids of the apps whose computer-use sidecar may drive this helper.
public enum TrustedOrcaApplication {
    public static func isTrusted(bundleId: String) -> Bool {
        // Why: `pnpm dev` launches as `com.deca.desktop.dev` and per-worktree wrapper apps use
        // `com.deca.desktop.dev.<name>`; the sidecar peer check must authorize both (#26498).
        bundleId == "com.deca.desktop" ||
            bundleId == "com.deca.desktop.dev" ||
            bundleId.hasPrefix("com.deca.desktop.dev.") ||
            bundleId == "com.github.Electron"
    }
}
