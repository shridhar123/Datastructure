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
            system_message="You are an expert data extraction assistant. Extract data from PDF and convert it to Excel format based on user requirements."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Create file attachment
        pdf_file = FileContentWithMimeType(
            file_path=file_path,
            mime_type="application/pdf"
        )
        
        # Create message with prompt
        full_prompt = f"""{request.prompt}

Please extract the data from this PDF and provide it in a structured format (JSON) that can be converted to Excel. Include all relevant columns and rows."""
        
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
        try:
            # Simple conversion - create Excel from LLM response
            df = pd.DataFrame([{"LLM_Response": response}])
            df.to_excel(excel_path, index=False)
        except:
            # If parsing fails, just save the response as text
            df = pd.DataFrame([{"Extracted_Data": response}])
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
        wb = openpyxl.load_workbook(file_path)
        sheets_info = {}
        
        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            columns = []
            best_row_idx = None
            max_columns = 0
            
            # Try to find header row (check first 10 rows)
            # Pick the row with the most non-empty cells as it's likely the header
            for row_idx in range(1, min(11, sheet.max_row + 1)):
                row_values = [cell.value for cell in sheet[row_idx] if cell.value is not None]
                
                # If this row has more columns than previous best, consider it
                if len(row_values) > max_columns and len(row_values) >= 3:
                    max_columns = len(row_values)
                    best_row_idx = row_idx
                    columns = [str(cell.value).strip() for cell in sheet[row_idx] if cell.value is not None]
            
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
    """Perform reconciliation based on saved configuration"""
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
        
        # Perform reconciliation
        exceptions = []
        matched = 0
        variances = 0
        
        min_rows = min(len(client_df), len(icyte_df))
        
        for i in range(min_rows):
            row_exceptions = []
            for mapping in config['mappings']:
                client_col = mapping['client_column']
                icyte_col = mapping['icyte_column']
                operation = mapping.get('operation')
                
                client_val = client_df.iloc[i][client_col] if client_col in client_df.columns else None
                icyte_val = icyte_df.iloc[i][icyte_col] if icyte_col in icyte_df.columns else None
                
                # Apply operation if specified
                if operation and client_val is not None:
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
                    except:
                        pass
                
                # Compare values
                if str(client_val) != str(icyte_val):
                    row_exceptions.append({
                        "row": i + 1,
                        "client_column": client_col,
                        "icyte_column": icyte_col,
                        "client_value": str(client_val),
                        "icyte_value": str(icyte_val),
                        "variance": "mismatch"
                    })
                    variances += 1
            
            if not row_exceptions:
                matched += 1
            else:
                exceptions.extend(row_exceptions)
        
        # Create report
        report_id = str(uuid.uuid4())
        report = {
            "id": report_id,
            "config_id": config_id,
            "total_records": min_rows,
            "matched_records": matched,
            "variances": variances,
            "exceptions": exceptions,
            "summary": {
                "match_rate": f"{(matched / min_rows * 100):.2f}%" if min_rows > 0 else "0%",
                "variance_rate": f"{(variances / (min_rows * len(config['mappings'])) * 100):.2f}%" if min_rows > 0 else "0%"
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.reconciliation_reports.insert_one(report)
        
        return report
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