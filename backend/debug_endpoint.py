#!/usr/bin/env python3

import requests
import json

def test_races_endpoint():
    print("Testing races endpoint...")
    
    try:
        response = requests.get("http://127.0.0.1:8000/races")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Data type: {type(data)}")
            print(f"Data length: {len(data)}")
            
            if data:
                print("First race:")
                print(json.dumps(data[0], indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_races_endpoint()
