import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import EditalDetailClient from '@/components/EditalDetailClient'

export default async function EditalPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return <EditalDetailClient id={params.id} />
}
