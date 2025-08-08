import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
import fastf1
import pandas as pd
import numpy as np

# Load environment variables
load_dotenv()

# Enable FastF1 cache
fastf1.Cache.enable_cache('cache')

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key or api_key == "your_openai_api_key_here":
    print("Warning: No valid OpenAI API key found. Using mock data for chat.")
    client = None
else:
    client = OpenAI(api_key=api_key)

app = Flask(__name__)
CORS(app)

class AIAgent:
    def __init__(self, model="gpt-4o-mini"):
        self.model = model
        self.chat_history = []

    def ask(self, message):
        self.chat_history.append({"role": "user", "content": message})
        try:
            if client is None:
                # Mock response when no OpenAI client is available
                mock_responses = [
                    "To świetne pytanie! Na podstawie danych z FastF1 mogę powiedzieć, że...",
                    "Analizując dane wyścigowe, widzę że...",
                    "Zgodnie z telemetrią z ostatniego wyścigu...",
                    "To interesujące pytanie o strategię F1. Na podstawie dostępnych danych...",
                    "Analizując czasy okrążeń i strategie pit stopów..."
                ]
                import random
                reply = random.choice(mock_responses) + " (Mock response - add OpenAI API key for real AI responses)"
            else:
                response = client.chat.completions.create(
                    model=self.model,
                    messages=self.chat_history
                )
                reply = response.choices[0].message.content
            self.chat_history.append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            return f"[Error]: {str(e)}"

ai_agent = AIAgent()

def get_latest_race():
    """Get the latest race from FastF1"""
    try:
        # Get current year
        current_year = datetime.now().year
        
        # Try to get the latest race from current year
        schedule = fastf1.get_event_schedule(current_year)
        if not schedule.empty:
            # Get the most recent completed race
            completed_races = schedule[schedule['EventFormat'] == 'conventional']
            if not completed_races.empty:
                latest_race = completed_races.iloc[-1]
                return {
                    'year': current_year,
                    'round': latest_race['RoundNumber'],
                    'name': latest_race['EventName'],
                    'circuit': latest_race['CircuitShortName']
                }
        
        # Fallback to a known recent race
        return {
            'year': 2024,
            'round': 8,
            'name': 'Monaco Grand Prix',
            'circuit': 'Monaco'
        }
    except Exception as e:
        print(f"Error getting latest race: {e}")
        return {
            'year': 2024,
            'round': 8,
            'name': 'Monaco Grand Prix',
            'circuit': 'Monaco'
        }

def format_time(seconds):
    """Format time in seconds to MM:SS.sss format"""
    if pd.isna(seconds) or seconds is None:
        return "N/A"
    
    # Handle pandas Timedelta
    if hasattr(seconds, 'total_seconds'):
        seconds = seconds.total_seconds()
    
    # Convert to float if it's not already
    try:
        seconds = float(seconds)
    except (ValueError, TypeError):
        return "N/A"
    
    minutes = int(seconds // 60)
    secs = seconds % 60
    return f"{minutes}:{secs:06.3f}"

def format_delta(seconds):
    """Format delta time"""
    if pd.isna(seconds) or seconds is None:
        return "N/A"
    
    if seconds < 0:
        return f"-{abs(seconds):.3f}"
    else:
        return f"+{seconds:.3f}"

@app.route('/results', methods=['GET'])
def get_results():
    """Get results from the latest race"""
    try:
        race_info = get_latest_race()
        
        # Load race session
        session = fastf1.get_session(race_info['year'], race_info['round'], 'R')
        session.load()
        
        # Get results
        results = session.results
        
        race_results = []
        for _, driver in results.iterrows():
            # Get driver info
            driver_code = driver['Abbreviation']
            driver_name = f"{driver['FirstName']} {driver['LastName']}"
            team = driver['TeamName']
            
            # Get position and status
            position = driver['Position']
            status = driver['Status']
            
            # Get timing info
            finish_time = driver.get('Time', None)
            gap = driver.get('GapToLeader', None)
            
            # Get grid position
            grid_position = driver.get('GridPosition', position)
            
            # Calculate points (simplified)
            points = 0
            if position <= 10:
                points_map = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
                points = points_map.get(position, 0)
            
            race_results.append({
                'position': int(position) if not pd.isna(position) else 0,
                'driverCode': driver_code,
                'driverName': driver_name,
                'team': team,
                'time': format_time(finish_time) if finish_time else 'N/A',
                'gap': format_delta(gap) if gap else '',
                'status': status if status else 'Finished',
                'points': points,
                'gridPosition': int(grid_position) if not pd.isna(grid_position) else 0
            })
        
        # Sort by position
        race_results.sort(key=lambda x: x['position'])
        
        return jsonify({
            'race': race_info,
            'results': race_results
        })
        
    except Exception as e:
        print(f"Error getting results: {e}")
        # Return mock data as fallback
        return jsonify({
            'race': {
                'year': 2024,
                'round': 8,
                'name': 'Monaco Grand Prix',
                'circuit': 'Monaco'
            },
            'results': [
                {'position': 1, 'driverCode': 'LEC', 'driverName': 'Charles Leclerc', 'team': 'Ferrari', 'time': '2:23:15.554', 'gap': '', 'status': 'Finished', 'points': 25, 'gridPosition': 1},
                {'position': 2, 'driverCode': 'PIA', 'driverName': 'Oscar Piastri', 'team': 'McLaren', 'time': '2:23:16.301', 'gap': '+0.747', 'status': 'Finished', 'points': 18, 'gridPosition': 2},
                {'position': 3, 'driverCode': 'SAI', 'driverName': 'Carlos Sainz', 'team': 'Ferrari', 'time': '2:23:17.892', 'gap': '+2.338', 'status': 'Finished', 'points': 15, 'gridPosition': 3},
                {'position': 4, 'driverCode': 'NOR', 'driverName': 'Lando Norris', 'team': 'McLaren', 'time': '2:23:25.847', 'gap': '+10.293', 'status': 'Finished', 'points': 12, 'gridPosition': 5},
                {'position': 5, 'driverCode': 'RUS', 'driverName': 'George Russell', 'team': 'Mercedes', 'time': '2:23:28.133', 'gap': '+12.579', 'status': 'Finished', 'points': 10, 'gridPosition': 4}
            ]
        })

@app.route('/driver/<driver_code>', methods=['GET'])
def get_driver_details(driver_code):
    """Get detailed driver statistics"""
    try:
        race_info = get_latest_race()
        
        # Load race session
        session = fastf1.get_session(race_info['year'], race_info['round'], 'R')
        session.load()
        
        # Get driver data
        driver_data = session.get_driver(driver_code)
        if driver_data is None:
            return jsonify({'error': 'Driver not found'}), 404
        
        # Get lap times
        laps = driver_data.laps
        
        # Get fastest lap
        fastest_lap = laps.pick_fastest()
        fastest_lap_time = fastest_lap['LapTime'].total_seconds() if fastest_lap is not None else None
        
        # Calculate average lap time
        valid_laps = laps[laps['LapTime'].notna()]
        avg_lap_time = valid_laps['LapTime'].mean().total_seconds() if not valid_laps.empty else None
        
        # Get pit stops
        pit_stops = []
        if hasattr(driver_data, 'pit_stops') and driver_data.pit_stops is not None:
            for _, pit in driver_data.pit_stops.iterrows():
                pit_stops.append({
                    'lap': int(pit['LapNumber']),
                    'compound': pit.get('Compound', 'UNKNOWN'),
                    'duration': f"{pit['PitOutTime'] - pit['PitInTime']:.1f}s" if 'PitInTime' in pit and 'PitOutTime' in pit else 'N/A'
                })
        
        # Get sector times for fastest lap
        sectors = {
            'sector1': 'N/A',
            'sector2': 'N/A', 
            'sector3': 'N/A',
            'lapTime': 'N/A'
        }
        
        if fastest_lap is not None:
            sectors = {
                'sector1': format_time(fastest_lap['Sector1Time'].total_seconds()) if fastest_lap['Sector1Time'] is not None else 'N/A',
                'sector2': format_time(fastest_lap['Sector2Time'].total_seconds()) if fastest_lap['Sector2Time'] is not None else 'N/A',
                'sector3': format_time(fastest_lap['Sector3Time'].total_seconds()) if fastest_lap['Sector3Time'] is not None else 'N/A',
                'lapTime': format_time(fastest_lap_time)
            }
        
        # Get lap times for chart
        lap_times = []
        for _, lap in valid_laps.iterrows():
            if lap['LapTime'] is not None:
                lap_times.append({
                    'lap': int(lap['LapNumber']),
                    'time': lap['LapTime'].total_seconds()
                })
        
        # Get results for position info
        results = session.results
        driver_result = results[results['Abbreviation'] == driver_code]
        
        driver_details = {
            'driverCode': driver_code,
            'driverName': f"{driver_result['FirstName'].iloc[0]} {driver_result['LastName'].iloc[0]}" if not driver_result.empty else driver_code,
            'number': int(driver_result['DriverNumber'].iloc[0]) if not driver_result.empty else 0,
            'team': driver_result['TeamName'].iloc[0] if not driver_result.empty else 'Unknown',
            'gridPosition': int(driver_result['GridPosition'].iloc[0]) if not driver_result.empty and not pd.isna(driver_result['GridPosition'].iloc[0]) else 0,
            'finishPosition': int(driver_result['Position'].iloc[0]) if not driver_result.empty else 0,
            'fastestLap': format_time(fastest_lap_time),
            'averageLapTime': format_time(avg_lap_time),
            'totalLaps': len(valid_laps),
            'pitStops': pit_stops,
            'sectors': sectors,
            'deltaToLeader': format_delta(driver_result['GapToLeader'].iloc[0]) if not driver_result.empty and 'GapToLeader' in driver_result.columns else 'N/A',
            'status': driver_result['Status'].iloc[0] if not driver_result.empty else 'Finished',
            'lapTimes': lap_times
        }
        
        return jsonify(driver_details)
        
    except Exception as e:
        print(f"Error getting driver details: {e}")
        # Return mock data as fallback
        return jsonify({
            'driverCode': driver_code,
            'driverName': 'Charles Leclerc' if driver_code == 'LEC' else 'Max Verstappen' if driver_code == 'VER' else 'Lewis Hamilton',
            'number': 16 if driver_code == 'LEC' else 1 if driver_code == 'VER' else 44,
            'team': 'Ferrari' if driver_code == 'LEC' else 'Red Bull Racing' if driver_code == 'VER' else 'Mercedes',
            'gridPosition': 1,
            'finishPosition': 1,
            'fastestLap': '1:12.345',
            'averageLapTime': '1:14.567',
            'totalLaps': 78,
            'pitStops': [
                {'lap': 18, 'compound': 'MEDIUM', 'duration': '2.3s'},
                {'lap': 42, 'compound': 'HARD', 'duration': '2.1s'}
            ],
            'sectors': {
                'sector1': '23.456',
                'sector2': '28.789',
                'sector3': '20.100',
                'lapTime': '1:12.345'
            },
            'deltaToLeader': '0.000',
            'status': 'Finished',
            'lapTimes': [{'lap': i + 1, 'time': 72.5 + np.random.random() * 3 - 1.5} for i in range(78)]
        })

@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages with AI"""
    try:
        data = request.get_json()
        message = data.get('message', '')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get AI response
        reply = ai_agent.ask(message)
        
        return jsonify({'reply': reply})
        
    except Exception as e:
        print(f"Error in chat: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
