from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import shutil
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
import pandas as pd
import openpyxl
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# LLM Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-9Ca589281A0DaFcC5B')

# Define Models
class PDFUploadResponse(BaseModel):
    id: str
    filename: str
    file_path: str
    uploaded_at: str
    status: str

class ConversionRequest(BaseModel):
    file_id: str
    prompt: str

class ConversionResponse(BaseModel):
    id: str
    file_id: str
    excel_path: str
    prompt: str
    status: str
    created_at: str

class ColumnMapping(BaseModel):
    client_column: str
    icyte_column: str
    operation: Optional[str] = None  # e.g., "multiply:2", "add:10", "subtract:5"

class ReconciliationConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_file_id: str
    icyte_file_id: str
    client_sheet: str
    icyte_sheet: str
    client_unique_key: str  # Column to use as unique identifier in client file
    icyte_unique_key: str   # Column to use as unique identifier in ICyte file
    mappings: List[ColumnMapping]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReconciliationReport(BaseModel):
    id: str
    config_id: str
    total_records: int
    matched_records: int
    variances: int
    exceptions: List[Dict[str, Any]]
    summary: Dict[str, Any]
    created_at: str

# Routes
@api_router.get("/")
async def root():
    return {"message": "Reconciliation API"}

@api_router.post("/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file"""
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        file_id = str(uuid.uuid4())
        file_path = UPLOADS_DIR / f"{file_id}_{file.filename}"
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Save metadata to DB
        doc = {
            "id": file_id,
            "filename": file.filename,
            "file_path": str(file_path),
            "file_type": "pdf",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "status": "uploaded"
        }
        await db.uploads.insert_one(doc)
        
        return PDFUploadResponse(**doc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    """Upload an Excel file (ICyte report)"""
    try:
        if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
            raise HTTPException(status_code=400, detail="Only Excel files are allowed")
        
        file_id = str(uuid.uuid4())
        file_path = UPLOADS_DIR / f"{file_id}_{file.filename}"
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Save metadata to DB
        doc = {
            "id": file_id,
            "filename": file.filename,
            "file_path": str(file_path),
            "file_type": "excel",
            "uploaded_at": datetime.now(timezone.utc).isoformat(),
            "status": "uploaded"
        }
        await db.uploads.insert_one(doc)
        
        return {"id": file_id, "filename": file.filename, "status": "uploaded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/convert-pdf", response_model=ConversionResponse)
async def convert_pdf(request: ConversionRequest):
    """Convert PDF to Excel using LLM with custom prompt"""
    try:
        # Get file from DB
        file_doc = await db.uploads.find_one({"id": request.file_id})
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = file_doc['file_path']
        
        # Initialize LLM Chat with Gemini (supports file attachments)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"conversion_{request.file_id}",
            system_message="You are an expert data extraction assistant. Extract data from PDF and provide it in a clean, structured JSON format suitable for Excel conversion."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Create file attachment
        pdf_file = FileContentWithMimeType(
            file_path=file_path,
            mime_type="application/pdf"
        )
        
        # Create enhanced prompt for better extraction
        full_prompt = f"""{request.prompt}

IMPORTANT: Provide the extracted data in a clean JSON format with the following structure:
{{
    "data": [
        {{"column1": "value1", "column2": "value2", ...}},
        {{"column1": "value1", "column2": "value2", ...}}
    ]
}}

Extract ALL tables, data points, and relevant information from the PDF.
Make sure column names are clear and descriptive.
Return ONLY the JSON, no additional text or markdown formatting."""
        
        user_message = UserMessage(
            text=full_prompt,
            file_contents=[pdf_file]
        )
        
        # Get LLM response
        response = await chat.send_message(user_message)
        
        # Parse response and create Excel
        conversion_id = str(uuid.uuid4())
        excel_path = UPLOADS_DIR / f"{conversion_id}_converted.xlsx"
        
        # Try to parse JSON from response
        df = None
        json_data = None
        
        # Clean response - remove markdown code blocks if present
        cleaned_response = response.strip()
        if cleaned_response.startswith('```'):
            # Remove markdown code blocks
            lines = cleaned_response.split('\n')
            cleaned_response = '\n'.join([line for line in lines if not line.strip().startswith('```')])
        
        # Try to find and parse JSON
        try:
            # Try direct JSON parse
            json_data = json.loads(cleaned_response)
            
            if isinstance(json_data, dict) and 'data' in json_data:
                # Expected format
                df = pd.DataFrame(json_data['data'])
            elif isinstance(json_data, list):
                # Direct list format
                df = pd.DataFrame(json_data)
            elif isinstance(json_data, dict):
                # Single row or nested structure
                # Try to flatten it
                if all(isinstance(v, list) for v in json_data.values()):
                    # Column-oriented data
                    df = pd.DataFrame(json_data)
                else:
                    # Single row
                    df = pd.DataFrame([json_data])
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract structured data from text
            pass
        
        # Fallback: Create a table from the text response
        if df is None or df.empty:
            # Try to detect if response has tabular structure
            lines = cleaned_response.split('\n')
            table_data = []
            headers = None
            
            for line in lines:
                if not line.strip():
                    continue
                # Check if line looks like data (contains separators)
                if '|' in line or '\t' in line or ',' in line:
                    # Split by common separators
                    if '|' in line:
                        parts = [p.strip() for p in line.split('|') if p.strip()]
                    elif '\t' in line:
                        parts = [p.strip() for p in line.split('\t') if p.strip()]
                    else:
                        parts = [p.strip() for p in line.split(',')]
                    
                    if len(parts) >= 2:  # At least 2 columns
                        if headers is None:
                            headers = parts
                        else:
                            table_data.append(parts)
            
            if headers and table_data:
                df = pd.DataFrame(table_data, columns=headers)
            else:
                # Last resort: save as simple text output
                df = pd.DataFrame({
                    "Extracted_Data": [cleaned_response]
                })
        
        # Save to Excel
        df.to_excel(excel_path, index=False)
        
        # Save conversion to DB
        conversion_doc = {
            "id": conversion_id,
            "file_id": request.file_id,
            "excel_path": str(excel_path),
            "prompt": request.prompt,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversions.insert_one(conversion_doc)
        
        return ConversionResponse(**conversion_doc)
    except Exception as e:
        logger.error(f"Conversion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/download-excel/{file_id}")
async def download_excel(file_id: str):
    """Download converted Excel file"""
    try:
        # Check in conversions
        conversion = await db.conversions.find_one({"id": file_id})
        if conversion:
            file_path = conversion['excel_path']
            return FileResponse(
                file_path, 
                filename=f"converted_{file_id}.xlsx",
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        
        # Check in uploads
        upload = await db.uploads.find_one({"id": file_id})
        if upload and upload.get('file_type') == 'excel':
            file_path = upload['file_path']
            return FileResponse(
                file_path, 
                filename=upload['filename'],
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/excel-sheets/{file_id}")
async def get_excel_sheets(file_id: str):
    """Get sheet names and columns from an Excel file"""
    try:
        # Try conversion first
        conversion = await db.conversions.find_one({"id": file_id})
        if conversion:
            file_path = conversion['excel_path']
        else:
            # Try uploads
            upload = await db.uploads.find_one({"id": file_id})
            if upload and upload.get('file_type') == 'excel':
                file_path = upload['file_path']
            else:
                raise HTTPException(status_code=404, detail="File not found")
        
        # Read Excel file
        wb = openpyxl.load_workbook(file_path, data_only=False)
        sheets_info = {}
        
        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            columns = []
            best_row_idx = None
            max_columns = 0
            
            # Try to find header row (check first 10 rows)
            # Pick the row with the most non-empty, non-formula cells
            for row_idx in range(1, min(11, sheet.max_row + 1)):
                row_cells = [cell for cell in sheet[row_idx] if cell.value is not None]
                
                # Filter out cells that are formulas or numbers (headers are usually text)
                header_like_cells = []
                for cell in row_cells:
                    val = str(cell.value)
                    # Skip if it's a formula or looks like pure numeric data
                    if not val.startswith('=') and not val.replace('.','',1).replace('-','',1).isdigit():
                        header_like_cells.append(cell)
                
                # If this row has more header-like columns, consider it
                if len(header_like_cells) > max_columns and len(header_like_cells) >= 3:
                    max_columns = len(header_like_cells)
                    best_row_idx = row_idx
                    columns = [str(cell.value).strip() for cell in row_cells]
            
            # Fallback: if no good headers found, just use first row with data
            if not columns:
                for row_idx in range(1, min(11, sheet.max_row + 1)):
                    row_values = [cell.value for cell in sheet[row_idx] if cell.value is not None]
                    if len(row_values) >= 1:
                        columns = [str(cell.value).strip() for cell in sheet[row_idx] if cell.value is not None]
                        break
            
            sheets_info[sheet_name] = columns
        
        return {"sheets": sheets_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/configure-reconciliation", response_model=ReconciliationConfig)
async def configure_reconciliation(config: ReconciliationConfig):
    """Save reconciliation configuration"""
    try:
        config_dict = config.model_dump()
        await db.reconciliation_configs.insert_one(config_dict)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/perform-reconciliation/{config_id}")
async def perform_reconciliation(config_id: str):
    """Perform reconciliation based on saved configuration with unique key matching"""
    try:
        # Get config
        config = await db.reconciliation_configs.find_one({"id": config_id})
        if not config:
            raise HTTPException(status_code=404, detail="Configuration not found")
        
        # Get client file
        client_conversion = await db.conversions.find_one({"id": config['client_file_id']})
        if not client_conversion:
            raise HTTPException(status_code=404, detail="Client file not found")
        
        # Get ICyte file
        icyte_upload = await db.uploads.find_one({"id": config['icyte_file_id']})
        if not icyte_upload:
            raise HTTPException(status_code=404, detail="ICyte file not found")
        
        # Read both Excel files
        client_df = pd.read_excel(client_conversion['excel_path'], sheet_name=config['client_sheet'])
        icyte_df = pd.read_excel(icyte_upload['file_path'], sheet_name=config['icyte_sheet'])
        
        # Get unique keys
        client_unique_key = config['client_unique_key']
        icyte_unique_key = config['icyte_unique_key']
        
        # Create dictionaries for quick lookup based on unique keys
        client_dict = {}
        for idx, row in client_df.iterrows():
            key = str(row[client_unique_key]) if client_unique_key in client_df.columns else None
            if key:
                client_dict[key] = row
        
        icyte_dict = {}
        for idx, row in icyte_df.iterrows():
            key = str(row[icyte_unique_key]) if icyte_unique_key in icyte_df.columns else None
            if key:
                icyte_dict[key] = row
        
        # Get all unique keys from both datasets
        all_keys = set(client_dict.keys()) | set(icyte_dict.keys())
        
        # Perform reconciliation
        exceptions = []
        matched = 0
        variances = 0
        only_in_client = []
        only_in_icyte = []
        
        for key in all_keys:
            client_row = client_dict.get(key)
            icyte_row = icyte_dict.get(key)
            
            # Check if key exists in both files
            if client_row is None:
                only_in_icyte.append({
                    "unique_key": key,
                    "status": "Only in ICyte Report",
                    "details": f"{icyte_unique_key}: {key}"
                })
                variances += 1
                continue
            
            if icyte_row is None:
                only_in_client.append({
                    "unique_key": key,
                    "status": "Only in Client Report",
                    "details": f"{client_unique_key}: {key}"
                })
                variances += 1
                continue
            
            # Compare mapped columns
            row_exceptions = []
            for mapping in config['mappings']:
                client_col = mapping['client_column']
                icyte_col = mapping['icyte_column']
                operation = mapping.get('operation')
                
                client_val = client_row.get(client_col) if client_col in client_df.columns else None
                icyte_val = icyte_row.get(icyte_col) if icyte_col in icyte_df.columns else None
                
                # Skip if both are NaN
                if pd.isna(client_val) and pd.isna(icyte_val):
                    continue
                
                # Apply operation if specified
                if operation and client_val is not None and not pd.isna(client_val):
                    try:
                        if operation.startswith('multiply:'):
                            factor = float(operation.split(':')[1])
                            client_val = float(client_val) * factor
                        elif operation.startswith('add:'):
                            addend = float(operation.split(':')[1])
                            client_val = float(client_val) + addend
                        elif operation.startswith('subtract:'):
                            subtrahend = float(operation.split(':')[1])
                            client_val = float(client_val) - subtrahend
                    except Exception as e:
                        logger.warning(f"Operation failed for {key}: {e}")
                
                # Compare values with tolerance for floats
                values_match = False
                try:
                    if pd.isna(client_val) and pd.isna(icyte_val):
                        values_match = True
                    elif isinstance(client_val, (int, float)) and isinstance(icyte_val, (int, float)):
                        # Use tolerance for float comparison
                        values_match = abs(float(client_val) - float(icyte_val)) < 0.01
                    else:
                        values_match = str(client_val).strip() == str(icyte_val).strip()
                except:
                    values_match = str(client_val) == str(icyte_val)
                
                if not values_match:
                    row_exceptions.append({
                        "unique_key": key,
                        "client_column": client_col,
                        "icyte_column": icyte_col,
                        "client_value": str(client_val) if not pd.isna(client_val) else "N/A",
                        "icyte_value": str(icyte_val) if not pd.isna(icyte_val) else "N/A",
                        "variance": "mismatch"
                    })
                    variances += 1
            
            if not row_exceptions:
                matched += 1
            else:
                exceptions.extend(row_exceptions)
        
        # Add only_in_client and only_in_icyte to exceptions
        for item in only_in_client:
            exceptions.append(item)
        for item in only_in_icyte:
            exceptions.append(item)
        
        # Create reconciliation report DataFrame for download
        report_data = []
        for exc in exceptions:
            if 'status' in exc:
                # Only in one file
                report_data.append({
                    'Unique Key': exc['unique_key'],
                    'Status': exc['status'],
                    'Details': exc['details'],
                    'Client Column': '',
                    'Client Value': '',
                    'ICyte Column': '',
                    'ICyte Value': '',
                    'Variance Type': 'Missing'
                })
            else:
                # Value mismatch
                report_data.append({
                    'Unique Key': exc['unique_key'],
                    'Status': 'Mismatch',
                    'Details': f"Comparing {exc['client_column']} vs {exc['icyte_column']}",
                    'Client Column': exc['client_column'],
                    'Client Value': exc['client_value'],
                    'ICyte Column': exc['icyte_column'],
                    'ICyte Value': exc['icyte_value'],
                    'Variance Type': exc['variance']
                })
        
        # Save report as Excel
        report_id = str(uuid.uuid4())
        report_excel_path = UPLOADS_DIR / f"reconciliation_report_{report_id}.xlsx"
        
        if report_data:
            report_df = pd.DataFrame(report_data)
            report_df.to_excel(report_excel_path, index=False)
        
        # Create report
        report = {
            "id": report_id,
            "config_id": config_id,
            "total_records": len(all_keys),
            "matched_records": matched,
            "variances": variances,
            "only_in_client": len(only_in_client),
            "only_in_icyte": len(only_in_icyte),
            "exceptions": exceptions[:100],  # Limit to 100 for display
            "report_file_path": str(report_excel_path),
            "summary": {
                "match_rate": f"{(matched / len(all_keys) * 100):.2f}%" if len(all_keys) > 0 else "0%",
                "variance_rate": f"{(variances / len(all_keys) * 100):.2f}%" if len(all_keys) > 0 else "0%",
                "total_exceptions": len(exceptions)
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.reconciliation_reports.insert_one(report)
        
        return report
    except Exception as e:
        logger.error(f"Reconciliation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/download-reconciliation-report/{report_id}")
async def download_reconciliation_report(report_id: str):
    """Download reconciliation report as Excel"""
    try:
        report = await db.reconciliation_reports.find_one({"id": report_id})
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        report_file_path = report.get('report_file_path')
        if report_file_path and os.path.exists(report_file_path):
            return FileResponse(
                report_file_path,
                filename=f"reconciliation_report_{report_id}.xlsx",
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        else:
            raise HTTPException(status_code=404, detail="Report file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reconciliation-reports")
async def get_reconciliation_reports():
    """Get all reconciliation reports"""
    try:
        reports = await db.reconciliation_reports.find({}, {"_id": 0}).to_list(100)
        return {"reports": reports}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/reconciliation-report/{report_id}")
async def get_reconciliation_report(report_id: str):
    """Get a specific reconciliation report"""
    try:
        report = await db.reconciliation_reports.find_one({"id": report_id}, {"_id": 0})
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/uploads")
async def get_uploads():
    """Get all uploads"""
    try:
        uploads = await db.uploads.find({}, {"_id": 0}).to_list(100)
        return {"uploads": uploads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/conversions")
async def get_conversions():
    """Get all conversions"""
    try:
        conversions = await db.conversions.find({}, {"_id": 0}).to_list(100)
        return {"conversions": conversions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()