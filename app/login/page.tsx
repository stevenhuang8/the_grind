import { getFlag } from '@/lib/launchdarkly'
import LoginForm from '@/components/auth/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { ref } = await searchParams
  const showDemo = await getFlag('demo-login', false, ref === 'recruiter' ? { ref: 'recruiter' } : {})

  return <LoginForm showDemo={showDemo} />
}
