export function Footer() {
    const companyName = import.meta.env.VITE_COMPANY_NAME || 'Your Company'
    const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0'
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t bg-background py-4 px-6 text-center text-sm text-muted-foreground">
            <p>
                &copy; {currentYear} {companyName}. All rights reserved. v{appVersion}
            </p>
        </footer>
    )
}
