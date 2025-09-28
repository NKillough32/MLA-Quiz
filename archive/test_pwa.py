#!/usr/bin/env python3
"""
Quick test script to verify the PWA backend is working correctly
"""

import requests
import json

BASE_URL = "http://127.0.0.1:5000"

def test_api():
    print("Testing MLA Quiz PWA API...")
    
    try:
        # Test 1: Check if server is running
        print(f"\n1. Testing server health at {BASE_URL}")
        response = requests.get(BASE_URL, timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Server is running")
        else:
            print("   ❌ Server not responding correctly")
            return
        
        # Test 2: Test quizzes endpoint
        print(f"\n2. Testing /api/quizzes endpoint")
        response = requests.get(f"{BASE_URL}/api/quizzes", timeout=5)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ API responding with {len(data.get('quizzes', []))} quizzes")
            
            if data.get('quizzes'):
                first_quiz = data['quizzes'][0]
                print(f"   First quiz: {first_quiz['name']}")
                
                # Test 3: Load a specific quiz
                print(f"\n3. Testing quiz loading for '{first_quiz['name']}'")
                quiz_response = requests.get(f"{BASE_URL}/api/quiz/{first_quiz['name']}", timeout=10)
                print(f"   Status: {quiz_response.status_code}")
                
                if quiz_response.status_code == 200:
                    quiz_data = quiz_response.json()
                    questions = quiz_data.get('questions', [])
                    print(f"   ✅ Quiz loaded with {len(questions)} questions")
                    
                    if questions:
                        first_q = questions[0]
                        print(f"   First question: {first_q.get('title', 'No title')}")
                        print(f"   Specialty: {first_q.get('specialty', 'None')}")
                        print(f"   Has investigations: {'Yes' if first_q.get('investigations') else 'No'}")
                        print(f"   Options: {len(first_q.get('options', []))}")
                    
                else:
                    quiz_error = quiz_response.json()
                    print(f"   ❌ Quiz loading failed: {quiz_error.get('error', 'Unknown error')}")
            else:
                print("   ⚠️  No quizzes found - check that .md files exist in Questions folder")
        else:
            print(f"   ❌ API failed with status {response.status_code}")
    
    except requests.exceptions.ConnectionError:
        print("   ❌ Cannot connect to server - make sure Flask app is running")
    except requests.exceptions.Timeout:
        print("   ❌ Request timed out")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_api()