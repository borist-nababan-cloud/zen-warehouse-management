import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen, Search, Printer, ArrowUp, List } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import userGuideMarkdown from '../../docs/USER_GUIDE.md?raw'

interface TocItem {
  id: string
  title: string
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_~()[\]]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('')
  }
  if (children && typeof children === 'object' && 'props' in children) {
    const el = children as { props?: { children?: React.ReactNode } }
    return extractTextFromChildren(el.props?.children)
  }
  return ''
}

export function TutorialPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Split markdown by top-level "## " sections for filtering & Table of Contents
  const sections = useMemo(() => {
    const lines = userGuideMarkdown.split(/\r?\n/)
    const parsed: { id: string; title: string; raw: string }[] = []
    let currentTitle = 'Pendahuluan'
    let currentLines: string[] = []

    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/)
      if (h2Match) {
        if (currentLines.length > 0) {
          parsed.push({
            id: slugifyHeading(currentTitle),
            title: currentTitle,
            raw: currentLines.join('\n'),
          })
        }
        currentTitle = h2Match[1].trim()
        currentLines = [line]
      } else {
        currentLines.push(line)
      }
    }
    if (currentLines.length > 0) {
      parsed.push({
        id: slugifyHeading(currentTitle),
        title: currentTitle,
        raw: currentLines.join('\n'),
      })
    }
    return parsed
  }, [])

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sections
    return sections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.raw.toLowerCase().includes(q)
    )
  }, [sections, searchQuery])

  const tocItems: TocItem[] = useMemo(
    () =>
      filteredSections
        .filter((s) => s.title !== 'Pendahuluan')
        .map((s) => ({ id: s.id, title: s.title })),
    [filteredSections]
  )

  const markdownToRender = useMemo(
    () => filteredSections.map((s) => s.raw).join('\n\n'),
    [filteredSections]
  )

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zen-charcoal dark:text-zen-linen font-serif flex items-center gap-2.5">
              <BookOpen className="h-7 w-7 text-zen-matcha shrink-0" />
              Tutorial Aplikasi (Panduan Pengguna)
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Dokumentasi resmi operasional Zen Warehouse Management System (WHMS) yang selalu terbarui.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="gap-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
            >
              <Printer className="h-4 w-4" />
              Cetak Panduan
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="border-zen-sand/40 shadow-xs print:hidden">
          <CardContent className="pt-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik panduan (misal: Stock Opname, STO, PO, HRD, Role 14, Faktur)..."
                className="pl-9 bg-white dark:bg-[#191914]"
              />
            </div>
            {searchQuery.trim() && (
              <p className="text-xs text-muted-foreground mt-2">
                Menampilkan {filteredSections.length} bagian yang cocok dengan &ldquo;{searchQuery.trim()}&rdquo;.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Main Content + Sticky TOC */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Table of Contents (Desktop Sidebar) */}
          <Card className="lg:col-span-1 lg:sticky lg:top-4 border-zen-sand/40 shadow-xs print:hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-zen-charcoal dark:text-zen-linen">
                <List className="h-4 w-4 text-zen-matcha" />
                Daftar Isi ({tocItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 max-h-[65vh] overflow-y-auto">
              <ul className="space-y-1">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg text-zen-charcoal/80 dark:text-zen-linen/80 hover:bg-zen-matcha/10 hover:text-zen-moss transition-colors leading-snug"
                    >
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Markdown Viewer */}
          <Card className="lg:col-span-3 border-zen-sand/40 shadow-xs">
            <CardContent className="p-6 sm:p-8">
              {filteredSections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Tidak ada bagian panduan yang cocok dengan pencarian Anda.
                </div>
              ) : (
                <article className="space-y-4 text-sm leading-relaxed text-zen-charcoal dark:text-zen-linen/90">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl sm:text-3xl font-bold font-serif text-zen-charcoal dark:text-zen-linen border-b border-zen-sand/50 pb-3 mb-4">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => {
                        const text = extractTextFromChildren(children)
                        const id = slugifyHeading(text)
                        return (
                          <h2
                            id={id}
                            className="scroll-mt-6 text-xl font-bold font-serif text-zen-moss dark:text-zen-matcha border-b border-zen-sand/40 pb-2 pt-4 mt-6"
                          >
                            {children}
                          </h2>
                        )
                      },
                      h3: ({ children }) => (
                        <h3 className="text-base font-bold text-zen-charcoal dark:text-zen-linen pt-2 mt-4">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-zen-matcha bg-zen-sand/15 dark:bg-zen-stone/40 px-4 py-2.5 my-3 rounded-r-lg text-xs sm:text-sm">
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, className }) => {
                        const isBlock = Boolean(className)
                        if (isBlock) {
                          return (
                            <code className="block bg-slate-900 text-slate-100 p-3 rounded-lg text-xs font-mono overflow-x-auto my-2">
                              {children}
                            </code>
                          )
                        }
                        return (
                          <code className="px-1.5 py-0.5 rounded bg-zen-sand/30 dark:bg-zen-stone text-zen-moss dark:text-zen-matcha font-mono text-xs">
                            {children}
                          </code>
                        )
                      },
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4 border border-zen-sand/50 rounded-lg">
                          <table className="w-full text-xs border-collapse">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-zen-sand/20 dark:bg-zen-stone/60 font-semibold">{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th className="border-b border-zen-sand/40 px-3 py-2 text-left">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border-b border-zen-sand/25 px-3 py-2 align-top">{children}</td>
                      ),
                      hr: () => <hr className="my-6 border-zen-sand/40" />,
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zen-moss dark:text-zen-matcha underline hover:opacity-80"
                        >
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {markdownToRender}
                  </ReactMarkdown>
                </article>
              )}

              <div className="mt-8 pt-4 border-t border-zen-sand/40 flex justify-end print:hidden">
                <Button variant="outline" size="sm" onClick={scrollToTop} className="gap-1.5 text-xs">
                  <ArrowUp className="h-3.5 w-3.5" />
                  Kembali ke Atas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TutorialPage
