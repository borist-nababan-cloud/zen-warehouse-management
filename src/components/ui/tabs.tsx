
import * as React from "react"
import { cn } from "@/lib/utils"
// Simplified Tabs implementation without Radix UI
// This relies on the parent managing state via value/onValueChange manually if needed, 
// OR simpler context. But for now, we will assume the Radix API usage in pages 
// matches this simplified version or we handle it.
// Actually, re-implementing full Tabs context is verbose. 
// I will create a very simple visual only set of components that EXPECTS the parent to handle showing/hiding content 
// if I don't implement context. 
// BUT the page usage `Tabs value={activeTab} onValueChange={setActiveTab}` implies controlled mode.

interface TabsContextType {
    value: string
    onChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

export const Tabs = ({ value, onValueChange, children, className }: any) => {
    return (
        <TabsContext.Provider value={{ value, onChange: onValueChange }}>
            <div className={cn("", className)}>{children}</div>
        </TabsContext.Provider>
    )
}

export const TabsList = ({ className, children }: any) => (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
        {children}
    </div>
)

export const TabsTrigger = ({ value, children, className }: any) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.value === value
    return (
        <button
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                isActive && "bg-background text-foreground shadow-sm",
                className
            )}
            onClick={() => context?.onChange(value)}
        >
            {children}
        </button>
    )
}

export const TabsContent = ({ value, children, className }: any) => {
    const context = React.useContext(TabsContext)
    if (context?.value !== value) return null
    return (
        <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
            {children}
        </div>
    )
}
