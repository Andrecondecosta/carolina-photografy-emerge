import requests
import sys
import json
from datetime import datetime
import base64
import os

class LuminaAPITester:
    def __init__(self, base_url="https://photoshare-419.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_credentials = {
            "email": "admin@lumina.com",
            "password": "admin123"
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.admin_token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for file uploads
                    if 'Content-Type' in test_headers:
                        del test_headers['Content-Type']
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_credentials
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        test_user = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User"
        }
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        if success and 'token' in response:
            self.user_token = response['token']
            print(f"   User token obtained: {self.user_token[:20]}...")
            return True, test_user
        return False, None

    def test_user_login(self, user_data):
        """Test user login"""
        login_data = {
            "email": user_data["email"],
            "password": user_data["password"]
        }
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        return success

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        return self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200
        )

    def test_create_event(self):
        """Test event creation"""
        event_data = {
            "name": f"Test Event {datetime.now().strftime('%H%M%S')}",
            "description": "Test event description",
            "date": "2024-12-31",
            "is_public": True
        }
        success, response = self.run_test(
            "Create Event",
            "POST",
            "events",
            200,
            data=event_data
        )
        if success and 'event_id' in response:
            return True, response['event_id']
        return False, None

    def test_get_events(self):
        """Test getting events"""
        return self.run_test(
            "Get Events",
            "GET",
            "events",
            200
        )

    def test_get_public_events(self):
        """Test getting public events"""
        return self.run_test(
            "Get Public Events",
            "GET",
            "events?public_only=true",
            200
        )

    def test_get_event_by_id(self, event_id):
        """Test getting specific event"""
        return self.run_test(
            "Get Event by ID",
            "GET",
            f"events/{event_id}",
            200
        )

    def test_upload_photo(self, event_id):
        """Test photo upload"""
        # Create a simple test image (1x1 pixel PNG)
        test_image_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77zgAAAABJRU5ErkJggg=='
        )
        
        files = {'file': ('test.png', test_image_data, 'image/png')}
        data = {
            'event_id': event_id,
            'price': '10.0'
        }
        
        success, response = self.run_test(
            "Upload Photo",
            "POST",
            "photos/upload",
            200,
            data=data,
            files=files
        )
        if success and 'photo_id' in response:
            return True, response['photo_id']
        return False, None

    def test_get_event_photos(self, event_id):
        """Test getting photos for an event"""
        headers = {'Authorization': f'Bearer {self.user_token}'}
        return self.run_test(
            "Get Event Photos",
            "GET",
            f"photos/event/{event_id}",
            200,
            headers=headers
        )

    def test_cart_operations(self, photo_id):
        """Test cart add/get/remove operations"""
        headers = {'Authorization': f'Bearer {self.user_token}'}
        
        # Add to cart
        success1, _ = self.run_test(
            "Add to Cart",
            "POST",
            "cart/add",
            200,
            data={"photo_id": photo_id},
            headers=headers
        )
        
        # Get cart
        success2, cart_data = self.run_test(
            "Get Cart",
            "GET",
            "cart",
            200,
            headers=headers
        )
        
        # Remove from cart
        success3, _ = self.run_test(
            "Remove from Cart",
            "DELETE",
            f"cart/remove/{photo_id}",
            200,
            headers=headers
        )
        
        return success1 and success2 and success3

    def test_admin_clients(self):
        """Test admin clients endpoint"""
        return self.run_test(
            "Admin Clients",
            "GET",
            "admin/clients",
            200
        )

    def test_purchases_endpoint(self):
        """Test purchases endpoint"""
        headers = {'Authorization': f'Bearer {self.user_token}'}
        return self.run_test(
            "Get Purchases",
            "GET",
            "purchases",
            200,
            headers=headers
        )

def main():
    print("🚀 Starting Lumina Photography Platform API Tests")
    print("=" * 60)
    
    tester = LuminaAPITester()
    
    # Test 1: Health Check
    if not tester.test_health_check()[0]:
        print("❌ Health check failed, stopping tests")
        return 1

    # Test 2: Admin Login
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1

    # Test 3: Admin Stats
    tester.test_admin_stats()

    # Test 4: User Registration
    user_success, user_data = tester.test_user_registration()
    if not user_success:
        print("❌ User registration failed")
        return 1

    # Test 5: User Login
    if not tester.test_user_login(user_data):
        print("❌ User login failed")

    # Test 6: Events Operations
    tester.test_get_events()
    tester.test_get_public_events()
    
    event_success, event_id = tester.test_create_event()
    if event_success:
        tester.test_get_event_by_id(event_id)
        
        # Test 7: Photo Upload
        photo_success, photo_id = tester.test_upload_photo(event_id)
        if photo_success:
            # Test 8: Photo Operations
            tester.test_get_event_photos(event_id)
            
            # Test 9: Cart Operations
            tester.test_cart_operations(photo_id)

    # Test 10: Admin Operations
    tester.test_admin_clients()
    
    # Test 11: Purchases
    tester.test_purchases_endpoint()

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure.get('test', 'Unknown')}: {failure}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())