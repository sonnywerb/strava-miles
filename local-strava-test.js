const https = require('https');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, 'strava-miles', '.env') });

// Function to make HTTPS requests (same as workflow)
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Check HTTP status code
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Function to refresh access token
async function refreshAccessToken() {
  const postData = new URLSearchParams({
    client_id: process.env.VITE_STRAVA_CLIENT_ID,
    client_secret: process.env.VITE_STRAVA_CLIENT_SECRET,
    refresh_token: process.env.VITE_STRAVA_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  }).toString();
  
  const options = {
    hostname: 'www.strava.com',
    port: 443,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  try {
    const response = await makeRequest(options, postData);
    console.log('✅ Token refreshed successfully');
    
    // Update the .env file with the new token
    await updateEnvFile(response.access_token);
    
    return response.access_token;
  } catch (error) {
    console.error('❌ Failed to refresh token:', error);
    throw error;
  }
}

// Function to update .env file with new access token
async function updateEnvFile(newAccessToken) {
  try {
    const envPath = path.join(__dirname, 'strava-miles', '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace the VITE_STRAVA_ACCESS_TOKEN line
    const tokenRegex = /^VITE_STRAVA_ACCESS_TOKEN=.*$/m;
    const newTokenLine = `VITE_STRAVA_ACCESS_TOKEN=${newAccessToken}`;
    
    if (tokenRegex.test(envContent)) {
      envContent = envContent.replace(tokenRegex, newTokenLine);
    } else {
      // If the line doesn't exist, add it
      envContent += `\n${newTokenLine}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('💾 Updated .env file with new access token');
    
  } catch (error) {
    console.error('❌ Failed to update .env file:', error);
    // Don't throw - continue with the test even if file update fails
  }
}

// Function to make authenticated API calls with token refresh
async function makeAuthenticatedRequest(path, accessToken, retryCount = 0) {
  const options = {
    hostname: 'www.strava.com',
    port: 443,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  };
  
  try {
    return await makeRequest(options);
  } catch (error) {
    console.log('API Error:', error.message);
    // If unauthorized and haven't retried, try refreshing token
    if (error.message && error.message.includes('401') && retryCount === 0) {
      console.log('🔄 Access token expired, refreshing...');
      const newToken = await refreshAccessToken();
      return makeAuthenticatedRequest(path, newToken, 1);
    }
    throw error;
  }
}

// Main function to test Strava API
async function testStravaAPI() {
  try {
    console.log('🏃‍♂️ Testing Strava API locally...\n');
    
    // Use the access token from environment
    let accessToken = process.env.VITE_STRAVA_ACCESS_TOKEN;
    
    // Get athlete data
    console.log('📡 Fetching athlete data...');
    const athlete = await makeAuthenticatedRequest('/api/v3/athlete', accessToken);
    console.log(`Raw athlete data:`, JSON.stringify(athlete, null, 2));
    
    console.log(`\n👤 Athlete: ${athlete.firstname} ${athlete.lastname}`);
    console.log(`📍 Location: ${athlete.city}, ${athlete.state}`);
    console.log(`🏃‍♂️ Bio: ${athlete.bio}`);
    
    // Get YTD stats
    console.log('\n📊 Fetching year-to-date stats...');
    const stats = await makeAuthenticatedRequest(`/api/v3/athletes/${athlete.id}/stats`, accessToken);
    console.log(`Raw stats data:`, JSON.stringify(stats, null, 2));
    
    // Calculate total miles for 2025
    const ytdRunTotals = stats.ytd_run_totals;
    const totalMeters = ytdRunTotals.distance;
    const totalMiles = totalMeters * 0.000621371; // Convert meters to miles
    
    console.log(`\n🎯 2025 Running Stats:`);
    console.log(`📏 Total Distance: ${totalMiles.toFixed(1)} miles`);
    console.log(`🏃‍♂️ Total Runs: ${ytdRunTotals.count}`);
    console.log(`⏱️  Moving Time: ${(ytdRunTotals.moving_time / 3600).toFixed(1)} hours`);
    console.log(`⬆️  Elevation Gain: ${ytdRunTotals.elevation_gain.toFixed(0)} feet`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testStravaAPI();