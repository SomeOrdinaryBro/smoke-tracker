import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useTracker } from '../hooks/useTracker'
import './TrackerPage.css'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  })
}

export default function TrackerPage() {
  const { logout } = useAuth0()
  const { data, loading, error, logDay, todayLogged, logging } = useTracker()

  const [showCraving, setShowCraving] = useState(false)
  const [pendingSmoked, setPendingSmoked] = useState(false)
  const [selectedCraving, setSelectedCraving] = useState(3)

  function handleLogChoice(smoked) {
    setPendingSmoked(smoked)
    setSelectedCraving(3)
    setShowCraving(true)
  }

  async function handleConfirm() {
    await logDay(pendingSmoked, selectedCraving)
    setShowCraving(false)
  }

  function handleDismiss() {
    setShowCraving(false)
  }

  if (loading) return <div className="tracker-center">Loading…</div>
  if (error) return <div className="tracker-center">Failed to load tracker data.</div>

  const days = last7Days()
  const todayEntry = data.logs[todayKey()]

  return (
    <div className="tracker">
      <header className="tracker-header">
        <span className="tracker-title">Smoke Tracker</span>
        <button
          className="btn-ghost"
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin + '/login' } })
          }
        >
          Logout
        </button>
      </header>

      <main className="tracker-main">
        {/* Streak */}
        <section className="streak-section">
          {data.streak > 0 ? (
            <>
              <div className="streak-number">{data.streak}</div>
              <div className="streak-label">days clean</div>
            </>
          ) : (
            <div className="streak-zero">Start your streak today</div>
          )}
        </section>

        {/* Today */}
        <section className="today-section">
          <h2>Today</h2>
          {todayLogged ? (
            <div className="today-logged">
              <span className={`status-badge ${todayEntry.smoked ? 'smoked' : 'clean'}`}>
                {todayEntry.smoked ? 'Smoked' : 'Clean'}
              </span>
              <span className="craving-display">Craving: {todayEntry.craving}/5</span>
            </div>
          ) : (
            <div className="log-buttons">
              <button className="btn-clean" onClick={() => handleLogChoice(false)}>
                Clean Today
              </button>
              <button className="btn-smoked" onClick={() => handleLogChoice(true)}>
                I Smoked
              </button>
            </div>
          )}
        </section>

        {/* Craving prompt */}
        {showCraving && (
          <section className="craving-section">
            <p className="craving-label">Craving level today?</p>
            <div className="craving-scale">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`craving-btn${selectedCraving === n ? ' selected' : ''}`}
                  onClick={() => setSelectedCraving(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="craving-actions">
              <button className="btn-confirm" onClick={handleConfirm} disabled={logging}>
                {logging ? 'Saving…' : 'Confirm'}
              </button>
              <button className="btn-dismiss" onClick={handleDismiss} disabled={logging}>
                Dismiss
              </button>
            </div>
          </section>
        )}

        {/* History */}
        <section className="history-section">
          <h2>Last 7 Days</h2>
          <ul className="history-list">
            {days.map((day) => {
              const entry = data.logs[day]
              return (
                <li key={day} className="history-row">
                  <span className="history-date">{day}</span>
                  {entry ? (
                    <>
                      <span className={`status-badge ${entry.smoked ? 'smoked' : 'clean'}`}>
                        {entry.smoked ? 'Smoked' : 'Clean'}
                      </span>
                      <span className="history-craving">Craving: {entry.craving}/5</span>
                    </>
                  ) : (
                    <span className="not-logged">Not logged</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}
