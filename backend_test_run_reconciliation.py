#!/usr/bin/env python3
"""
Backend Test Suite for COMPLETE Run Reconciliation Flow
Tests the complete reconciliation flow from configuration to report generation with new formula format
"""

import requests
import json
import os
import tempfile
import pandas as pd
from pathlib import Path
import time
import re

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

class RunReconciliationFlowTester:
    def __init__(self):
        self.test_results = []
        self.client_file_id = None
        self.icyte_file_id = None
        self.config_id = None
        self.report_id = None
        
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
    
    def test_upload_test_files(self):
        """Test Step 1: Upload test files from /tmp"""
        print("\n=== Testing Upload Test Files ===")
        
        # Upload Client file
        try:
            with open('/tmp/test_client_data.csv', 'rb') as f:
                files = {'files': ('test_client_data.csv', f, 'text/csv')}
                data = {'file_source': 'Client'}
                
                response = requests.post(f"{BASE_URL}/upload-files", files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    uploaded_files = result.get('uploaded_files', [])
                    if uploaded_files:
                        self.client_file_id = uploaded_files[0]['id']
                        self.log_result(
                            "Upload Client Test File",
                            True,
                            f"Successfully uploaded client CSV file",
                            {"file_id": self.client_file_id, "filename": uploaded_files[0]['filename']}
                        )
                    else:
                        self.log_result("Upload Client Test File", False, "No files returned")
                        return False
                else:
                    self.log_result("Upload Client Test File", False, f"Upload failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log_result("Upload Client Test File", False, f"Exception: {str(e)}")
            return False
        
        # Upload ICyte file
        try:
            with open('/tmp/test_icyte_data.csv', 'rb') as f:
                files = {'files': ('test_icyte_data.csv', f, 'text/csv')}
                data = {'file_source': 'ICyte'}
                
                response = requests.post(f"{BASE_URL}/upload-files", files=files, data=data)
                
                if response.status_code == 200:
                    result = response.json()
                    uploaded_files = result.get('uploaded_files', [])
                    if uploaded_files:
                        self.icyte_file_id = uploaded_files[0]['id']
                        self.log_result(
                            "Upload ICyte Test File",
                            True,
                            f"Successfully uploaded ICyte CSV file",
                            {"file_id": self.icyte_file_id, "filename": uploaded_files[0]['filename']}
                        )
                    else:
                        self.log_result("Upload ICyte Test File", False, "No files returned")
                        return False
                else:
                    self.log_result("Upload ICyte Test File", False, f"Upload failed: {response.status_code} - {response.text}")
                    return False
        except Exception as e:
            self.log_result("Upload ICyte Test File", False, f"Exception: {str(e)}")
            return False
        
        return True
    
    def test_configure_reconciliation_new_format(self):
        """Test Step 2: Configure reconciliation with NEW formula format"""
        print("\n=== Testing Configure Reconciliation with New Formula Format ===")
        
        if not self.client_file_id or not self.icyte_file_id:
            self.log_result("Configure Reconciliation New Format", False, "Missing file IDs for configuration")
            return False
        
        # Get sheet information first
        try:
            client_response = requests.get(f"{BASE_URL}/excel-sheets/{self.client_file_id}")
            icyte_response = requests.get(f"{BASE_URL}/excel-sheets/{self.icyte_file_id}")
            
            if client_response.status_code != 200 or icyte_response.status_code != 200:
                self.log_result("Configure Reconciliation New Format", False, "Failed to get sheet information")
                return False
            
            client_sheets = client_response.json().get('sheets', {})
            icyte_sheets = icyte_response.json().get('sheets', {})
            
            # Get first sheet names
            client_sheet = list(client_sheets.keys())[0] if client_sheets else "Sheet1"
            icyte_sheet = list(icyte_sheets.keys())[0] if icyte_sheets else "Sheet1"
            
        except Exception as e:
            self.log_result("Configure Reconciliation New Format", False, f"Exception getting sheets: {str(e)}")
            return False
        
        # Create reconciliation configuration with NEW formula format
        config_data = {
            "client_file_id": self.client_file_id,
            "icyte_file_id": self.icyte_file_id,
            "client_sheet": client_sheet,
            "icyte_sheet": icyte_sheet,
            "client_unique_key": "NDC11",
            "icyte_unique_key": "NDC11",
            "mappings": [
                {
                    "client_formula": [
                        {"column": "SalesAmount", "operation": None},
                        {"column": "ReturnAmount", "operation": "subtract"}
                    ],
                    "icyte_formula": [
                        {"column": "NetSales", "operation": None}
                    ],
                    "label": "Net Sales"
                },
                {
                    "client_formula": [
                        {"column": "ReturnAmount", "operation": None}
                    ],
                    "icyte_formula": [
                        {"column": "NetReturns", "operation": None}
                    ],
                    "label": "Returns"
                }
            ]
        }
        
        try:
            response = requests.post(f"{BASE_URL}/configure-reconciliation", json=config_data)
            if response.status_code == 200:
                config_result = response.json()
                self.config_id = config_result.get('id')
                if self.config_id:
                    self.log_result(
                        "Configure Reconciliation New Format",
                        True,
                        f"Successfully created reconciliation configuration with new formula format",
                        {
                            "config_id": self.config_id, 
                            "mappings": len(config_data['mappings']),
                            "formula_format": "NEW"
                        }
                    )
                    return True
                else:
                    self.log_result("Configure Reconciliation New Format", False, "No config ID returned")
                    return False
            elif response.status_code == 422:
                self.log_result(
                    "Configure Reconciliation New Format", 
                    False, 
                    f"422 Unprocessable Entity - Backend doesn't accept new formula format",
                    {"response": response.text, "status_code": response.status_code}
                )
                return False
            else:
                self.log_result("Configure Reconciliation New Format", False, f"Failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Configure Reconciliation New Format", False, f"Exception: {str(e)}")
            return False
    
    def test_run_reconciliation(self):
        """Test Step 3: Run reconciliation and verify response"""
        print("\n=== Testing Run Reconciliation ===")
        
        if not self.config_id:
            self.log_result("Run Reconciliation", False, "Missing config ID for reconciliation")
            return False
        
        try:
            response = requests.post(f"{BASE_URL}/perform-reconciliation/{self.config_id}")
            if response.status_code == 200:
                report_result = response.json()
                self.report_id = report_result.get('report_id')
                filename = report_result.get('filename')
                
                # Verify response structure
                required_fields = ['report_id', 'filename', 'summary', 'column_headers']
                missing_fields = [field for field in required_fields if field not in report_result]
                
                if missing_fields:
                    self.log_result(
                        "Run Reconciliation",
                        False,
                        f"Missing required fields in response: {missing_fields}",
                        report_result
                    )
                    return False
                
                # Verify filename format: Reconciliation_Report_<CLIENT_NAME>_<YYYYMMDD_HHMMSS>.xlsx
                filename_pattern = r'Reconciliation_Report_.*_\d{8}_\d{6}\.xlsx'
                if not re.match(filename_pattern, filename):
                    self.log_result(
                        "Run Reconciliation",
                        False,
                        f"Filename doesn't match expected pattern: {filename}",
                        {"expected_pattern": filename_pattern, "actual_filename": filename}
                    )
                    return False
                
                self.log_result(
                    "Run Reconciliation",
                    True,
                    f"Successfully performed reconciliation",
                    {
                        "report_id": self.report_id,
                        "filename": filename,
                        "summary": report_result.get('summary', {}),
                        "filename_format_valid": True
                    }
                )
                return True
            else:
                self.log_result("Run Reconciliation", False, f"Failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Run Reconciliation", False, f"Exception: {str(e)}")
            return False
    
    def test_verify_report_structure(self):
        """Test Step 4: Verify report structure and column names"""
        print("\n=== Testing Verify Report Structure ===")
        
        if not self.report_id:
            self.log_result("Verify Report Structure", False, "Missing report ID for verification")
            return False
        
        try:
            response = requests.get(f"{BASE_URL}/reconciliation-report/{self.report_id}")
            if response.status_code == 200:
                report = response.json()
                
                # Check report data structure
                data = report.get('data', [])
                if not data:
                    self.log_result("Verify Report Structure", False, "No data in report")
                    return False
                
                first_row = data[0]
                
                # Check for expected column names with new format
                expected_columns = [
                    "ICyte_Net Sales", "Client_Net Sales", "Variance_Net Sales",
                    "ICyte_Returns", "Client_Returns", "Variance_Returns"
                ]
                
                missing_columns = [col for col in expected_columns if col not in first_row]
                
                if missing_columns:
                    self.log_result(
                        "Verify Report Structure",
                        False,
                        f"Missing expected columns: {missing_columns}",
                        {"found_columns": list(first_row.keys()), "expected": expected_columns}
                    )
                    return False
                
                # Verify numeric values have 6 decimal places
                numeric_precision_issues = []
                for row in data:
                    for col in expected_columns:
                        if col in row and row[col] is not None:
                            value = row[col]
                            if isinstance(value, (int, float)):
                                # Check if it's properly rounded to 6 decimal places
                                rounded_value = round(float(value), 6)
                                if abs(value - rounded_value) > 1e-7:
                                    numeric_precision_issues.append(f"{col}: {value} (not 6 decimal precision)")
                
                if numeric_precision_issues:
                    self.log_result(
                        "Verify Report Structure",
                        False,
                        f"Numeric precision issues found: {len(numeric_precision_issues)}",
                        {"issues": numeric_precision_issues[:3]}  # Show first 3
                    )
                    return False
                
                self.log_result(
                    "Verify Report Structure",
                    True,
                    "Report structure verified successfully",
                    {
                        "expected_columns_present": True,
                        "numeric_precision_valid": True,
                        "data_rows": len(data),
                        "columns_found": list(first_row.keys())
                    }
                )
                return True
            else:
                self.log_result("Verify Report Structure", False, f"Failed to get report: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Verify Report Structure", False, f"Exception: {str(e)}")
            return False
    
    def test_verify_report_data(self):
        """Test Step 5: Verify report data and variance calculations"""
        print("\n=== Testing Verify Report Data ===")
        
        if not self.report_id:
            self.log_result("Verify Report Data", False, "Missing report ID for verification")
            return False
        
        try:
            response = requests.get(f"{BASE_URL}/reconciliation-report/{self.report_id}")
            if response.status_code == 200:
                report = response.json()
                data = report.get('data', [])
                
                if len(data) != 3:
                    self.log_result(
                        "Verify Report Data",
                        False,
                        f"Expected 3 data rows, found {len(data)}",
                        {"data_rows": len(data)}
                    )
                    return False
                
                # Expected variance calculations (ICyte - Client should be 0.0 for all)
                expected_variances = {
                    "Variance_Net Sales": 0.0,  # All should match perfectly
                    "Variance_Returns": 0.0     # All should match perfectly
                }
                
                variance_issues = []
                for i, row in enumerate(data):
                    for var_col, expected_val in expected_variances.items():
                        if var_col in row:
                            actual_val = row[var_col]
                            if actual_val is not None:
                                if abs(float(actual_val) - expected_val) > 0.000001:
                                    variance_issues.append(f"Row {i+1} {var_col}: expected {expected_val}, got {actual_val}")
                
                if variance_issues:
                    self.log_result(
                        "Verify Report Data",
                        False,
                        f"Variance calculation issues found: {len(variance_issues)}",
                        {"issues": variance_issues}
                    )
                    return False
                
                # Verify specific calculations for first row
                first_row = data[0]
                
                # Row 1: ICyte NetSales (950.25) - Client (SalesAmount 1000.50 - ReturnAmount 50.25 = 950.25) = 0.0
                client_net_sales = first_row.get("Client_Net Sales")
                icyte_net_sales = first_row.get("ICyte_Net Sales")
                variance_net_sales = first_row.get("Variance_Net Sales")
                
                calculation_issues = []
                if client_net_sales != 950.25:
                    calculation_issues.append(f"Client Net Sales: expected 950.25, got {client_net_sales}")
                if icyte_net_sales != 950.25:
                    calculation_issues.append(f"ICyte Net Sales: expected 950.25, got {icyte_net_sales}")
                if variance_net_sales != 0.0:
                    calculation_issues.append(f"Variance Net Sales: expected 0.0, got {variance_net_sales}")
                
                if calculation_issues:
                    self.log_result(
                        "Verify Report Data",
                        False,
                        f"Calculation verification issues: {len(calculation_issues)}",
                        {"issues": calculation_issues, "first_row": first_row}
                    )
                    return False
                
                self.log_result(
                    "Verify Report Data",
                    True,
                    "Report data and variance calculations verified successfully",
                    {
                        "data_rows_processed": len(data),
                        "variance_calculations_correct": True,
                        "all_variances_zero": True,
                        "sample_calculations_verified": True
                    }
                )
                return True
            else:
                self.log_result("Verify Report Data", False, f"Failed to get report: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Verify Report Data", False, f"Exception: {str(e)}")
            return False
    
    def test_download_report(self):
        """Test Step 6: Download and verify Excel report"""
        print("\n=== Testing Download Report ===")
        
        if not self.report_id:
            self.log_result("Download Report", False, "Missing report ID for download")
            return False
        
        try:
            response = requests.get(f"{BASE_URL}/download-reconciliation-report/{self.report_id}")
            
            if response.status_code == 200:
                # Check Content-Type header
                content_type = response.headers.get('content-type', '')
                expected_content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                
                # Check Content-Disposition header for filename
                content_disposition = response.headers.get('content-disposition', '')
                has_filename = 'filename=' in content_disposition
                
                # Check file content
                content = response.content
                file_size = len(content)
                is_excel_file = content.startswith(b'PK')  # Excel files are ZIP-based
                
                # Verify all conditions
                download_issues = []
                if content_type != expected_content_type:
                    download_issues.append(f"Wrong Content-Type: {content_type}")
                if not has_filename:
                    download_issues.append("Missing filename in Content-Disposition")
                if file_size == 0:
                    download_issues.append("File size is 0 bytes")
                if not is_excel_file:
                    download_issues.append("File doesn't have Excel signature")
                
                if download_issues:
                    self.log_result(
                        "Download Report",
                        False,
                        f"Download validation failed: {len(download_issues)} issues",
                        {"issues": download_issues}
                    )
                    return False
                
                # Try to verify Excel content with openpyxl
                try:
                    import tempfile
                    import openpyxl
                    
                    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as temp_file:
                        temp_file.write(content)
                        temp_file_path = temp_file.name
                    
                    workbook = openpyxl.load_workbook(temp_file_path)
                    worksheet = workbook.active
                    
                    # Check for 6 decimal places formatting
                    decimal_format_count = 0
                    for row in worksheet.iter_rows(min_row=2, max_row=4):  # Data rows
                        for cell in row:
                            if cell.number_format == '0.000000':
                                decimal_format_count += 1
                    
                    workbook.close()
                    os.unlink(temp_file_path)
                    
                    self.log_result(
                        "Download Report",
                        True,
                        f"Successfully downloaded and verified Excel report ({file_size} bytes)",
                        {
                            "report_id": self.report_id,
                            "file_size": file_size,
                            "excel_format_valid": True,
                            "decimal_format_cells": decimal_format_count,
                            "content_type_correct": True,
                            "filename_present": True
                        }
                    )
                    return True
                    
                except Exception as excel_error:
                    self.log_result(
                        "Download Report",
                        False,
                        f"Excel verification failed: {str(excel_error)}",
                        {"file_size": file_size}
                    )
                    return False
            else:
                self.log_result("Download Report", False, f"Download failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_result("Download Report", False, f"Exception: {str(e)}")
            return False
    
    def cleanup_test_files(self):
        """Clean up test files"""
        print("\n=== Cleaning Up Run Reconciliation Test Files ===")
        
        for file_id, file_type in [(self.client_file_id, "Client"), (self.icyte_file_id, "ICyte")]:
            if file_id:
                try:
                    response = requests.delete(f"{BASE_URL}/file/{file_id}")
                    if response.status_code == 200:
                        print(f"✅ Cleaned up {file_type} file {file_id}")
                    else:
                        print(f"⚠️  Failed to clean up {file_type} file {file_id}: {response.status_code}")
                except Exception as e:
                    print(f"⚠️  Exception cleaning up {file_type} file {file_id}: {str(e)}")
    
    def run_complete_reconciliation_flow_test(self):
        """Run complete reconciliation flow test as specified in review request"""
        print("🚀 Starting COMPLETE Run Reconciliation Flow Test")
        print("=" * 80)
        
        # Run all test steps in sequence
        if not self.test_upload_test_files():
            print("❌ Failed to upload test files - aborting reconciliation flow test")
            return self.test_results
        
        if not self.test_configure_reconciliation_new_format():
            print("❌ Failed to configure reconciliation - aborting reconciliation flow test")
            return self.test_results
        
        if not self.test_run_reconciliation():
            print("❌ Failed to run reconciliation - aborting reconciliation flow test")
            return self.test_results
        
        if not self.test_verify_report_structure():
            print("❌ Failed to verify report structure - continuing with remaining tests")
        
        if not self.test_verify_report_data():
            print("❌ Failed to verify report data - continuing with remaining tests")
        
        if not self.test_download_report():
            print("❌ Failed to download report - continuing with cleanup")
        
        # Print summary
        self.print_summary()
        
        # Cleanup
        self.cleanup_test_files()
        
        return self.test_results
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("📊 RUN RECONCILIATION FLOW TEST SUMMARY")
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
    print("🧪 Running Backend Tests - COMPLETE Run Reconciliation Flow")
    print("=" * 50)
    
    # Run the specific Run Reconciliation Flow test as requested
    run_reconciliation_tester = RunReconciliationFlowTester()
    run_reconciliation_results = run_reconciliation_tester.run_complete_reconciliation_flow_test()
    
    # Overall summary for the specific test
    total_passed = sum(1 for result in run_reconciliation_results if result['success'])
    total_tests = len(run_reconciliation_results)
    
    print("\n" + "=" * 80)
    print("🎯 RUN RECONCILIATION FLOW TEST FINAL SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {total_tests}")
    print(f"✅ Total Passed: {total_passed}")
    print(f"❌ Total Failed: {total_tests - total_passed}")
    print(f"Overall Success Rate: {(total_passed/total_tests*100):.1f}%")
    print("=" * 80)