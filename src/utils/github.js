const TRACKER_URL =
  'https://raw.githubusercontent.com/SomeOrdinaryBro/smoke-tracker/main/data/tracker.json'

export async function fetchTrackerData() {
  const res = await fetch(TRACKER_URL)
  if (!res.ok) throw new Error(`Failed to fetch tracker data: ${res.status}`)
  return res.json()
}

export async function dispatchLogDay(date, smoked, craving, token) {
  const res = await fetch('/log', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, smoked, craving }),
  })
  if (!res.ok) throw new Error(`Log failed: ${res.status}`)
}
