import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthUser } from '@/hooks/useAuth'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

interface AIChatWidgetProps {
    pageName: string
    contextData: any
}

interface ChatMessage {
    role: 'user' | 'ai'
    content: string
}

export function AIChatWidget({ pageName, contextData }: AIChatWidgetProps) {
    const { user } = useAuthUser()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'ai', content: `Hello! I'm your AI Assistant. I can help analyze the **${pageName}** data on this screen. Ask me anything!` }
    ])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Role check: Only Roles 5 and 8 can see this widget
    const allowedRoles = [5, 8]
    if (!user || !allowedRoles.includes(user.user_role)) {
        return null
    }

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isOpen])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setInput('')
        setIsLoading(true)

        try {
            const aiUrl = import.meta.env.VITE_AI_BACKEND_URL
            if (!aiUrl) {
                throw new Error('AI Backend URL is not configured.')
            }

            const response = await fetch(aiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    contextData: contextData,
                    pageName: pageName
                })
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || 'Failed to fetch AI response')
            }

            const data = await response.json()
            const reply = data.reply || "Sorry, I couldn't generate a response."

            setMessages(prev => [...prev, { role: 'ai', content: reply }])

        } catch (error: any) {
            console.error('AI Chat Error:', error)
            setMessages(prev => [...prev, { role: 'ai', content: `**Error:** ${error.message}` }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[350px] sm:w-[400px] h-[500px] shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-200 border-primary/20">
                    <CardHeader className="bg-primary/5 p-4 flex flex-row items-center justify-between border-b">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-full">
                                <Cpu className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-medium text-primary">Zen AI Assistant</CardTitle>
                                <p className="text-xs text-muted-foreground">Analyzing {pageName}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setIsOpen(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex w-full",
                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                                        msg.role === 'user'
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                                    )}
                                >
                                    {msg.role === 'ai' ? (
                                        <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-slate-900">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start w-full">
                                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Thinking...</span>
                                </div>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="p-3 bg-white border-t">
                        <form
                            className="flex w-full items-center space-x-2"
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleSend()
                            }}
                        >
                            <Input
                                placeholder="Ask about the data..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1 bg-slate-50 focus-visible:ring-primary/20"
                                disabled={isLoading}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className={isLoading ? 'opacity-50' : ''}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            {/* Toggle Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-xl transition-all duration-300 hover:scale-105",
                    isOpen ? "bg-destructive hover:bg-destructive/90 rotate-90" : "bg-primary hover:bg-primary/90"
                )}
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </Button>
        </div>
    )
}
