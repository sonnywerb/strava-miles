import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import stravaLogo from './assets/strava.svg'
import './App.css'

function App() {
  const [totalMiles, setTotalMiles] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [athleteName, setAthleteName] = useState('')

  // Function to fetch Strava stats from static JSON file
  const fetchStravaData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch the pre-generated stats file - try multiple paths for GitHub Pages
      // Add cache-busting timestamp
      const timestamp = new Date().getTime();
      let response;
      try {
        response = await fetch(`./strava-stats.json?t=${timestamp}`);
        if (!response.ok) {
          // Try absolute path if relative fails
          response = await fetch(`/strava-miles/strava-stats.json?t=${timestamp}`);
        }
      } catch (err) {
        // Fallback to absolute path
        response = await fetch(`/strava-miles/strava-stats.json?t=${timestamp}`);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      console.log('Fetched data:', data) // Debug log
      
      setTotalMiles(data.totalMiles || 0)
      setLastUpdated(new Date(data.lastUpdated))
      setAthleteName(data.athleteName || 'Eric')
      
    } catch (err) {
      console.error('Error fetching Strava stats:', err)
      setError(err.message || 'Failed to load Strava data. Stats may not be generated yet.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchStravaData()
  }, [])

  return (
    <>
      <div>
        <a href="https://www.strava.com/athletes/ericchan" target="_blank">
          <img src={stravaLogo} className="logo strava" alt="Strava logo" />
        </a>
      </div>

      <h1>{athleteName}'s Personal Strava Dashboard</h1>
      <h2>2025 Total Running Mileage</h2>
      <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '20px', fontStyle: 'italic' }}>
        Updated every 15 minutes via GitHub Actions
      </div>
      
      <div className="card">
        {loading ? (
          <div>
            <div style={{ fontSize: '1.2em' }}>🏃‍♂️ Loading your Strava stats...</div>
          </div>
        ) : error ? (
          <div>
            <div style={{ color: '#ff4444', marginBottom: '10px' }}>
              ❌ Error: {error}
            </div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>
              Stats are automatically updated every 15 minutes. If you're seeing this error, the data may not be generated yet.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#fc4c02', marginBottom: '10px' }}>
              {totalMiles.toFixed(1)} miles
            </div>
            <div style={{ fontSize: '0.9em', color: '#666' }}>
              Last updated: {lastUpdated?.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8em', color: '#999', marginTop: '5px' }}>
              � Automatically refreshed every 15 minutes.
            </div>
          </div>
        )}
      </div>
      
      <p className="read-the-docs">
        Click on the Strava logo to check out my profile!
      </p>
    </>
  )
}

export default App
