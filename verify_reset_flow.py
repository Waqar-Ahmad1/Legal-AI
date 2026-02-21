import requests
import json
import time

BASE_URL = "http://localhost:8000"
TEST_EMAIL = "legalaitest@gmail.com"  # Needs to be a gmail as per backend rules

def test_password_reset_flow():
    print("Starting Forgot Password Flow Verification...")
    
    # 1. Request forgot password
    print(f"Requesting password reset for {TEST_EMAIL}...")
    response = requests.post(f"{BASE_URL}/forgot-password", json={"email": TEST_EMAIL})
    print(f"Response: {response.status_code}, {response.json()}")
    
    if response.status_code != 200:
        print("❌ Forgot password request failed.")
        return

    # 2. In a real scenario, we'd check the email. 
    # Here, we'll assume the token is in the DB.
    # For verification purposes, I'll use the /debug/users endpoint if available to see the token
    # (The backend has /debug/users which returns user data without passwords)
    
    print("Fetching reset token from debug endpoint...")
    debug_response = requests.get(f"{BASE_URL}/debug/users")
    users = debug_response.json().get("data", [])
    
    test_user = next((u for u in users if u["email"] == TEST_EMAIL), None)
    
    if not test_user:
        print(f"❌ Test user {TEST_EMAIL} not found in DB. Please register it first.")
        return
    
    token = test_user.get("reset_token")
    if not token:
        print("❌ Reset token not found for user. Check backend logs.")
        return
    
    print(f"Found token: {token[:10]}...")

    # 3. Reset password
    NEW_PASSWORD = "newsecurepassword123"
    print(f"Resetting password with token...")
    reset_response = requests.post(f"{BASE_URL}/reset-password", json={
        "token": token,
        "password": NEW_PASSWORD
    })
    print(f"Response: {reset_response.status_code}, {reset_response.json()}")
    
    if reset_response.status_code == 200 and reset_response.json().get("success"):
        print("Password reset successful!")
    else:
        print("Password reset failed.")
        return

    # 4. Try logging in with new password
    print("Verifying login with new password...")
    login_response = requests.post(f"{BASE_URL}/login", json={
        "email": TEST_EMAIL,
        "password": NEW_PASSWORD
    })
    print(f"Response: {login_response.status_code}")
    
    if login_response.status_code == 200 and login_response.json().get("success"):
        print("Entire flow verified successfully!")
    else:
        print("Login failed with new password.")

if __name__ == "__main__":
    try:
        test_password_reset_flow()
    except Exception as e:
        print(f"Error during verification: {e}")
