#!/usr/bin/env python3

from fastf1.ergast import Ergast
import pandas as pd
from datetime import datetime

def test_ergast_api():
    print("Testing Ergast API directly...")
    
    ergast = Ergast()
    
    # Test with 2024
    print("\n=== Testing 2024 ===")
    try:
        schedule_2024 = ergast.get_race_schedule(2024)
        print(f"Found {len(schedule_2024)} races for 2024")
        print("Columns:", list(schedule_2024.columns))
        
        if len(schedule_2024) > 0:
            print("First 3 races:")
            for i, (_, race) in enumerate(schedule_2024.head(3).iterrows()):
                print(f"  {i+1}. {race['raceName']} ({race['country']}) - Round {race['round']} - Date: {race['raceDate']}")
    except Exception as e:
        print(f"Error with 2024: {e}")
    
    # Test with current year
    current_year = datetime.now().year
    print(f"\n=== Testing {current_year} ===")
    try:
        schedule_current = ergast.get_race_schedule(current_year)
        print(f"Found {len(schedule_current)} races for {current_year}")
        
        if len(schedule_current) > 0:
            print("First 3 races:")
            for i, (_, race) in enumerate(schedule_current.head(3).iterrows()):
                print(f"  {i+1}. {race['raceName']} ({race['country']}) - Round {race['round']} - Date: {race['raceDate']}")
        else:
            print("No races found for current year")
    except Exception as e:
        print(f"Error with {current_year}: {e}")

if __name__ == "__main__":
    test_ergast_api()
