import React, { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Upload, FileText, Settings, BarChart3, Home, ArrowRight, Download, FileSpreadsheet, Plus, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import SeparateUploadPage from "@/components/SeparateUploadPage";
import ConfirmModal from "@/components/ConfirmModal";
import ColumnMappingsPage from "@/components/ColumnMappingsPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container" data-testid="dashboard">
      <div className="hero-section">
        <h1 className="hero-title">Reconciliation Platform</h1>
        <p className="hero-subtitle">AI-powered PDF to Excel conversion and intelligent reconciliation</p>
      </div>

      <div className="features-grid">
        <Card className="feature-card" data-testid="upload-card" onClick={() => navigate('/upload')}>
          <div className="feature-icon">
            <Upload size={32} />
          </div>
          <h3>Upload PDF</h3>
          <p>Upload your PDF files for intelligent data extraction</p>
          <Button className="feature-btn" data-testid="upload-nav-btn">
            Get Started <ArrowRight size={16} />
          </Button>
        </Card>

        <Card className="feature-card" data-testid="convert-card" onClick={() => navigate('/convert')}>
          <div className="feature-icon">
            <FileText size={32} />
          </div>
          <h3>Convert to Excel</h3>
          <p>AI-powered conversion with custom prompts</p>
          <Button className="feature-btn" data-testid="convert-nav-btn">
            Convert Now <ArrowRight size={16} />
          </Button>
        </Card>

        <Card className="feature-card" data-testid="reconcile-card" onClick={() => navigate('/reconcile')}>
          <div className="feature-icon">
            <Settings size={32} />
          </div>
          <h3>Reconcile Data</h3>
          <p>Compare and reconcile client vs ICyte reports</p>
          <Button className="feature-btn" data-testid="reconcile-nav-btn">
            Configure <ArrowRight size={16} />
          </Button>
        </Card>

        <Card className="feature-card" data-testid="reports-card" onClick={() => navigate('/reports')}>
          <div className="feature-icon">
            <BarChart3 size={32} />
          </div>
          <h3>View Reports</h3>
          <p>Access comprehensive reconciliation reports</p>
          <Button className="feature-btn" data-testid="reports-nav-btn">
            View Reports <ArrowRight size={16} />
          </Button>
        </Card>
      </div>
    </div>
  );
};

const UploadPage = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const response = await axios.get(`${API}/uploads`);
      setUploads(response.data.uploads || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) {
      toast.error('Please select a PDF file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', pdfFile);

    try {
      const response = await axios.post(`${API}/upload-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('PDF uploaded successfully!');
      setPdfFile(null);
      fetchUploads();
    } catch (error) {
      toast.error('Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      toast.error('Please select an Excel file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', excelFile);

    try {
      const response = await axios.post(`${API}/upload-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Excel uploaded successfully!');
      setExcelFile(null);
      fetchUploads();
    } catch (error) {
      toast.error('Failed to upload Excel');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container" data-testid="upload-page">
      <h1 className="page-title">Upload Files</h1>
      
      <div className="upload-section">
        <Card className="upload-card">
          <h3>Upload PDF (Client File)</h3>
          <div className="upload-area" data-testid="pdf-upload-area">
            <Upload size={48} className="upload-icon" />
            <p>Drag and drop or click to select PDF</p>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              data-testid="pdf-file-input"
            />
            {pdfFile && <p className="file-name">{pdfFile.name}</p>}
            <Button onClick={handlePdfUpload} disabled={uploading || !pdfFile} data-testid="pdf-upload-btn">
              {uploading ? 'Uploading...' : 'Upload PDF'}
            </Button>
          </div>
        </Card>

        <Card className="upload-card">
          <h3>Upload Excel (ICyte Report)</h3>
          <div className="upload-area" data-testid="excel-upload-area">
            <FileSpreadsheet size={48} className="upload-icon" />
            <p>Drag and drop or click to select Excel</p>
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setExcelFile(e.target.files[0])}
              data-testid="excel-file-input"
            />
            {excelFile && <p className="file-name">{excelFile.name}</p>}
            <Button onClick={handleExcelUpload} disabled={uploading || !excelFile} data-testid="excel-upload-btn">
              {uploading ? 'Uploading...' : 'Upload Excel'}
            </Button>
          </div>
        </Card>
      </div>

      <div className="uploads-list" data-testid="uploads-list">
        <h3>Recent Uploads</h3>
        {uploads.length === 0 ? (
          <p>No uploads yet</p>
        ) : (
          <div className="uploads-grid">
            {uploads.map((upload) => (
              <Card key={upload.id} className="upload-item">
                <FileText size={24} />
                <div className="upload-info">
                  <p className="upload-filename">{upload.filename}</p>
                  <p className="upload-type">{upload.file_type.toUpperCase()}</p>
                  <p className="upload-date">{new Date(upload.uploaded_at).toLocaleString()}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ConvertPage = () => {
  const [uploads, setUploads] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [converting, setConverting] = useState(false);
  const [conversions, setConversions] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, conversionId: null });

  useEffect(() => {
    fetchUploads();
    fetchConversions();
  }, []);

  const fetchUploads = async () => {
    try {
      const response = await axios.get(`${API}/uploads`);
      const pdfUploads = response.data.uploads.filter(u => u.file_type === 'pdf');
      setUploads(pdfUploads);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    }
  };

  const fetchConversions = async () => {
    try {
      const response = await axios.get(`${API}/conversions`);
      setConversions(response.data.conversions || []);
    } catch (error) {
      console.error('Error fetching conversions:', error);
    }
  };

  const handleConvert = async () => {
    if (!selectedFileId) {
      toast.error('Please select a PDF file');
      return;
    }
    if (!prompt) {
      toast.error('Please enter a conversion prompt');
      return;
    }

    setConverting(true);
    try {
      const response = await axios.post(`${API}/convert-pdf`, {
        file_id: selectedFileId,
        prompt: prompt
      });
      toast.success('PDF converted successfully!');
      setPrompt('');
      fetchConversions();
    } catch (error) {
      toast.error('Failed to convert PDF');
    } finally {
      setConverting(false);
    }
  };

  const handleDownload = async (conversion) => {
    if (conversion.status !== 'completed') {
      toast.error('Download is only available for completed conversions');
      return;
    }

    const loadingToast = toast.loading('Preparing download...');
    
    try {
      console.log('Downloading conversion:', conversion.id);
      const response = await axios.get(`${API}/download-excel/${conversion.id}`, {
        responseType: 'blob',
        timeout: 30000 // 30 second timeout
      });
      
      console.log('Response received:', response.status, response.headers);
      
      if (!response.data || response.data.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      // Create blob with proper mime type
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      console.log('Blob created, size:', blob.size);
      
      // Create filename with timestamp
      const timestamp = new Date(conversion.created_at).toISOString().split('T')[0];
      const filename = `Converted_${conversion.id.substring(0, 8)}_${timestamp}.xlsx`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename; // Use .download instead of setAttribute
      document.body.appendChild(link);
      
      console.log('Triggering download:', filename);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 1000);
      
      toast.dismiss(loadingToast);
      toast.success(`✓ ${filename} downloaded successfully`, { duration: 4000 });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Download error:', error);
      console.error('Error details:', error.response?.data, error.response?.status);
      
      const errorMsg = error.response?.status === 404 
        ? 'File not found on server' 
        : error.message || 'Download failed';
      
      toast.error(`❌ ${errorMsg}. Please try again.`, { duration: 5000 });
    }
  };

  const openDeleteConversionModal = (conversionId) => {
    setDeleteModal({ isOpen: true, conversionId });
  };

  const closeDeleteConversionModal = () => {
    setDeleteModal({ isOpen: false, conversionId: null });
  };

  const handleDeleteConversion = async () => {
    const conversionId = deleteModal.conversionId;
    closeDeleteConversionModal();

    // Optimistic update
    setConversions(conversions.filter(c => c.id !== conversionId));

    try {
      await axios.delete(`${API}/conversion/${conversionId}`);
      toast.success('✓ Converted file deleted successfully');
      await fetchConversions();
    } catch (error) {
      console.error('Delete conversion error:', error);
      toast.error('❌ Unable to delete file. Please try again later.');
      await fetchConversions(); // Restore on error
    }
  };

  return (
    <div className="page-container" data-testid="convert-page">
      <h1 className="page-title">Convert PDF to Excel</h1>

      <Card className="convert-card">
        <h3>Select PDF File</h3>
        <Select value={selectedFileId} onValueChange={setSelectedFileId}>
          <SelectTrigger data-testid="pdf-select">
            <SelectValue placeholder="Select a PDF file" />
          </SelectTrigger>
          <SelectContent>
            {uploads.map((upload) => (
              <SelectItem key={upload.id} value={upload.id}>
                {upload.filename}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <h3>Conversion Prompt</h3>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter instructions for PDF conversion (e.g., 'Extract all tables and format as Excel with columns: Date, Description, Amount')"
          rows={6}
          data-testid="conversion-prompt"
        />

        <Button onClick={handleConvert} disabled={converting} data-testid="convert-btn">
          {converting ? 'Converting...' : 'Convert to Excel'}
        </Button>
      </Card>

      <div className="conversions-list" data-testid="conversions-list">
        <h3>Conversion History</h3>
        {conversions.length === 0 ? (
          <p>No conversions yet</p>
        ) : (
          <div className="conversions-grid">
            {conversions.map((conversion) => (
              <Card key={conversion.id} className="conversion-item">
                <FileSpreadsheet size={24} />
                <div className="conversion-info">
                  <p className="conversion-prompt">{conversion.prompt.substring(0, 50)}...</p>
                  <p className="conversion-status">
                    <span className={`status-badge ${conversion.status}`}>
                      {conversion.status}
                    </span>
                  </p>
                  <p className="conversion-date">{new Date(conversion.created_at).toLocaleString()}</p>
                </div>
                <div className="conversion-actions">
                  <Button 
                    onClick={() => handleDownload(conversion)} 
                    size="sm" 
                    disabled={conversion.status !== 'completed'}
                    data-testid={`download-btn-${conversion.id}`}
                  >
                    <Download size={16} /> Download
                  </Button>
                  <Button 
                    onClick={() => openDeleteConversionModal(conversion.id)} 
                    size="sm" 
                    variant="ghost"
                    className="delete-btn"
                    data-testid={`delete-conversion-btn-${conversion.id}`}
                  >
                    <Trash2 size={16} /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteConversionModal}
        onConfirm={handleDeleteConversion}
        title="Delete Converted File"
        message="Do you want to delete this converted file? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
};

const ReconcilePage = () => {
  const [conversions, setConversions] = useState([]);
  const [clientFiles, setClientFiles] = useState([]);
  const [icyteFiles, setIcyteFiles] = useState([]);
  const [clientFileId, setClientFileId] = useState('');
  const [icyteFileId, setIcyteFileId] = useState('');
  const [clientSheets, setClientSheets] = useState({});
  const [icyteSheets, setIcyteSheets] = useState({});
  const [clientSheet, setClientSheet] = useState('');
  const [icyteSheet, setIcyteSheet] = useState('');
  const [clientUniqueKey, setClientUniqueKey] = useState('');
  const [icyteUniqueKey, setIcyteUniqueKey] = useState('');
  const [mappings, setMappings] = useState([]);
  const [processing, setProcessing] = useState(false);
  
  // Template management
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // Column Mappings
  const [savedColumnMappings, setSavedColumnMappings] = useState([]);
  const [selectedColumnMapping, setSelectedColumnMapping] = useState('');
  const [uploadMappingFile, setUploadMappingFile] = useState(null);
  const [unmatchedColumns, setUnmatchedColumns] = useState([]);

  useEffect(() => {
    fetchConversions();
    fetchUploads();
    fetchTemplates();
    fetchSavedColumnMappings();
  }, []);

  const fetchConversions = async () => {
    try {
      const response = await axios.get(`${API}/conversions`);
      setConversions(response.data.conversions || []);
    } catch (error) {
      console.error('Error fetching conversions:', error);
    }
  };

  const fetchUploads = async () => {
    try {
      // Fetch Client files (non-PDF only for reconciliation)
      const clientResponse = await axios.get(`${API}/uploads?file_source=Client`);
      const clientDataFiles = (clientResponse.data.uploads || []).filter(u => 
        u.file_type === 'excel' || 
        u.file_type === 'csv' ||
        u.file_type_tag === 'Excel' ||
        u.file_type_tag === 'CSV'
      );
      setClientFiles(clientDataFiles);

      // Fetch ICyte files (Excel/CSV only)
      const icyteResponse = await axios.get(`${API}/uploads?file_source=ICyte`);
      setIcyteFiles(icyteResponse.data.uploads || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/mapping-templates`);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchSavedColumnMappings = async () => {
    try {
      const response = await axios.get(`${API}/column-mappings`);
      setSavedColumnMappings(response.data.mappings || []);
    } catch (error) {
      console.error('Error fetching column mappings:', error);
    }
  };

  const loadColumnMapping = async (mappingId) => {
    try {
      const response = await axios.get(`${API}/column-mapping/${mappingId}`);
      const mapping = response.data;
      
      // Set files and sheets
      setClientFileId(mapping.client_file_id);
      setIcyteFileId(mapping.icyte_file_id);
      setClientSheet(mapping.client_sheet);
      setIcyteSheet(mapping.icyte_sheet);
      
      // Convert column mappings to reconciliation mappings format
      const convertedMappings = mapping.mappings.map(m => ({
        client_formula: m.clientExpression || [{ column: '', operation: null }],
        icyte_formula: [{ column: m.icyteColumn || '', operation: null }],
        label: m.label || ''
      }));
      
      setMappings(convertedMappings);
      toast.success('✓ Column mapping loaded successfully');
    } catch (error) {
      console.error('Error loading column mapping:', error);
      toast.error('Failed to load column mapping');
    }
  };

  const handleSaveTemplate = async (name, description) => {
    if (mappings.length === 0) {
      toast.error('Please add at least one mapping');
      return;
    }

    try {
      await axios.post(`${API}/mapping-templates`, {
        name,
        description,
        mappings
      });
      toast.success('Template saved successfully!');
      setShowSaveModal(false);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleLoadTemplate = async (templateId) => {
    if (!templateId || templateId === 'none') {
      setMappings([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/mapping-template/${templateId}`);
      setMappings(response.data.mappings || []);
      toast.success('Template loaded!');
    } catch (error) {
      toast.error('Failed to load template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await axios.delete(`${API}/mapping-template/${templateId}`);
      toast.success('Template deleted');
      fetchTemplates();
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const fetchSheets = async (fileId, type) => {
    try {
      const response = await axios.get(`${API}/excel-sheets/${fileId}`);
      if (type === 'client') {
        setClientSheets(response.data.sheets);
      } else {
        setIcyteSheets(response.data.sheets);
      }
    } catch (error) {
      toast.error('Failed to fetch sheet information');
    }
  };

  useEffect(() => {
    if (clientFileId) {
      fetchSheets(clientFileId, 'client');
    }
  }, [clientFileId]);

  useEffect(() => {
    if (icyteFileId) {
      fetchSheets(icyteFileId, 'icyte');
    }
  }, [icyteFileId]);

  const addMapping = () => {
    setMappings([...mappings, { 
      client_formula: [{ column: '', operation: null }],
      icyte_formula: [{ column: '', operation: null }],
      label: ''
    }]);
  };

  const updateMapping = (index, field, value) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);
  };

  const addFormulaStep = (mappingIndex, side) => {
    const newMappings = [...mappings];
    const formulaKey = side === 'client' ? 'client_formula' : 'icyte_formula';
    newMappings[mappingIndex][formulaKey].push({ column: '', operation: null });
    setMappings(newMappings);
  };

  const updateFormulaStep = (mappingIndex, side, stepIndex, field, value) => {
    const newMappings = [...mappings];
    const formulaKey = side === 'client' ? 'client_formula' : 'icyte_formula';
    newMappings[mappingIndex][formulaKey][stepIndex][field] = value;
    setMappings(newMappings);
  };

  const removeFormulaStep = (mappingIndex, side, stepIndex) => {
    const newMappings = [...mappings];
    const formulaKey = side === 'client' ? 'client_formula' : 'icyte_formula';
    if (newMappings[mappingIndex][formulaKey].length > 1) {
      newMappings[mappingIndex][formulaKey].splice(stepIndex, 1);
      setMappings(newMappings);
    }
  };

  const getFormulaPreview = (formula) => {
    if (!formula || formula.length === 0) return '';
    
    let preview = '';
    formula.forEach((step, idx) => {
      if (step.column) {
        if (idx === 0) {
          preview = step.column;
        } else if (step.operation) {
          const opSymbol = {
            'add': ' + ',
            'subtract': ' - ',
            'multiply': ' × ',
            'divide': ' ÷ '
          }[step.operation] || ' ? ';
          preview += opSymbol + step.column;
        }
      }
    });
    return preview || 'No columns selected';
  };

  const removeMapping = (index) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleReconcile = async () => {
    if (!clientFileId || !icyteFileId || !clientSheet || !icyteSheet || !clientUniqueKey || !icyteUniqueKey || mappings.length === 0) {
      toast.error('Please complete all configuration fields including unique keys');
      return;
    }

    // Validate mappings have at least one column selected
    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      const clientHasColumns = mapping.client_formula?.some(step => step.column);
      const icyteHasColumns = mapping.icyte_formula?.some(step => step.column);
      
      if (!clientHasColumns || !icyteHasColumns) {
        toast.error(`Mapping #${i + 1}: Please select at least one column for both Client and ICyte sides`);
        return;
      }
    }

    setProcessing(true);
    try {
      // Save configuration
      const configResponse = await axios.post(`${API}/configure-reconciliation`, {
        client_file_id: clientFileId,
        icyte_file_id: icyteFileId,
        client_sheet: clientSheet,
        icyte_sheet: icyteSheet,
        client_unique_key: clientUniqueKey,
        icyte_unique_key: icyteUniqueKey,
        mappings: mappings,
        template_id: selectedTemplateId || null,
        template_name: selectedTemplateId ? templates.find(t => t.id === selectedTemplateId)?.name : null
      });

      // Perform reconciliation
      const reconcileResponse = await axios.post(`${API}/perform-reconciliation/${configResponse.data.id}`);
      toast.success('Reconciliation completed!');
      window.location.href = '/reports';
    } catch (error) {
      console.error('Reconciliation error:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to perform reconciliation';
      toast.error(`❌ ${errorMsg}`, { duration: 5000 });
    } finally {
      setProcessing(false);
    }
  };

  // Check if only PDFs exist (no data files available)
  const hasDataFiles = conversions.length > 0 || clientFiles.length > 0 || icyteFiles.length > 0;

  return (
    <div className="page-container" data-testid="reconcile-page">
      <h1 className="page-title">Configure Reconciliation</h1>
      <p className="page-subtitle">Reconcile non-PDF data files - Excel and CSV only</p>

      {!hasDataFiles && (
        <Card className="warning-banner" style={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #F59E0B',
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400E' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <strong>Reconciliation requires Excel/CSV files.</strong>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
                Upload data files to the Upload page or run Convert to generate Excel files from PDFs first.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="reconcile-card">
        <div className="reconcile-section">
          <h3>Source 1 (Client Data)</h3>
          <p className="field-description" style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
            Select Excel/CSV or Generated Excels from Convert
          </p>
          <Select value={clientFileId} onValueChange={setClientFileId}>
            <SelectTrigger data-testid="client-file-select">
              <SelectValue placeholder="Select client data file" />
            </SelectTrigger>
            <SelectContent>
              {conversions.length > 0 && (
                <>
                  <SelectItem value="converted-header" disabled style={{fontWeight: 'bold', color: '#666'}}>
                    📄 Generated Excels (from Convert)
                  </SelectItem>
                  {conversions.map((conv) => (
                    <SelectItem key={conv.id} value={conv.id}>
                      Conversion {conv.id.substring(0, 8)}
                    </SelectItem>
                  ))}
                </>
              )}
              {clientFiles.length > 0 && (
                <>
                  {conversions.length > 0 && <SelectItem value="divider" disabled>---</SelectItem>}
                  <SelectItem value="uploaded-header" disabled style={{fontWeight: 'bold', color: '#666'}}>
                    📊 Uploaded Client Files
                  </SelectItem>
                  {clientFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.file_type_tag === 'Excel' ? '📗' : '📄'} {file.filename}
                    </SelectItem>
                  ))}
                </>
              )}
              {conversions.length === 0 && clientFiles.length === 0 && (
                <SelectItem value="no-files" disabled>
                  No data files available
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {clientFileId && Object.keys(clientSheets).length > 0 && (
            <>
              <h4>Select Sheet</h4>
              <Select value={clientSheet} onValueChange={setClientSheet}>
                <SelectTrigger data-testid="client-sheet-select">
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(clientSheets).map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {clientSheet && clientSheets[clientSheet]?.length > 0 && (
                <>
                  <h4>Select Unique Key Column</h4>
                  <Select value={clientUniqueKey} onValueChange={setClientUniqueKey}>
                    <SelectTrigger data-testid="client-unique-key-select">
                      <SelectValue placeholder="Select unique key (e.g., NDC11)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientSheets[clientSheet].map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </>
          )}
        </div>

        <div className="reconcile-section">
          <h3>Source 2 (ICyte Data)</h3>
          <p className="field-description" style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
            Select Excel/CSV or Generated Excels
          </p>
          <Select value={icyteFileId} onValueChange={setIcyteFileId}>
            <SelectTrigger data-testid="icyte-file-select">
              <SelectValue placeholder="Select ICyte data file" />
            </SelectTrigger>
            <SelectContent>
              {icyteFiles.length > 0 ? (
                <>
                  <SelectItem value="uploaded-header" disabled style={{fontWeight: 'bold', color: '#666'}}>
                    📊 Uploaded ICyte Files
                  </SelectItem>
                  {icyteFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.file_type_tag === 'Excel' ? '📗' : '📄'} {file.filename}
                    </SelectItem>
                  ))}
                </>
              ) : (
                <SelectItem value="no-files" disabled>
                  No data files available
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {icyteFileId && Object.keys(icyteSheets).length > 0 && (
            <>
              <h4>Select Sheet</h4>
              <Select value={icyteSheet} onValueChange={setIcyteSheet}>
                <SelectTrigger data-testid="icyte-sheet-select">
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(icyteSheets).map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {icyteSheet && icyteSheets[icyteSheet]?.length > 0 && (
                <>
                  <h4>Select Unique Key Column</h4>
                  <Select value={icyteUniqueKey} onValueChange={setIcyteUniqueKey}>
                    <SelectTrigger data-testid="icyte-unique-key-select">
                      <SelectValue placeholder="Select unique key (e.g., NDC11)" />
                    </SelectTrigger>
                    <SelectContent>
                      {icyteSheets[icyteSheet].map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </>
          )}
        </div>

        <div className="reconcile-section">
          <h3>Load Saved Column Mappings</h3>
          <p className="section-description">Load pre-configured column mappings from the Column Mappings page</p>
          <Select value={selectedColumnMapping} onValueChange={(val) => {
            setSelectedColumnMapping(val);
            if (val) loadColumnMapping(val);
          }}>
            <SelectTrigger data-testid="column-mapping-select">
              <SelectValue placeholder="Select saved column mapping" />
            </SelectTrigger>
            <SelectContent>
              {savedColumnMappings.length === 0 ? (
                <SelectItem value="none" disabled>No saved mappings available</SelectItem>
              ) : (
                savedColumnMappings.map((mapping) => (
                  <SelectItem key={mapping.id} value={mapping.id}>
                    {mapping.mappings?.length || 0} mappings - {new Date(mapping.created_at).toLocaleDateString()}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedColumnMapping && (
            <Button variant="outline" size="sm" onClick={() => setSelectedColumnMapping('')} style={{ marginTop: '0.5rem' }}>
              Clear Selection
            </Button>
          )}
        </div>

        <div className="mappings-section">
          <div className="mappings-header">
            <h3>Mappings</h3>
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              <Select value={selectedTemplateId} onValueChange={(val) => { setSelectedTemplateId(val); handleLoadTemplate(val); }}>
                <SelectTrigger style={{width: '250px'}} data-testid="template-select">
                  <SelectValue placeholder="Load Template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- No Template --</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setShowSaveModal(true)} size="sm" variant="outline" data-testid="save-template-btn" disabled={mappings.length === 0}>
                Save as Template
              </Button>
              <Button onClick={addMapping} size="sm" data-testid="add-mapping-btn">
                <Plus size={16} /> Add Mapping
              </Button>
            </div>
          </div>

          {mappings.map((mapping, index) => (
            <Card key={index} className="mapping-item enhanced">
              <div className="mapping-header-row">
                <h4>Mapping #{index + 1}</h4>
                <Button variant="destructive" size="sm" onClick={() => removeMapping(index)} data-testid={`remove-mapping-btn-${index}`}>
                  <X size={16} /> Remove
                </Button>
              </div>

              <div className="mapping-label-field">
                <label>Mapping Label (Optional)</label>
                <Input
                  value={mapping.label || ''}
                  onChange={(e) => updateMapping(index, 'label', e.target.value)}
                  placeholder="e.g., Total Sales, Net Amount"
                  data-testid={`mapping-label-${index}`}
                />
              </div>

              <div className="mapping-columns-row">
                {/* Client Side */}
                <div className="mapping-side">
                  <h5>Client Formula</h5>
                  
                  <div className="formula-preview">
                    <strong>Preview:</strong> {getFormulaPreview(mapping.client_formula)}
                  </div>

                  <div className="formula-builder">
                    {mapping.client_formula?.map((step, stepIdx) => (
                      <div key={stepIdx} className="formula-step">
                        {stepIdx > 0 && (
                          <Select 
                            value={step.operation || ''} 
                            onValueChange={(val) => updateFormulaStep(index, 'client', stepIdx, 'operation', val)}
                          >
                            <SelectTrigger className="operation-selector" data-testid={`client-op-${index}-${stepIdx}`}>
                              <SelectValue placeholder="Op" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="add">+</SelectItem>
                              <SelectItem value="subtract">-</SelectItem>
                              <SelectItem value="multiply">×</SelectItem>
                              <SelectItem value="divide">÷</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        <Select 
                          value={step.column || ''} 
                          onValueChange={(val) => updateFormulaStep(index, 'client', stepIdx, 'column', val)}
                        >
                          <SelectTrigger className="column-selector" data-testid={`client-col-${index}-${stepIdx}`}>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientSheet && clientSheets[clientSheet]?.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {mapping.client_formula.length > 1 && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeFormulaStep(index, 'client', stepIdx)}
                            className="remove-step-btn"
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => addFormulaStep(index, 'client')}
                      className="add-step-btn"
                    >
                      <Plus size={14} /> Add Column
                    </Button>
                  </div>
                </div>

                {/* ICyte Side */}
                <div className="mapping-side">
                  <h5>ICyte Formula</h5>
                  
                  <div className="formula-preview">
                    <strong>Preview:</strong> {getFormulaPreview(mapping.icyte_formula)}
                  </div>

                  <div className="formula-builder">
                    {mapping.icyte_formula?.map((step, stepIdx) => (
                      <div key={stepIdx} className="formula-step">
                        {stepIdx > 0 && (
                          <Select 
                            value={step.operation || ''} 
                            onValueChange={(val) => updateFormulaStep(index, 'icyte', stepIdx, 'operation', val)}
                          >
                            <SelectTrigger className="operation-selector" data-testid={`icyte-op-${index}-${stepIdx}`}>
                              <SelectValue placeholder="Op" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="add">+</SelectItem>
                              <SelectItem value="subtract">-</SelectItem>
                              <SelectItem value="multiply">×</SelectItem>
                              <SelectItem value="divide">÷</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        <Select 
                          value={step.column || ''} 
                          onValueChange={(val) => updateFormulaStep(index, 'icyte', stepIdx, 'column', val)}
                        >
                          <SelectTrigger className="column-selector" data-testid={`icyte-col-${index}-${stepIdx}`}>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {icyteSheet && icyteSheets[icyteSheet]?.map((col) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {mapping.icyte_formula.length > 1 && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => removeFormulaStep(index, 'icyte', stepIdx)}
                            className="remove-step-btn"
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => addFormulaStep(index, 'icyte')}
                      className="add-step-btn"
                    >
                      <Plus size={14} /> Add Column
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button 
          onClick={handleReconcile} 
          disabled={
            processing || 
            !clientFileId || 
            !icyteFileId || 
            !clientSheet || 
            !icyteSheet || 
            !clientUniqueKey || 
            !icyteUniqueKey || 
            mappings.length === 0
          } 
          className="reconcile-btn" 
          data-testid="perform-reconcile-btn"
        >
          {processing ? 'Processing...' : 'Run Reconciliation'}
        </Button>
        {(!clientFileId || !icyteFileId || !clientSheet || !icyteSheet || !clientUniqueKey || !icyteUniqueKey || mappings.length === 0) && (
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.5rem', textAlign: 'center' }}>
            Select both source files, sheets, unique keys, and add at least one mapping to proceed
          </p>
        )}
      </Card>

      {/* Template Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay" data-testid="template-save-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Save Mapping Template</h3>
              <button className="modal-close" onClick={() => setShowSaveModal(false)} data-testid="close-modal-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Template Name *</label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard AMP Reconciliation"
                  data-testid="template-name-input"
                />
              </div>
              
              <div className="form-group">
                <label>Description (Optional)</label>
                <Textarea
                  id="template-description"
                  placeholder="Describe this template..."
                  rows={3}
                  data-testid="template-description-input"
                />
              </div>
              
              <div className="template-preview">
                <p><strong>Mappings to save:</strong> {mappings.length} column mapping(s)</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <Button variant="outline" onClick={() => setShowSaveModal(false)} data-testid="cancel-save-btn">
                Cancel
              </Button>
              <Button onClick={() => {
                const name = document.getElementById('template-name').value;
                const description = document.getElementById('template-description').value;
                handleSaveTemplate(name, description);
              }} data-testid="save-template-confirm-btn">
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, reportId: null, reportName: '' });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/reconciliation-reports`);
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const viewReport = async (reportId) => {
    try {
      const response = await axios.get(`${API}/reconciliation-report/${reportId}`);
      setSelectedReport(response.data);
    } catch (error) {
      toast.error('Failed to load report');
    }
  };

  const downloadReport = async (reportId) => {
    const loadingToast = toast.loading('Preparing report download...');
    
    try {
      console.log('Downloading report:', reportId);
      const response = await axios.get(`${API}/download-reconciliation-report/${reportId}`, {
        responseType: 'blob',
        timeout: 30000 // 30 second timeout
      });
      
      console.log('Response received:', response.status, response.headers);
      
      if (!response.data || response.data.size === 0) {
        throw new Error('Downloaded report is empty');
      }
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      console.log('Blob created, size:', blob.size);
      
      const filename = `Reconciliation_Report_${reportId.substring(0, 8)}.xlsx`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename; // Use .download instead of setAttribute
      document.body.appendChild(link);
      
      console.log('Triggering download:', filename);
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 1000);
      
      toast.dismiss(loadingToast);
      toast.success(`✓ ${filename} downloaded successfully`, { duration: 4000 });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Download error:', error);
      console.error('Error details:', error.response?.data, error.response?.status);
      
      let errorMsg = 'Failed to download report';
      if (error.response?.status === 404) {
        errorMsg = 'Report file not found. Please create a new reconciliation.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      toast.error(`❌ ${errorMsg}`, { duration: 5000 });
    }
  };

  const openDeleteReportModal = (reportId, e) => {
    e.stopPropagation(); // Prevent triggering the card click
    const reportName = `Report ${reportId.substring(0, 8)}`;
    setDeleteModal({ isOpen: true, reportId, reportName });
  };

  const closeDeleteReportModal = () => {
    setDeleteModal({ isOpen: false, reportId: null, reportName: '' });
  };

  const handleDeleteReport = async () => {
    const reportId = deleteModal.reportId;
    closeDeleteReportModal();

    // Optimistic update - remove from UI immediately
    setReports(reports.filter(r => r.id !== reportId));
    
    // If viewing the deleted report, go back to list
    if (selectedReport && selectedReport.id === reportId) {
      setSelectedReport(null);
    }

    try {
      await axios.delete(`${API}/reconciliation-report/${reportId}`);
      toast.success('✓ Report deleted successfully');
      await fetchReports(); // Refresh the list
    } catch (error) {
      console.error('Delete report error:', error);
      toast.error('❌ Unable to delete report. Please try again later.');
      await fetchReports(); // Restore on error
    }
  };

  return (
    <div className="page-container" data-testid="reports-page">
      <h1 className="page-title">Reconciliation Reports</h1>

      {!selectedReport ? (
        <div className="reports-list">
          {reports.length === 0 ? (
            <p>No reports available</p>
          ) : (
            <div className="reports-grid">
              {reports.map((report) => (
                <Card key={report.id} className="report-card" onClick={() => viewReport(report.id)}>
                  <BarChart3 size={32} />
                  <div className="report-summary">
                    <h3>Report {report.id.substring(0, 8)}</h3>
                    <div className="report-stats">
                      <div className="stat">
                        <span className="stat-label">Total Records:</span>
                        <span className="stat-value">{report.total_records}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Matched:</span>
                        <span className="stat-value matched">{report.matched_records}</span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">Variances:</span>
                        <span className="stat-value variance">{report.variances}</span>
                      </div>
                    </div>
                    <p className="report-date">{new Date(report.created_at).toLocaleString()}</p>
                  </div>
                  <div className="report-actions">
                    <Button size="sm" data-testid={`view-report-btn-${report.id}`}>View Details</Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="delete-btn"
                      onClick={(e) => openDeleteReportModal(report.id, e)}
                      data-testid={`delete-report-btn-${report.id}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="report-details" data-testid="report-details">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
            <Button onClick={() => setSelectedReport(null)} className="back-btn" data-testid="back-to-reports-btn">
              ← Back to Reports
            </Button>
            <Button onClick={() => downloadReport(selectedReport.id)} data-testid="download-report-btn">
              <Download size={16} style={{marginRight: '0.5rem'}} /> Download Report (Excel)
            </Button>
          </div>

          <Card className="report-overview">
            <h2>Report Summary</h2>
            <div className="overview-stats">
              <div className="overview-stat">
                <h4>Total Records</h4>
                <p className="stat-big">{selectedReport.total_records}</p>
              </div>
              <div className="overview-stat">
                <h4>Matched Records</h4>
                <p className="stat-big matched">{selectedReport.matched_records}</p>
              </div>
              <div className="overview-stat">
                <h4>Variances</h4>
                <p className="stat-big variance">{selectedReport.variances}</p>
              </div>
              <div className="overview-stat">
                <h4>Match Rate</h4>
                <p className="stat-big">{selectedReport.summary.match_rate}</p>
              </div>
            </div>
          </Card>

          {/* Warnings Section */}
          {selectedReport.warnings && selectedReport.warnings.length > 0 && (
            <Card style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #F59E0B',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <h3 style={{ color: '#92400E', marginBottom: '0.5rem' }}>⚠️ Warnings</h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#92400E' }}>
                {selectedReport.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="exceptions-card">
            <h3>Reconciliation Details ({selectedReport.exceptions.length} records)</h3>
            {selectedReport.exceptions.length === 0 ? (
              <div className="no-exceptions">
                <Check size={48} />
                <p>All records matched successfully!</p>
              </div>
            ) : (
              <div className="exceptions-table" style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      {/* Unique Key Column */}
                      <th style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                        {selectedReport.column_headers?.unique_key || 'Unique Key'}
                      </th>
                      
                      {/* Dynamic columns based on mappings */}
                      {selectedReport.column_headers?.mappings?.map((mapping, idx) => (
                        <React.Fragment key={idx}>
                          <th>{mapping.client_label}</th>
                          <th>{mapping.icyte_label}</th>
                          <th>{mapping.variance_label}</th>
                          <th>{mapping.match_label}</th>
                        </React.Fragment>
                      ))}
                      
                      {/* Row Status Column */}
                      <th>RowStatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.exceptions.map((record, index) => {
                      const uniqueKeyValue = record[selectedReport.column_headers?.unique_key] || 'N/A';
                      const rowStatus = record['RowStatus'] || 'N/A';
                      
                      return (
                        <tr key={index}>
                          {/* Unique Key */}
                          <td style={{ position: 'sticky', left: 0, background: 'white', fontWeight: 'bold' }}>
                            {uniqueKeyValue}
                          </td>
                          
                          {/* Dynamic columns for each mapping */}
                          {selectedReport.column_headers?.mappings?.map((mapping, idx) => {
                            const clientVal = record[mapping.client_label];
                            const icyteVal = record[mapping.icyte_label];
                            const variance = record[mapping.variance_label];
                            const matchFlag = record[mapping.match_label];
                            
                            return (
                              <React.Fragment key={idx}>
                                <td>{clientVal !== null && clientVal !== undefined ? clientVal : '-'}</td>
                                <td>{icyteVal !== null && icyteVal !== undefined ? icyteVal : '-'}</td>
                                <td>
                                  {variance !== null && variance !== undefined ? (
                                    <span className="variance-badge">
                                      {typeof variance === 'number' ? variance.toFixed(2) : variance}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td>
                                  <span className={matchFlag === 'Matched' ? 'result-badge matched' : 'result-badge unmatched'}>
                                    {matchFlag}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          })}
                          
                          {/* Row Status */}
                          <td>
                            <span className={`status-badge ${rowStatus.toLowerCase().replace('_', '-')}`}>
                              {rowStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteReportModal}
        onConfirm={handleDeleteReport}
        title="Delete Report"
        message={`Are you sure you want to delete "${deleteModal.reportName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <nav className="navbar">
          <div className="nav-brand">
            <BarChart3 size={28} />
            <span>Reconciliation Platform</span>
          </div>
          <div className="nav-links">
            <Link to="/" data-testid="nav-home"><Home size={18} /> Dashboard</Link>
            <Link to="/upload" data-testid="nav-upload"><Upload size={18} /> Upload</Link>
            <Link to="/convert" data-testid="nav-convert"><FileText size={18} /> Convert</Link>
            <Link to="/reconcile" data-testid="nav-reconcile"><Settings size={18} /> Reconcile</Link>
            <Link to="/column-mappings" data-testid="nav-column-mappings"><Settings size={18} /> Column Mappings</Link>
            <Link to="/reports" data-testid="nav-reports"><BarChart3 size={18} /> Reports</Link>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<SeparateUploadPage />} />
            <Route path="/convert" element={<ConvertPage />} />
            <Route path="/reconcile" element={<ReconcilePage />} />
            <Route path="/column-mappings" element={<ColumnMappingsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;