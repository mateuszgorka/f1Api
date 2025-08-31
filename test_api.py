#!/usr/bin/env python3
"""
Simple test script for F1 API Assistant Pro
Run this after starting the Docker container to verify endpoints
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")

def test_results():
    """Test results endpoint"""
    print("\n🏁 Testing results endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/results")
        if response.status_code == 200:
            print("✅ Results endpoint working")
            data = response.json()
            print(f"   Race: {data['race']['name']}")
            print(f"   Drivers: {len(data['results'])}")
        else:
            print(f"❌ Results endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Results endpoint error: {e}")

def test_driver_details():
    """Test driver details endpoint"""
    print("\n👤 Testing driver details endpoint...")
    try:
        # Test with a common driver code
        response = requests.get(f"{BASE_URL}/driver/LEC")
        if response.status_code == 200:
            print("✅ Driver details endpoint working")
            data = response.json()
            print(f"   Driver: {data['driverName']}")
            print(f"   Team: {data['team']}")
        else:
            print(f"❌ Driver details endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Driver details endpoint error: {e}")

def test_chat():
    """Test chat endpoint"""
    print("\n💬 Testing chat endpoint...")
    try:
        message = {"message": "Jakie były najlepsze czasy okrążeń w ostatnim wyścigu?"}
        response = requests.post(f"{BASE_URL}/chat", json=message)
        if response.status_code == 200:
            print("✅ Chat endpoint working")
            data = response.json()
            print(f"   AI Response: {data['reply'][:100]}...")
        else:
            print(f"❌ Chat endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Chat endpoint error: {e}")

def main():
    """Run all tests"""
    print("🧪 F1 API Assistant Pro - API Test Suite")
    print("=" * 50)
    
    # Wait a bit for the container to fully start
    print("⏳ Waiting for container to start...")
    time.sleep(5)
    
    test_health()
    test_results()
    test_driver_details()
    test_chat()
    
    print("\n" + "=" * 50)
    print("🎯 Test suite completed!")
    print("\n📱 To access from mobile:")
    print("1. Find your computer's IP: ipconfig (Windows) or ifconfig (Linux/Mac)")
    print("2. Access: http://<YOUR_IP>:8000")

if __name__ == "__main__":
    main()
