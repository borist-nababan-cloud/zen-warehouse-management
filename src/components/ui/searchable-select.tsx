import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Option {
    value: string
    label: string
    subLabel?: string
}

interface SearchableSelectProps {
    options: Option[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    disabled?: boolean
    className?: string
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    disabled = false,
    className
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

    // Refs
    const triggerRef = useRef<HTMLButtonElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Calculate position when opening
    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            // Check if space below is enough, else flip? (Simple version: always below for now, unless edge case)
            // Ideally we'd calculate available height.

            setPosition({
                top: rect.bottom + window.scrollY + 4, // 4px gap
                left: rect.left + window.scrollX,
                width: rect.width
            })
        }
    }, [open])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // If clicking trigger, don't close immediately (toggle handles it)
            if (triggerRef.current?.contains(event.target as Node)) {
                return
            }

            // If clicking inside dropdown, don't close
            if (dropdownRef.current?.contains(event.target as Node)) {
                return
            }

            setOpen(false)
            setSearch('') // Reset search on close
        }

        // Close on scroll/resize to prevent drifting
        const handleScrollOrResize = () => {
            if (open) setOpen(false)
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
            window.addEventListener("scroll", handleScrollOrResize, true) // Capture phase for all scroll containers
            window.addEventListener("resize", handleScrollOrResize)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            window.removeEventListener("scroll", handleScrollOrResize, true)
            window.removeEventListener("resize", handleScrollOrResize)
        }
    }, [open])

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase()) ||
        option.subLabel?.toLowerCase().includes(search.toLowerCase())
    )

    const selectedOption = options.find((option) => option.value === value)

    return (
        <div className={cn("relative w-full", className)}>
            <Button
                ref={triggerRef}
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between bg-background px-3 font-normal"
                onClick={() => !disabled && setOpen(!open)}
                disabled={disabled}
            >
                {selectedOption ? (
                    <span className="truncate text-left flex-1">
                        {selectedOption.label}
                        {selectedOption.subLabel && <span className="ml-2 text-muted-foreground text-xs">({selectedOption.subLabel})</span>}
                    </span>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {open && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        top: position.top,
                        left: position.left,
                        width: position.width,
                        zIndex: 9999 // Ensure it's on top of everything
                    }}
                    className="fixed mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                >
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[250px] overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No results found.
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={cn(
                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        value === option.value && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => {
                                        onChange(option.value)
                                        setOpen(false)
                                        setSearch('')
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{option.label}</span>
                                        {option.subLabel && (
                                            <span className="text-xs text-muted-foreground">{option.subLabel}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
