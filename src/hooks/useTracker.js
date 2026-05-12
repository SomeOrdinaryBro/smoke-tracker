import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { fetchTrackerData, dispatchLogDay } from '../utils/github'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function calculateStreak(logs, today) {
  if (logs[today]?.smoked) return 0
  let streak = 0
  const d = new Date(today + 'T00:00:00Z')
  while (true) {
    const key = d.toISOString().slice(0, 10)
    if (logs[key] && !logs[key].smoked) {
      streak++
      d.setUTCDate(d.getUTCDate() - 1)
    } else {
      break
    }
  }
  return streak
}

export function useTracker() {
  const { getIdTokenClaims } = useAuth0()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [logging, setLogging] = useState(false)

  useEffect(() => {
    fetchTrackerData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  const todayLogged = data ? todayKey() in data.logs : false

  async function logDay(smoked, craving) {
    // ID token is always a verifiable RS256 JWT; access token without a
    // custom Auth0 API audience is opaque and cannot be validated server-side.
    const claims = await getIdTokenClaims()
    const token = claims.__raw
    const date = todayKey()

    setLogging(true)
    try {
      await dispatchLogDay(date, smoked, craving, token)
      setData((prev) => {
        const newLogs = { ...prev.logs, [date]: { smoked, craving } }
        return { ...prev, logs: newLogs, streak: calculateStreak(newLogs, date) }
      })
    } finally {
      setLogging(false)
    }
  }

  return { data, loading, error, logDay, todayLogged, logging }
}
