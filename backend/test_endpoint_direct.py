#!/usr/bin/env python3

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import get_races
import asyncio

async def test_races_endpoint():
    print("Testing races endpoint function directly...")
    
    try:
        result = await get_races()
        print(f"Result type: {type(result)}")
        print(f"Result: {result}")
        
        if hasattr(result, 'body'):
            print(f"Response body: {result.body}")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_races_endpoint())
