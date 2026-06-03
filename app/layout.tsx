import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AnalisaLic – Análise de Editais com IA',
  description: 'Sistema profissional de análise de licitações públicas com inteligência artificial',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
