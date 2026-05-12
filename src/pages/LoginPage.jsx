import { useAuth0 } from '@auth0/auth0-react'

export default function LoginPage() {
  const { loginWithRedirect } = useAuth0()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1.5rem',
    }}>
      <h1>Smoke Tracker</h1>
      <button onClick={() => loginWithRedirect()}>Log In</button>
    </div>
  )
}
