import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Upload, FileText, Settings, BarChart3, Home, ArrowRight, Download, FileSpreadsheet, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

  const handleDownload = async (fileId) => {
    console.log('Download clicked for file ID:', fileId);
    toast.info('Starting download...');
    
    try {
      console.log('Making request to:', `${API}/download-excel/${fileId}`);
      const response = await axios.get(`${API}/download-excel/${fileId}`, {
        responseType: 'blob'
      });
      
      console.log('Response received:', response.status, response.headers);
      
      // Create blob with proper mime type
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      console.log('Blob created, size:', blob.size);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `converted_${fileId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      
      console.log('Download triggered');
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 100);
      
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      console.error('Error details:', error.response);
      toast.error(`Failed to download file: ${error.message}`);
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
                  <p className="conversion-status">{conversion.status}</p>
                  <p className="conversion-date">{new Date(conversion.created_at).toLocaleString()}</p>
                </div>
                <Button onClick={() => handleDownload(conversion.id)} size="sm" data-testid={`download-btn-${conversion.id}`}>
                  <Download size={16} /> Download
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ReconcilePage = () => {
  const [conversions, setConversions] = useState([]);
  const [uploads, setUploads] = useState([]);
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

  useEffect(() => {
    fetchConversions();
    fetchUploads();
    fetchTemplates();
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
      const response = await axios.get(`${API}/uploads`);
      const excelUploads = response.data.uploads.filter(u => u.file_type === 'excel');
      setUploads(excelUploads);
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
    if (!templateId) {
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
    setMappings([...mappings, { client_column: '', icyte_column: '', operation: '' }]);
  };

  const updateMapping = (index, field, value) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);
  };

  const removeMapping = (index) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleReconcile = async () => {
    if (!clientFileId || !icyteFileId || !clientSheet || !icyteSheet || !clientUniqueKey || !icyteUniqueKey || mappings.length === 0) {
      toast.error('Please complete all configuration fields including unique keys');
      return;
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
        mappings: mappings
      });

      // Perform reconciliation
      const reconcileResponse = await axios.post(`${API}/perform-reconciliation/${configResponse.data.id}`);
      toast.success('Reconciliation completed!');
      window.location.href = '/reports';
    } catch (error) {
      toast.error('Failed to perform reconciliation');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-container" data-testid="reconcile-page">
      <h1 className="page-title">Configure Reconciliation</h1>

      <Card className="reconcile-card">
        <div className="reconcile-section">
          <h3>Client File (Converted Excel)</h3>
          <Select value={clientFileId} onValueChange={setClientFileId}>
            <SelectTrigger data-testid="client-file-select">
              <SelectValue placeholder="Select client file" />
            </SelectTrigger>
            <SelectContent>
              {conversions.map((conv) => (
                <SelectItem key={conv.id} value={conv.id}>
                  Conversion {conv.id.substring(0, 8)}
                </SelectItem>
              ))}
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
          <h3>ICyte Report (Excel)</h3>
          <Select value={icyteFileId} onValueChange={setIcyteFileId}>
            <SelectTrigger data-testid="icyte-file-select">
              <SelectValue placeholder="Select ICyte report" />
            </SelectTrigger>
            <SelectContent>
              {uploads.map((upload) => (
                <SelectItem key={upload.id} value={upload.id}>
                  {upload.filename}
                </SelectItem>
              ))}
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

        <div className="mappings-section">
          <div className="mappings-header">
            <h3>Column Mappings</h3>
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
              <Select value={selectedTemplateId} onValueChange={(val) => { setSelectedTemplateId(val); handleLoadTemplate(val); }}>
                <SelectTrigger style={{width: '250px'}} data-testid="template-select">
                  <SelectValue placeholder="Load Template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- No Template --</SelectItem>
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
            <Card key={index} className="mapping-item">
              <div className="mapping-fields">
                <div className="mapping-field">
                  <label>Client Column</label>
                  <Select value={mapping.client_column} onValueChange={(val) => updateMapping(index, 'client_column', val)}>
                    <SelectTrigger data-testid={`client-column-select-${index}`}>
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
                </div>

                <div className="mapping-field">
                  <label>ICyte Column</label>
                  <Select value={mapping.icyte_column} onValueChange={(val) => updateMapping(index, 'icyte_column', val)}>
                    <SelectTrigger data-testid={`icyte-column-select-${index}`}>
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
                </div>

                <div className="mapping-field">
                  <label>Operation (Optional)</label>
                  <Input
                    value={mapping.operation}
                    onChange={(e) => updateMapping(index, 'operation', e.target.value)}
                    placeholder="e.g., multiply:2"
                    data-testid={`operation-input-${index}`}
                  />
                </div>

                <Button variant="destructive" size="sm" onClick={() => removeMapping(index)} data-testid={`remove-mapping-btn-${index}`}>
                  <X size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <Button onClick={handleReconcile} disabled={processing} className="reconcile-btn" data-testid="perform-reconcile-btn">
          {processing ? 'Processing...' : 'Perform Reconciliation'}
        </Button>
      </Card>
    </div>
  );
};

const ReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

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
    try {
      const response = await axios.get(`${API}/download-reconciliation-report/${reportId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reconciliation_report_${reportId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        link.remove();
      }, 100);
      
      toast.success('Report downloaded!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
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
                  <Button size="sm" data-testid={`view-report-btn-${report.id}`}>View Details</Button>
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

          <Card className="exceptions-card">
            <h3>Exceptions & Variances</h3>
            {selectedReport.exceptions.length === 0 ? (
              <div className="no-exceptions">
                <Check size={48} />
                <p>All records matched successfully!</p>
              </div>
            ) : (
              <div className="exceptions-table">
                <table>
                  <thead>
                    <tr>
                      <th>Unique Key</th>
                      <th>Result</th>
                      <th>{selectedReport.column_headers?.client_header || 'Client Value'}</th>
                      <th>{selectedReport.column_headers?.icyte_header || 'ICyte Value'}</th>
                      <th>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.exceptions.map((exception, index) => (
                      <tr key={index}>
                        <td>{exception.unique_key || exception.row || 'N/A'}</td>
                        <td>
                          <span className={exception.result === 'Matched' ? 'result-badge matched' : 'result-badge unmatched'}>
                            {exception.result || (exception.status === 'Mismatch' ? 'Unmatched' : exception.status || 'Compared')}
                          </span>
                        </td>
                        <td>{exception.client_value || '-'}</td>
                        <td>{exception.icyte_value || '-'}</td>
                        <td><span className="variance-badge">{exception.variance || exception.details || 'mismatch'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
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
            <Link to="/reports" data-testid="nav-reports"><BarChart3 size={18} /> Reports</Link>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/convert" element={<ConvertPage />} />
            <Route path="/reconcile" element={<ReconcilePage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  );
}

export default App;