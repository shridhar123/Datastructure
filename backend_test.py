#!/usr/bin/env python3
"""
Backend Test Suite for Client and ICyte File Upload Functionality
Tests separate upload functionality with file_source parameter and filtering
"""

import requests
import json
import os
import tempfile
import pandas as pd
from pathlib import Path
import time

# Get backend URL from frontend .env
def get_backend_url():
    frontend_env_path = Path("/app/frontend/.env")
    if frontend_env_path.exists():
        with open(frontend_env_path, 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    base_url = line.split('=', 1)[1].strip()
                    return f"{base_url}/api"
    return "http://localhost:8001/api"

BASE_URL = get_backend_url()
print(f"Testing backend at: {BASE_URL}")

class FileUploadTester:
    def __init__(self):
        self.test_results = []
        self.uploaded_file_ids = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
    
    def create_test_files(self):
        """Create sample test files for upload testing"""
        test_files = {}
        
        # Create temporary directory for test files
        temp_dir = Path(tempfile.mkdtemp())
        
        # Create sample PDF content (simple text file with .pdf extension for testing)
        pdf_path = temp_dir / "sample_invoice.pdf"
        with open(pdf_path, 'w') as f:
            f.write("Sample PDF content for testing - Invoice #12345\nAmount: $1000.00\nDate: 2024-01-15")
        test_files['pdf'] = pdf_path
        
        # Create sample Excel file
        excel_path = temp_dir / "client_data.xlsx"
        client_data = {
            'Product_ID': ['P001', 'P002', 'P003'],
            'Product_Name': ['Widget A', 'Widget B', 'Widget C'],
            'Quantity': [100, 250, 75],
            'Unit_Price': [15.99, 25.50, 8.75],
            'Total_Amount': [1599.00, 6375.00, 656.25]
        }
        df = pd.DataFrame(client_data)
        df.to_excel(excel_path, index=False)
        test_files['excel'] = excel_path
        
        # Create sample CSV file
        csv_path = temp_dir / "icyte_report.csv"
        icyte_data = {
            'NDC': ['12345-678-90', '23456-789-01', '34567-890-12'],
            'Drug_Name': ['Medication A', 'Medication B', 'Medication C'],
            'Quantity_Dispensed': [120, 240, 90],
            'Unit_Cost': [12.50, 18.75, 22.00],
            'Total_Cost': [1500.00, 4500.00, 1980.00]
        }
        df_csv = pd.DataFrame(icyte_data)
        df_csv.to_csv(csv_path, index=False)
        test_files['csv'] = csv_path
        
        return test_files
    
    def test_client_file_uploads(self, test_files):
        """Test uploading Client files (PDF, Excel, CSV) - all should succeed"""
        print("\n=== Testing Client File Uploads ===")
        
        for file_type, file_path in test_files.items():
            try:
                with open(file_path, 'rb') as f:
                    files = {'files': (file_path.name, f, self.get_mime_type(file_type))}
                    data = {'file_source': 'Client'}
                    
                    response = requests.post(f"{BASE_URL}/upload-files", files=files, data=data)
                    
                    if response.status_code == 200:
                        result = response.json()
                        uploaded_files = result.get('uploaded_files', [])
                        
                        if uploaded_files:
                            file_info = uploaded_files[0]
                            self.uploaded_file_ids.append(file_info['id'])
                            
                            # Verify file_source is set correctly
                            if file_info.get('file_source') == 'Client':
                                self.log_result(
                                    f"Client {file_type.upper()} Upload",
                                    True,
                                    f"Successfully uploaded {file_type} file with Client source",
                                    {
                                        "file_id": file_info['id'],
                                        "filename": file_info['filename'],
                                        "file_source": file_info['file_source'],
                                        "file_type": file_info['file_type']
                                    }
                                )
                            else:
                                self.log_result(
                                    f"Client {file_type.upper()} Upload",
                                    False,
                                    f"File uploaded but file_source incorrect: {file_info.get('file_source')}",
                                    file_info
                                )
                        else:
                            self.log_result(
                                f"Client {file_type.upper()} Upload",
                                False,
                                "No files returned in response",
                                result
                            )
                    else:
                        self.log_result(
                            f"Client {file_type.upper()} Upload",
                            False,
                            f"Upload failed with status {response.status_code}",
                            {"response": response.text}
                        )
                        
            except Exception as e:
                self.log_result(
                    f"Client {file_type.upper()} Upload",
                    False,
                    f"Exception during upload: {str(e)}"
                )
    
    def test_icyte_file_uploads(self, test_files):
        """Test uploading ICyte files (Excel/CSV should succeed, PDF should be skipped)"""
        print("\n=== Testing ICyte File Uploads ===")
        
        for file_type, file_path in test_files.items():
            try:
                with open(file_path, 'rb') as f:
                    files = {'files': (file_path.name, f, self.get_mime_type(file_type))}
                    data = {'file_source': 'ICyte'}
                    
                    response = requests.post(f"{BASE_URL}/upload-files", files=files, data=data)
                    
                    if response.status_code == 200:
                        result = response.json()
                        uploaded_files = result.get('uploaded_files', [])
                        
                        if file_type == 'pdf':
                            # PDF should be skipped for ICyte uploads
                            if len(uploaded_files) == 0:
                                self.log_result(
                                    f"ICyte {file_type.upper()} Upload (Skip Test)",
                                    True,
                                    "PDF correctly skipped for ICyte upload",
                                    {"count": result.get('count', 0)}
                                )
                            else:
                                self.log_result(
                                    f"ICyte {file_type.upper()} Upload (Skip Test)",
                                    False,
                                    "PDF was not skipped - should have been rejected",
                                    result
                                )
                        else:
                            # Excel and CSV should succeed
                            if uploaded_files:
                                file_info = uploaded_files[0]
                                self.uploaded_file_ids.append(file_info['id'])
                                
                                if file_info.get('file_source') == 'ICyte':
                                    self.log_result(
                                        f"ICyte {file_type.upper()} Upload",
                                        True,
                                        f"Successfully uploaded {file_type} file with ICyte source",
                                        {
                                            "file_id": file_info['id'],
                                            "filename": file_info['filename'],
                                            "file_source": file_info['file_source'],
                                            "file_type": file_info['file_type']
                                        }
                                    )
                                else:
                                    self.log_result(
                                        f"ICyte {file_type.upper()} Upload",
                                        False,
                                        f"File uploaded but file_source incorrect: {file_info.get('file_source')}",
                                        file_info
                                    )
                            else:
                                self.log_result(
                                    f"ICyte {file_type.upper()} Upload",
                                    False,
                                    f"{file_type} file should have been uploaded but wasn't",
                                    result
                                )
                    else:
                        self.log_result(
                            f"ICyte {file_type.upper()} Upload",
                            False,
                            f"Upload failed with status {response.status_code}",
                            {"response": response.text}
                        )
                        
            except Exception as e:
                self.log_result(
                    f"ICyte {file_type.upper()} Upload",
                    False,
                    f"Exception during upload: {str(e)}"
                )
    
    def test_file_filtering(self):
        """Test filtering uploads by file_source"""
        print("\n=== Testing File Source Filtering ===")
        
        # Test getting all files
        try:
            response = requests.get(f"{BASE_URL}/uploads")
            if response.status_code == 200:
                all_files = response.json().get('uploads', [])
                self.log_result(
                    "Get All Uploads",
                    True,
                    f"Retrieved {len(all_files)} total files",
                    {"count": len(all_files)}
                )
            else:
                self.log_result(
                    "Get All Uploads",
                    False,
                    f"Failed to get all uploads: {response.status_code}",
                    {"response": response.text}
                )
        except Exception as e:
            self.log_result(
                "Get All Uploads",
                False,
                f"Exception getting all uploads: {str(e)}"
            )
        
        # Test filtering by Client
        try:
            response = requests.get(f"{BASE_URL}/uploads?file_source=Client")
            if response.status_code == 200:
                client_files = response.json().get('uploads', [])
                
                # Verify all returned files have file_source=Client
                all_client = all(f.get('file_source') == 'Client' for f in client_files)
                
                if all_client:
                    self.log_result(
                        "Filter Client Files",
                        True,
                        f"Retrieved {len(client_files)} Client files, all correctly filtered",
                        {"count": len(client_files), "files": [f['filename'] for f in client_files]}
                    )
                else:
                    non_client = [f for f in client_files if f.get('file_source') != 'Client']
                    self.log_result(
                        "Filter Client Files",
                        False,
                        f"Found {len(non_client)} non-Client files in Client filter",
                        {"non_client_files": non_client}
                    )
            else:
                self.log_result(
                    "Filter Client Files",
                    False,
                    f"Failed to filter Client files: {response.status_code}",
                    {"response": response.text}
                )
        except Exception as e:
            self.log_result(
                "Filter Client Files",
                False,
                f"Exception filtering Client files: {str(e)}"
            )
        
        # Test filtering by ICyte
        try:
            response = requests.get(f"{BASE_URL}/uploads?file_source=ICyte")
            if response.status_code == 200:
                icyte_files = response.json().get('uploads', [])
                
                # Verify all returned files have file_source=ICyte
                all_icyte = all(f.get('file_source') == 'ICyte' for f in icyte_files)
                
                if all_icyte:
                    self.log_result(
                        "Filter ICyte Files",
                        True,
                        f"Retrieved {len(icyte_files)} ICyte files, all correctly filtered",
                        {"count": len(icyte_files), "files": [f['filename'] for f in icyte_files]}
                    )
                else:
                    non_icyte = [f for f in icyte_files if f.get('file_source') != 'ICyte']
                    self.log_result(
                        "Filter ICyte Files",
                        False,
                        f"Found {len(non_icyte)} non-ICyte files in ICyte filter",
                        {"non_icyte_files": non_icyte}
                    )
            else:
                self.log_result(
                    "Filter ICyte Files",
                    False,
                    f"Failed to filter ICyte files: {response.status_code}",
                    {"response": response.text}
                )
        except Exception as e:
            self.log_result(
                "Filter ICyte Files",
                False,
                f"Exception filtering ICyte files: {str(e)}"
            )
    
    def test_file_metadata_verification(self):
        """Test that uploaded files have correct metadata"""
        print("\n=== Testing File Metadata Verification ===")
        
        if not self.uploaded_file_ids:
            self.log_result(
                "Metadata Verification",
                False,
                "No uploaded files to verify metadata"
            )
            return
        
        # Get all uploads and verify metadata for our uploaded files
        try:
            response = requests.get(f"{BASE_URL}/uploads")
            if response.status_code == 200:
                all_files = response.json().get('uploads', [])
                our_files = [f for f in all_files if f['id'] in self.uploaded_file_ids]
                
                metadata_issues = []
                for file_info in our_files:
                    # Check required metadata fields
                    required_fields = ['id', 'filename', 'file_source', 'file_type', 'file_type_tag', 'file_size']
                    missing_fields = [field for field in required_fields if field not in file_info]
                    
                    if missing_fields:
                        metadata_issues.append(f"File {file_info['id']}: Missing fields {missing_fields}")
                    
                    # Verify file_source is valid
                    if file_info.get('file_source') not in ['Client', 'ICyte']:
                        metadata_issues.append(f"File {file_info['id']}: Invalid file_source '{file_info.get('file_source')}'")
                    
                    # Verify file_type matches file_type_tag
                    file_type = file_info.get('file_type')
                    file_type_tag = file_info.get('file_type_tag')
                    expected_tags = {'pdf': 'PDF', 'excel': 'Excel', 'csv': 'CSV'}
                    
                    if file_type in expected_tags and file_type_tag != expected_tags[file_type]:
                        metadata_issues.append(f"File {file_info['id']}: file_type_tag mismatch - expected {expected_tags[file_type]}, got {file_type_tag}")
                
                if not metadata_issues:
                    self.log_result(
                        "File Metadata Verification",
                        True,
                        f"All {len(our_files)} uploaded files have correct metadata",
                        {"verified_files": len(our_files)}
                    )
                else:
                    self.log_result(
                        "File Metadata Verification",
                        False,
                        f"Found {len(metadata_issues)} metadata issues",
                        {"issues": metadata_issues}
                    )
            else:
                self.log_result(
                    "File Metadata Verification",
                    False,
                    f"Failed to get uploads for metadata verification: {response.status_code}"
                )
        except Exception as e:
            self.log_result(
                "File Metadata Verification",
                False,
                f"Exception during metadata verification: {str(e)}"
            )
    
    def test_invalid_file_source(self):
        """Test that invalid file_source values are rejected"""
        print("\n=== Testing Invalid File Source Validation ===")
        
        try:
            # Create a simple test file
            temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
            temp_file.write("test content")
            temp_file.close()
            
            with open(temp_file.name, 'rb') as f:
                files = {'files': ('test.txt', f, 'text/plain')}
                data = {'file_source': 'InvalidSource'}
                
                response = requests.post(f"{BASE_URL}/upload-files", files=files, data=data)
                
                if response.status_code == 400:
                    self.log_result(
                        "Invalid File Source Validation",
                        True,
                        "Invalid file_source correctly rejected with 400 status",
                        {"status_code": response.status_code}
                    )
                else:
                    self.log_result(
                        "Invalid File Source Validation",
                        False,
                        f"Invalid file_source not rejected - got status {response.status_code}",
                        {"response": response.text}
                    )
            
            # Clean up
            os.unlink(temp_file.name)
            
        except Exception as e:
            self.log_result(
                "Invalid File Source Validation",
                False,
                f"Exception testing invalid file_source: {str(e)}"
            )
    
    def get_mime_type(self, file_type):
        """Get MIME type for file type"""
        mime_types = {
            'pdf': 'application/pdf',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv'
        }
        return mime_types.get(file_type, 'application/octet-stream')
    
    def cleanup_test_files(self):
        """Clean up uploaded test files"""
        print("\n=== Cleaning Up Test Files ===")
        
        for file_id in self.uploaded_file_ids:
            try:
                response = requests.delete(f"{BASE_URL}/file/{file_id}")
                if response.status_code == 200:
                    print(f"✅ Cleaned up file {file_id}")
                else:
                    print(f"⚠️  Failed to clean up file {file_id}: {response.status_code}")
            except Exception as e:
                print(f"⚠️  Exception cleaning up file {file_id}: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Backend Tests for Client and ICyte File Upload Functionality")
        print("=" * 80)
        
        # Create test files
        test_files = self.create_test_files()
        print(f"📁 Created test files: {list(test_files.keys())}")
        
        # Run tests
        self.test_client_file_uploads(test_files)
        self.test_icyte_file_uploads(test_files)
        self.test_file_filtering()
        self.test_file_metadata_verification()
        self.test_invalid_file_source()
        
        # Print summary
        self.print_summary()
        
        # Cleanup
        self.cleanup_test_files()
        
        return self.test_results
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result['success'])
        failed = len(self.test_results) - passed
        
        print(f"Total Tests: {len(self.test_results)}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = FileUploadTester()
    results = tester.run_all_tests()