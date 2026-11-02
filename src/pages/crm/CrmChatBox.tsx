import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthUser } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { 
  Send, 
  MessageSquare, 
  Phone, 
  CheckCircle2, 
  Bot, 
  User, 
  Building2, 
  Headphones,
  ExternalLink,
  Sparkles,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

export interface ChatRoom {
  id: string
  member_id: string | null
  auth_user_id?: string | null
  member_name: string
  member_phone: string | null
  kode_outlet: string | null
  category: string
  status: string
  unread_by_outlet: boolean
  unread_by_admin: boolean
  unread_by_member: boolean
  last_message: string | null
  last_message_at: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  room_id: string
  sender_type: 'MEMBER' | 'BOT' | 'OUTLET_STAFF' | 'WEB_ADMIN'
  sender_name: string
  sender_id: string | null
  message_text: string
  metadata: any
  is_read: boolean
  created_at: string
}

interface CrmChatBoxProps {
  room: ChatRoom
  staffRoleType: 'OUTLET_STAFF' | 'WEB_ADMIN'
  onRoomUpdated?: () => void
}

const QUICK_REPLIES = [
  'Halo Kak! Selamat datang di Zen Family Spa. Ada yang bisa kami bantu?',
  'Slot perawatan untuk jam tersebut masih tersedia Kak. Berapa orang yang akan hadir?',
  'Baik Kak, reservasi Anda telah kami catat di cabang kami. Ditunggu kedatangannya ya Kak!',
  'Untuk informasi tarif dan paket lengkap perawatan, apakah kami bisa bantu jelaskan Kak?',
  'Terima kasih telah menghubungi Zen Family Spa. Semoga hari Anda menyenangkan!'
]

export function CrmChatBox({ room, staffRoleType, onRoomUpdated }: CrmChatBoxProps) {
  const { user } = useAuthUser()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Fetch messages and subscribe to Realtime
  useEffect(() => {
    if (!room?.id) return

    let isMounted = true
    setLoading(true)

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('web_chat_messages')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching chat messages:', error)
      } else if (isMounted) {
        setMessages((data as ChatMessage[]) || [])
        // Mark room as read for this staff type
        if (staffRoleType === 'OUTLET_STAFF' && room.unread_by_outlet) {
          await supabase
            .from('web_chat_rooms')
            .update({ unread_by_outlet: false })
            .eq('id', room.id)
          onRoomUpdated?.()
        } else if (staffRoleType === 'WEB_ADMIN' && room.unread_by_admin) {
          await supabase
            .from('web_chat_rooms')
            .update({ unread_by_admin: false })
            .eq('id', room.id)
          onRoomUpdated?.()
        }
      }
      if (isMounted) setLoading(false)
    }

    fetchMessages()

    // Subscribe to new messages via Supabase Realtime
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'web_chat_messages',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => [...prev, newMsg])
          // Auto mark read if we are looking at this room
          if (staffRoleType === 'OUTLET_STAFF') {
            supabase.from('web_chat_rooms').update({ unread_by_outlet: false }).eq('id', room.id)
          } else {
            supabase.from('web_chat_rooms').update({ unread_by_admin: false }).eq('id', room.id)
          }
          onRoomUpdated?.()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [room.id, staffRoleType])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle Send
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim()
    if (!text || sending) return

    setSending(true)
    const senderName = user?.email?.split('@')[0] || (staffRoleType === 'OUTLET_STAFF' ? 'Resepsionis Cabang' : 'Admin Web')

    try {
      const { error } = await supabase.from('web_chat_messages').insert({
        room_id: room.id,
        sender_type: staffRoleType,
        sender_name: senderName,
        sender_id: user?.id || null,
        message_text: text,
        metadata: {
          role_id: user?.user_role,
          kode_outlet: user?.kode_outlet
        }
      })

      if (error) throw error

      setInputText('')
      onRoomUpdated?.()
    } catch (err: any) {
      toast.error('Gagal mengirim pesan: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  // Handle Mark Resolved
  const handleResolveRoom = async () => {
    try {
      const { error } = await supabase
        .from('web_chat_rooms')
        .update({
          status: 'RESOLVED',
          unread_by_outlet: false,
          unread_by_admin: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id)

      if (error) throw error
      toast.success('Percakapan telah ditandai Selesai')
      onRoomUpdated?.()
    } catch (err: any) {
      toast.error('Gagal menyelesaikan percakapan: ' + err.message)
    }
  }

  // WhatsApp formatted link
  const cleanPhone = room.member_phone?.replace(/\D/g, '') || ''
  const waPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(`Halo Kak ${room.member_name}, kami dari Zen Family Spa terkait percakapan Anda di website...`)}` : null

  return (
    <div className="flex flex-col h-[700px] bg-white dark:bg-[#1f1f1a] rounded-xl border border-[#D2C0A7]/30 dark:border-[#38382E] shadow-sm overflow-hidden">
      {/* Header Room Info */}
      <div className="px-5 py-4 border-b border-[#D2C0A7]/30 dark:border-[#38382E] bg-[#F8F5F1] dark:bg-[#25251e] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#889D35]/15 text-[#889D35] flex items-center justify-center font-bold text-base">
            {room.member_name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#3C3C32] dark:text-[#EBE6DF]">
                {room.member_name}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                room.status === 'WAITING_STAFF' 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse'
                  : room.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                {room.status === 'WAITING_STAFF' ? 'Menunggu Respons' : room.status === 'ACTIVE' ? 'Aktif' : 'Selesai'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#7A7A6E] dark:text-[#A6A095] mt-0.5">
              {room.kode_outlet && (
                <span className="flex items-center gap-1 font-mono font-medium text-[#889D35]">
                  <Building2 className="w-3.5 h-3.5" /> Cabang {room.kode_outlet}
                </span>
              )}
              {room.member_phone && (
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5" /> {room.member_phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {new Date(room.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              title="Buka percakapan langsung via WhatsApp"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              WhatsApp Tamu
            </a>
          )}
          {room.status !== 'RESOLVED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResolveRoom}
              className="text-xs h-8 border-[#D2C0A7] dark:border-[#38382E] text-[#3C3C32] dark:text-[#EBE6DF] hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Tandai Selesai
            </Button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#FAF8F5] dark:bg-[#181814]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-[#7A7A6E]">
            Memuat percakapan...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#7A7A6E] dark:text-[#A6A095] space-y-2">
            <MessageSquare className="w-8 h-8 text-[#D2C0A7]" />
            <p className="text-sm">Belum ada pesan dalam percakapan ini.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isStaff = msg.sender_type === 'OUTLET_STAFF' || msg.sender_type === 'WEB_ADMIN'
            const isBot = msg.sender_type === 'BOT'

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Tag */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#7A7A6E] dark:text-[#A6A095] mb-1 px-1">
                  {isBot ? (
                    <>
                      <Bot className="w-3 h-3 text-[#889D35]" />
                      <span className="font-semibold text-[#889D35]">Zen Asisten (Bot)</span>
                    </>
                  ) : isStaff ? (
                    <>
                      <Headphones className="w-3 h-3 text-emerald-600" />
                      <span className="font-semibold">{msg.sender_name} ({msg.sender_type === 'OUTLET_STAFF' ? 'Cabang' : 'Pusat'})</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-sky-600" />
                      <span className="font-semibold">{msg.sender_name}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    isStaff
                      ? 'bg-[#889D35] text-white rounded-br-xs'
                      : isBot
                      ? 'bg-[#EAE4D9] dark:bg-[#2c2b23] text-[#3C3C32] dark:text-[#EBE6DF] border border-[#D2C0A7]/40 rounded-bl-xs'
                      : 'bg-white dark:bg-[#25251e] text-[#3C3C32] dark:text-[#EBE6DF] border border-[#D2C0A7]/30 dark:border-[#38382E] rounded-bl-xs'
                  }`}
                >
                  {msg.message_text}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies Tray */}
      <div className="px-4 py-2 bg-[#F3EFEA] dark:bg-[#20201a] border-t border-[#D2C0A7]/30 dark:border-[#38382E] flex items-center gap-2 overflow-x-auto text-xs scrollbar-thin">
        <Sparkles className="w-3.5 h-3.5 text-[#889D35] shrink-0" />
        <span className="text-[11px] font-medium text-[#7A7A6E] shrink-0">Template Cepat:</span>
        {QUICK_REPLIES.map((reply, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(reply)}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-[#2a2922] text-[#3C3C32] dark:text-[#EBE6DF] border border-[#D2C0A7]/40 hover:border-[#889D35] hover:text-[#889D35] transition-colors shrink-0 text-[11px]"
          >
            {reply.length > 32 ? reply.slice(0, 32) + '...' : reply}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-white dark:bg-[#1f1f1a] border-t border-[#D2C0A7]/30 dark:border-[#38382E] flex items-center gap-2">
        <textarea
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
          placeholder="Ketik balasan untuk tamu... (Enter untuk kirim)"
          className="flex-1 resize-none bg-[#F8F5F1] dark:bg-[#25251e] border border-[#D2C0A7]/40 dark:border-[#38382E] rounded-lg px-3.5 py-2 text-sm text-[#3C3C32] dark:text-[#EBE6DF] placeholder:text-[#A6A095] focus:outline-none focus:ring-1 focus:ring-[#889D35]"
        />
        <Button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || sending}
          className="bg-[#889D35] hover:bg-[#72852b] text-white px-4 h-10 shrink-0"
        >
          <Send className="w-4 h-4 mr-1.5" />
          Kirim
        </Button>
      </div>
    </div>
  )
}
export default CrmChatBox
