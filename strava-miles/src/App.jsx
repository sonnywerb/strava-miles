import { useState, useEffect } from 'react'
import axios from 'axios'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import stravaLogo from './assets/strava.svg'
import './App.css'

function App() {
  const [totalMiles, setTotalMiles] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [rateLimited, setRateLimited] = useState(false)

  // Check if we should skip API call due to recent fetch
  const shouldSkipFetch = () => {
    const lastFetch = localStorage.getItem('strava-last-fetch')
    const cachedData = localStorage.getItem('strava-cached-data')
    
    if (lastFetch && cachedData) {
      const timeSinceLastFetch = Date.now() - parseInt(lastFetch)
      const fiveMinutes = 5 * 60 * 1000 // 5 minutes in milliseconds
      
      if (timeSinceLastFetch < fiveMinutes) {
        // Use cached data
        const cached = JSON.parse(cachedData)
        setTotalMiles(cached.miles)
        setLastUpdated(new Date(cached.timestamp))
        setLoading(false)
        return true
      }
    }
    return false
  }

  // Function to refresh access token when it expires
  const refreshAccessToken = async () => {
    try {
      const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID
      const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET
      const refreshToken = import.meta.env.VITE_STRAVA_REFRESH_TOKEN

      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })

      // In a real app, you'd save this new token securely
      // For now, we'll just use it for this session
      return response.data.access_token
    } catch (error) {
      console.error('Failed to refresh token:', error)
      throw new Error('Unable to refresh access token. Please check your credentials.')
    }
  }

  // Function to fetch Strava athlete stats
  const fetchStravaData = async (forceRefresh = false) => {
    // Check rate limiting first
    if (!forceRefresh && shouldSkipFetch()) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      setRateLimited(false)
      
      let accessToken = import.meta.env.VITE_STRAVA_ACCESS_TOKEN
      
      if (!accessToken) {
        throw new Error('Strava access token not configured. Please check your .env file.')
      }

      // Helper function to make authenticated requests with token refresh
      const makeAuthenticatedRequest = async (url, retryCount = 0) => {
        try {
          return await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          })
        } catch (error) {
          // Check for rate limiting
          if (error.response?.status === 429) {
            setRateLimited(true)
            throw new Error('Rate limit exceeded. Please wait before refreshing.')
          }
          
          // If unauthorized and we haven't retried yet, try refreshing token
          if (error.response?.status === 401 && retryCount === 0) {
            console.log('Access token expired, refreshing...')
            accessToken = await refreshAccessToken()
            return makeAuthenticatedRequest(url, 1) // Retry once with new token
          }
          throw error
        }
      }

      // First, get the authenticated athlete's ID
      const athleteResponse = await makeAuthenticatedRequest('https://www.strava.com/api/v3/athlete')
      const athleteId = athleteResponse.data.id

      // Then get the athlete's stats
      const statsResponse = await makeAuthenticatedRequest(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`)

      // Get year-to-date running and cycling distance
      const stats = statsResponse.data
      const ytdRunDistance = stats.ytd_run_totals?.distance || 0
      
      // Convert meters to miles
      const miles = ytdRunDistance * 0.000621371 // Convert meters to miles
      
      setTotalMiles(miles)
      const now = new Date()
      setLastUpdated(now)
      
      // Cache the data
      localStorage.setItem('strava-last-fetch', Date.now().toString())
      localStorage.setItem('strava-cached-data', JSON.stringify({
        miles: miles,
        timestamp: now.toISOString()
      }))
      
    } catch (err) {
      console.error('Error fetching Strava data:', err)
      setError(err.response?.data?.message || err.message || 'Failed to fetch Strava data')
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
        {/* <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a> */}
        <a href="https://www.strava.com/athletes/ericchan" target="_blank">
          <img src={stravaLogo} className="logo strava" alt="Strava logo" />
        </a>
      </div>

      {/* <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div> */}
      <h1>Welcome to Team Eric!</h1>
      <h2>2025 Total Mileage</h2>
      
      <div className="card">
        {loading ? (
          <div>
            <div style={{ fontSize: '1.2em' }}>🏃‍♂️ Fetching your Strava data...</div>
          </div>
        ) : error ? (
          <div>
            <div style={{ color: '#ff4444', marginBottom: '10px' }}>
              ❌ Error: {error}
            </div>
            {rateLimited ? (
              <div style={{ color: '#ff8800', fontSize: '0.9em', marginBottom: '10px' }}>
                ⏰ Rate limited. Data is cached for 5 minutes to prevent API abuse.
              </div>
            ) : (
              <button onClick={() => fetchStravaData(true)} style={{ padding: '10px 20px' }}>
                Try Again
              </button>
            )}
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
              💾 Data cached for 5 minutes to protect API limits
            </div>
          </div>
        )}
      </div>
      
      {/* <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p> */}
      <p className="read-the-docs">
        Click on the Strava logo to check out my profile!
      </p>
    </>
  )
}

export default App
