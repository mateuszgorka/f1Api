import os
import json
import shutil
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pydantic_settings import BaseSettings
from openai import OpenAI
from dotenv import load_dotenv
import fastf1
import pandas as pd
import numpy as np

# Load environment variables
try:
    load_dotenv()
except Exception as e:
    print(f"Warning: Could not load .env file: {e}")
    print("Continuing with default settings...")

class Settings(BaseSettings):
    openai_api_key: str = ""
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    cache_enabled: bool = True
    cache_dir: str = "cache"
    
    class Config:
        env_file = None  # Don't load .env file by default

settings = Settings()

# Enable FastF1 cache (disabled in Docker to avoid permission issues)
if settings.cache_enabled and not os.path.exists('/.dockerenv'):
    try:
        fastf1.Cache.enable_cache(settings.cache_dir)
        print(f"FastF1 cache enabled: {settings.cache_dir}")
    except Exception as e:
        print(f"Warning: Could not enable FastF1 cache: {e}")
        print("Continuing without cache...")
else:
    print("FastF1 cache disabled (running in Docker or cache disabled)")

# Initialize OpenAI client
if not settings.openai_api_key or settings.openai_api_key == "your_openai_api_key_here":
    print("Warning: No valid OpenAI API key found. Chat functionality will be limited.")
    client = None
else:
    client = OpenAI(api_key=settings.openai_api_key)

app = FastAPI(
    title="F1 API Assistant Pro",
    description="Professional FastF1 data analysis with OpenAI integration",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to specific domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

class RaceInfo(BaseModel):
    year: int
    round: int
    name: str
    circuit: str
    country: str
    startDate: str
    endDate: str

class SessionInfo(BaseModel):
    name: str
    date: str
    status: str  # 'completed', 'upcoming', 'ongoing'
    results: Optional[List[Dict[str, Any]]] = None

class RaceResult(BaseModel):
    position: int
    driverCode: str
    driverName: str
    team: str
    time: str
    gap: str
    status: str
    points: int
    gridPosition: int

class DriverDetails(BaseModel):
    driverCode: str
    driverName: str
    number: int
    team: str
    gridPosition: int
    finishPosition: int
    fastestLap: str
    averageLapTime: str
    totalLaps: int
    pitStops: List[dict]
    sectors: dict
    deltaToLeader: str
    status: str
    lapTimes: List[dict]

class TelemetryData(BaseModel):
    driverCode: str
    driverName: str
    bestLapTime: str
    averageLapTime: str
    sector1: str
    sector2: str
    sector3: str
    lapTimes: List[Dict[str, Any]]
    sectorComparison: Dict[str, List[float]]

class Prediction(BaseModel):
    round: int
    predictions: List[Dict[str, str]]  # [{"position": "1", "driver": "VER"}, ...]
    timestamp: str

class AIAgent:
    def __init__(self, model="gpt-4o-mini"):
        self.model = model
        self.chat_history = [
            {
                "role": "system", 
                "content": "Jestem ekspertem F1. Analizuję dane FastF1, strategie, porównuję kierowców i odpowiadam na pytania o wyścigi."
            }
        ]

    def ask(self, message: str) -> str:
        if client is None:
            return "Przepraszam, ale nie mam dostępu do OpenAI API. Dodaj swój klucz API w pliku .env aby włączyć funkcjonalność AI."
        
        self.chat_history.append({"role": "user", "content": message})
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=self.chat_history
            )
            reply = response.choices[0].message.content
            self.chat_history.append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            return f"Błąd OpenAI API: {str(e)}"

ai_agent = AIAgent()

def clear_cache_on_startup():
    """Clear FastF1 cache on startup to ensure fresh data"""
    try:
        if os.path.exists(settings.cache_dir):
            shutil.rmtree(settings.cache_dir)
            os.makedirs(settings.cache_dir)
            print(f"Cache cleared and recreated: {settings.cache_dir}")
    except Exception as e:
        print(f"Warning: Could not clear cache: {e}")

@app.on_event("startup")
async def startup_event():
    """Clear cache on startup"""
    clear_cache_on_startup()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

def get_race_schedule(year: int = None) -> List[RaceInfo]:
    """Get F1 race schedule for a year using Ergast API"""
    if year is None:
        year = datetime.now().year
    
    try:
        print(f"Fetching race schedule for year: {year}")
        from fastf1.ergast import Ergast
        ergast = Ergast()
        schedule = ergast.get_race_schedule(year)
        
        print(f"Schedule data received: {len(schedule) if schedule is not None else 0} races found")
        
        if schedule is None or len(schedule) == 0:
            print(f"No races found for year {year}")
            return []
        
        races = []
        for _, race in schedule.iterrows():
            try:
                # Parse race data from Ergast DataFrame format
                race_info = RaceInfo(
                    year=year,
                    round=int(race['round']),
                    name=race['raceName'],
                    circuit=race['circuitName'],
                    country=race['country'],
                    startDate=race['raceDate'].strftime('%Y-%m-%d') if pd.notna(race['raceDate']) else '',
                    endDate=race['raceDate'].strftime('%Y-%m-%d') if pd.notna(race['raceDate']) else ''
                )
                races.append(race_info)
                print(f"Added race: {race_info.name} ({race_info.country}) - Round {race_info.round}")
            except Exception as e:
                print(f"Error parsing race data: {e}")
                continue
        
        print(f"Successfully parsed {len(races)} races")
        return races
        
    except Exception as e:
        print(f"Error getting race schedule from Ergast: {e}")
        return []

def get_latest_race() -> RaceInfo:
    """Get the latest race from FastF1"""
    try:
        current_year = datetime.now().year
        races = get_race_schedule(current_year)
        
        if races:
            # Get the most recent race
            return races[-1]
        
        # Fallback to a known recent race
        return RaceInfo(
            year=2024,
            round=8,
            name='Monaco Grand Prix',
            circuit='Monaco',
            country='Monaco',
            startDate='2024-05-26',
            endDate='2024-05-26'
        )
    except Exception as e:
        print(f"Error getting latest race: {e}")
        return RaceInfo(
            year=2024,
            round=8,
            name='Monaco Grand Prix',
            circuit='Monaco',
            country='Monaco',
            startDate='2024-05-26',
            endDate='2024-05-26'
        )

@app.get("/races", response_model=List[RaceInfo])
async def get_races():
    """Get last 3 races for current year"""
    print("=== RACES ENDPOINT CALLED ===")
    try:
        current_year = datetime.now().year
        print(f"Getting races for year: {current_year}")
        
        races = get_race_schedule(current_year)
        
        if not races:
            print("No races found - returning error response")
            return JSONResponse(
                status_code=404,
                content={"error": "No races found for this season"}
            )
        
        # Sort races by date and get the last 3
        try:
            print(f"Total races found: {len(races)}")
            
            # Convert date strings to datetime objects for sorting
            for race in races:
                if race.startDate:
                    race._sort_date = datetime.strptime(race.startDate, '%Y-%m-%d')
                    print(f"Race: {race.name} - Date: {race.startDate} - Sort date: {race._sort_date}")
                else:
                    race._sort_date = datetime.min
                    print(f"Race: {race.name} - No date - Sort date: {race._sort_date}")
            
            # Sort by date (most recent first)
            races.sort(key=lambda x: x._sort_date, reverse=True)
            
            # Get only the last 3 races
            last_3_races = races[:3]
            
            # Remove the temporary sort date attribute
            for race in last_3_races:
                if hasattr(race, '_sort_date'):
                    delattr(race, '_sort_date')
            
            print(f"Returning last 3 races: {[f'{r.name} ({r.country})' for r in last_3_races]}")
            return last_3_races
            
        except Exception as sort_error:
            print(f"Error sorting races by date: {sort_error}")
            # Fallback: return first 3 races if sorting fails
            return races[:3]
            
    except Exception as e:
        print(f"Error getting races: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to fetch races: {str(e)}"}
        )

@app.get("/races/{round}/sessions", response_model=List[SessionInfo])
async def get_race_sessions(round: int):
    """Get all sessions for a specific race"""
    try:
        current_year = datetime.now().year
        current_date = datetime.now()
        
        # Define session types and their order
        session_types = ['FP1', 'FP2', 'FP3', 'Q', 'R']
        session_names = ['Free Practice 1', 'Free Practice 2', 'Free Practice 3', 'Qualifying', 'Race']
        
        sessions = []
        
        for i, session_type in enumerate(session_types):
            try:
                session = fastf1.get_session(current_year, round, session_type)
                
                # Check if session exists and get its date
                if hasattr(session, 'event') and session.event is not None:
                    session_date = session.event['EventDate']
                    
                    if pd.notna(session_date):
                        # Determine status
                        if session_date.date() < current_date.date():
                            status = 'completed'
                        elif session_date.date() == current_date.date():
                            status = 'ongoing'
                        else:
                            status = 'upcoming'
                        
                        # Try to get results if completed
                        results = None
                        if status == 'completed':
                            try:
                                session.load()
                                if hasattr(session, 'results') and session.results is not None:
                                    results = []
                                    for _, driver in session.results.iterrows():
                                        results.append({
                                            'position': int(driver['Position']) if not pd.isna(driver['Position']) else 0,
                                            'driverCode': driver['Abbreviation'],
                                            'driverName': f"{driver['FirstName']} {driver['LastName']}",
                                            'team': driver['TeamName'],
                                            'time': format_time(driver.get('Time', None)) if 'Time' in driver else 'N/A',
                                            'gap': format_delta(driver.get('GapToLeader', None)) if 'GapToLeader' in driver else '',
                                            'status': driver.get('Status', 'Finished')
                                        })
                                    # Sort by position
                                    results.sort(key=lambda x: x['position'])
                            except Exception as e:
                                print(f"Could not load results for {session_type}: {e}")
                        
                        sessions.append(SessionInfo(
                            name=session_names[i],
                            date=session_date.strftime('%Y-%m-%d %H:%M'),
                            status=status,
                            results=results
                        ))
                    else:
                        # Session exists but no date
                        sessions.append(SessionInfo(
                            name=session_names[i],
                            date='TBD',
                            status='upcoming'
                        ))
                else:
                    # Session doesn't exist
                    sessions.append(SessionInfo(
                        name=session_names[i],
                        date='N/A',
                        status='upcoming'
                    ))
                    
            except Exception as e:
                print(f"Error getting session {session_type}: {e}")
                sessions.append(SessionInfo(
                    name=session_names[i],
                    date='N/A',
                    status='upcoming'
                ))
        
        return sessions
        
    except Exception as e:
        print(f"Error getting race sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch race sessions: {str(e)}")

@app.get("/races/{round}/telemetry/{driver_code}", response_model=TelemetryData)
async def get_driver_telemetry(round: int, driver_code: str):
    """Get telemetry data for a specific driver in a race"""
    try:
        current_year = datetime.now().year
        
        # Try to get race session
        session = fastf1.get_session(current_year, round, 'R')
        session.load()
        
        # Get driver data
        driver_data = session.get_driver(driver_code)
        if driver_data is None:
            raise HTTPException(status_code=404, detail="Driver not found")
        
        # Get lap times
        laps = driver_data.laps
        valid_laps = laps[laps['LapTime'].notna()]
        
        # Get fastest lap
        fastest_lap = laps.pick_fastest()
        fastest_lap_time = fastest_lap['LapTime'].total_seconds() if fastest_lap is not None else None
        
        # Calculate average lap time
        avg_lap_time = valid_laps['LapTime'].mean().total_seconds() if not valid_laps.empty else None
        
        # Get sector times for fastest lap
        sectors = {
            'sector1': 'N/A',
            'sector2': 'N/A', 
            'sector3': 'N/A'
        }
        
        if fastest_lap is not None:
            sectors = {
                'sector1': format_time(fastest_lap['Sector1Time'].total_seconds()) if fastest_lap['Sector1Time'] is not None else 'N/A',
                'sector2': format_time(fastest_lap['Sector2Time'].total_seconds()) if fastest_lap['Sector2Time'] is not None else 'N/A',
                'sector3': format_time(fastest_lap['Sector3Time'].total_seconds()) if fastest_lap['Sector3Time'] is not None else 'N/A'
            }
        
        # Get lap times for chart
        lap_times = []
        sector_comparison = {'sector1': [], 'sector2': [], 'sector3': []}
        
        for _, lap in valid_laps.iterrows():
            if lap['LapTime'] is not None:
                lap_time = lap['LapTime'].total_seconds()
                lap_times.append({
                    'lap': int(lap['LapNumber']),
                    'time': lap_time
                })
                
                # Collect sector times for comparison
                if lap['Sector1Time'] is not None:
                    sector_comparison['sector1'].append(lap['Sector1Time'].total_seconds())
                if lap['Sector2Time'] is not None:
                    sector_comparison['sector2'].append(lap['Sector2Time'].total_seconds())
                if lap['Sector3Time'] is not None:
                    sector_comparison['sector3'].append(lap['Sector3Time'].total_seconds())
        
        # Get driver info
        results = session.results
        driver_result = results[results['Abbreviation'] == driver_code]
        
        if driver_result.empty:
            raise HTTPException(status_code=404, detail="Driver result not found")
        
        telemetry_data = TelemetryData(
            driverCode=driver_code,
            driverName=f"{driver_result['FirstName'].iloc[0]} {driver_result['LastName'].iloc[0]}",
            bestLapTime=format_time(fastest_lap_time),
            averageLapTime=format_time(avg_lap_time),
            sector1=sectors['sector1'],
            sector2=sectors['sector2'],
            sector3=sectors['sector3'],
            lapTimes=lap_times,
            sectorComparison=sector_comparison
        )
        
        return telemetry_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting driver telemetry: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch driver telemetry: {str(e)}")

@app.post("/races/{round}/prediction")
async def save_prediction(round: int, prediction: Prediction):
    """Save race prediction"""
    try:
        # In a real app, you'd save to a database
        # For now, we'll just return success
        return {
            "message": "Prediction saved successfully",
            "round": round,
            "predictions": prediction.predictions,
            "timestamp": prediction.timestamp
        }
    except Exception as e:
        print(f"Error saving prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save prediction: {str(e)}")

@app.get("/races/{round}/prediction")
async def get_prediction(round: int):
    """Get race prediction (placeholder - would connect to database)"""
    try:
        # In a real app, you'd fetch from database
        # For now, return empty prediction
        return {
            "round": round,
            "predictions": [],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error getting prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch prediction: {str(e)}")

def format_time(seconds) -> str:
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

def format_delta(seconds) -> str:
    """Format delta time"""
    if pd.isna(seconds) or seconds is None:
        return "N/A"
    
    if seconds < 0:
        return f"-{abs(seconds):.3f}"
    else:
        return f"+{seconds:.3f}"

@app.get("/results", response_model=dict)
async def get_results():
    """Get results from the latest race"""
    try:
        race_info = get_latest_race()
        
        # Load race session
        session = fastf1.get_session(race_info.year, race_info.round, 'R')
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
            
            race_results.append(RaceResult(
                position=int(position) if not pd.isna(position) else 0,
                driverCode=driver_code,
                driverName=driver_name,
                team=team,
                time=format_time(finish_time) if finish_time else 'N/A',
                gap=format_delta(gap) if gap else '',
                status=status if status else 'Finished',
                points=points,
                gridPosition=int(grid_position) if not pd.isna(grid_position) else 0
            ))
        
        # Sort by position
        race_results.sort(key=lambda x: x.position)
        
        return {
            'race': race_info.dict(),
            'results': [result.dict() for result in race_results]
        }
        
    except Exception as e:
        print(f"Error getting results: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch race results: {str(e)}")

@app.get("/driver/{driver_code}", response_model=DriverDetails)
async def get_driver_details(driver_code: str):
    """Get detailed driver statistics"""
    try:
        race_info = get_latest_race()
        
        # Load race session
        session = fastf1.get_session(race_info.year, race_info.round, 'R')
        session.load()
        
        # Get driver data
        driver_data = session.get_driver(driver_code)
        if driver_data is None:
            raise HTTPException(status_code=404, detail="Driver not found")
        
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
        
        if driver_result.empty:
            raise HTTPException(status_code=404, detail="Driver result not found")
        
        driver_details = DriverDetails(
            driverCode=driver_code,
            driverName=f"{driver_result['FirstName'].iloc[0]} {driver_result['LastName'].iloc[0]}",
            number=int(driver_result['DriverNumber'].iloc[0]) if not pd.isna(driver_result['DriverNumber'].iloc[0]) else 0,
            team=driver_result['TeamName'].iloc[0],
            gridPosition=int(driver_result['GridPosition'].iloc[0]) if not pd.isna(driver_result['GridPosition'].iloc[0]) else 0,
            finishPosition=int(driver_result['Position'].iloc[0]),
            fastestLap=format_time(fastest_lap_time),
            averageLapTime=format_time(avg_lap_time),
            totalLaps=len(valid_laps),
            pitStops=pit_stops,
            sectors=sectors,
            deltaToLeader=format_delta(driver_result['GapToLeader'].iloc[0]) if 'GapToLeader' in driver_result.columns else 'N/A',
            status=driver_result['Status'].iloc[0],
            lapTimes=lap_times
        )
        
        return driver_details
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting driver details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch driver details: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """Handle chat messages with AI"""
    try:
        if not message.message:
            raise HTTPException(status_code=400, detail="No message provided")
        
        # Get AI response
        reply = ai_agent.ask(message.message)
        
        return ChatResponse(reply=reply)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
