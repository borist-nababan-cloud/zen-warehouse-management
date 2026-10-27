export function Footer() {
    const companyName = import.meta.env.VITE_COMPANY_NAME || 'Zen Family Spa & Reflexology'
    const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t border-zen-border bg-white/40 py-3.5 px-6 text-center text-xs text-zen-charcoal/60">
            <p>
                &copy; {currentYear} {companyName}. Hak Cipta Dilindungi. v{appVersion}
            </p>
        </footer>
    )
}
