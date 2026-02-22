import { redirect } from 'next/navigation'

export default function HomePage() {
  // Will add auth check here later
  redirect('/auth/login')
}
