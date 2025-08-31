#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import get_race_schedule
from datetime import datetime

def test_race_schedule():
    print("Testing race schedule function...")
    
    # Test with 2024
    print("\n=== Testing 2024 ===")
    races_2024 = get_race_schedule(2024)
    print(f"Found {len(races_2024)} races for 2024")
    for race in races_2024[:3]:  # Show first 3
        print(f"  - {race.name} ({race.country}) - Round {race.round}")
    
    # Test with current year
    current_year = datetime.now().year
    print(f"\n=== Testing {current_year} ===")
    races_current = get_race_schedule(current_year)
    print(f"Found {len(races_current)} races for {current_year}")
    for race in races_current[:3]:  # Show first 3
        print(f"  - {race.name} ({race.country}) - Round {race.round}")

if __name__ == "__main__":
    test_race_schedule()
