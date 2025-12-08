import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Upload, Download, Trash2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ColumnMappingsPage = () => {
  const [clientFiles, setClientFiles] = useState([]);
  const [icyteFiles, setIcyteFiles] = useState([]);
  const [selectedClientFile, setSelectedClientFile] = useState('');
  const [selectedIcyteFile, setSelectedIcyteFile] = useState('');
  const [clientSheets, setClientSheets] = useState({});
  const [icyteSheets, setIcyteSheets] = useState({});
  const [selectedClientSheet, setSelectedClientSheet] = useState('');
  const [selectedIcyteSheet, setSelectedIcyteSheet] = useState('');
  const [mappings, setMappings] = useState([]);
  const [unmatchedColumns, setUnmatchedColumns] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    if (selectedClientFile) {
      fetchSheets(selectedClientFile, 'client');
    }
  }, [selectedClientFile]);

  useEffect(() => {
    if (selectedIcyteFile) {
      fetchSheets(selectedIcyteFile, 'icyte');
    }
  }, [selectedIcyteFile]);

  const fetchFiles = async () => {
    try {
      // Fetch conversions and client uploads
      const conversionsRes = await axios.get(`${API}/conversions`);
      const clientUploadsRes = await axios.get(`${API}/uploads?file_source=Client`);
      
      const clientDataFiles = (clientUploadsRes.data.uploads || []).filter(u => 
        u.file_type === 'excel' || u.file_type === 'csv'
      );
      
      setClientFiles([...(conversionsRes.data.conversions || []), ...clientDataFiles]);

      // Fetch ICyte uploads
      const icyteUploadsRes = await axios.get(`${API}/uploads?file_source=ICyte`);
      setIcyteFiles(icyteUploadsRes.data.uploads || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to fetch files');
    }
  };

  const fetchSheets = async (fileId, type) => {
    try {
      const response = await axios.get(`${API}/excel-sheets/${fileId}`);
      if (type === 'client') {
        setClientSheets(response.data.sheets || {});
      } else {
        setIcyteSheets(response.data.sheets || {});
      }
    } catch (error) {
      console.error('Error fetching sheets:', error);
    }
  };

  const addMapping = () => {
    setMappings([
      ...mappings,
      {
        id: Date.now(),
        clientExpression: [{ column: '', operation: null }],
        icyteColumn: '',
        label: ''
      }
    ]);
  };

  const addExpressionStep = (mappingId) => {
    setMappings(mappings.map(m => {
      if (m.id === mappingId) {
        return {
          ...m,
          clientExpression: [...m.clientExpression, { column: '', operation: null }]
        };
      }
      return m;
    }));
  };

  const updateExpressionStep = (mappingId, stepIndex, field, value) => {
    setMappings(mappings.map(m => {
      if (m.id === mappingId) {
        const newExpression = [...m.clientExpression];
        newExpression[stepIndex][field] = value;
        return { ...m, clientExpression: newExpression };
      }
      return m;
    }));
  };

  const updateMapping = (mappingId, field, value) => {
    setMappings(mappings.map(m => {
      if (m.id === mappingId) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  const removeMapping = (mappingId) => {
    setMappings(mappings.filter(m => m.id !== mappingId));
  };

  const getExpressionPreview = (expression) => {
    if (!expression || expression.length === 0) return 'No columns selected';
    
    let preview = '';
    expression.forEach((step, idx) => {
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

  const validateMappings = () => {
    const errors = [];
    
    mappings.forEach((mapping, idx) => {
      // Check if at least one client column is selected
      const hasClientColumn = mapping.clientExpression.some(step => step.column);
      if (!hasClientColumn) {
        errors.push(`Mapping ${idx + 1}: No client column selected`);
      }

      // Check for dangling operations
      mapping.clientExpression.forEach((step, stepIdx) => {
        if (stepIdx > 0 && step.operation && !step.column) {
          errors.push(`Mapping ${idx + 1}: Operation selected but no following column`);
        }
      });

      // Check if ICyte column is selected
      if (!mapping.icyteColumn) {
        errors.push(`Mapping ${idx + 1}: No ICyte column selected`);
      }
    });

    return errors;
  };

  const handleSave = async () => {
    const errors = validateMappings();
    
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    try {
      await axios.post(`${API}/save-column-mappings`, {
        client_file_id: selectedClientFile,
        icyte_file_id: selectedIcyteFile,
        client_sheet: selectedClientSheet,
        icyte_sheet: selectedIcyteSheet,
        mappings: mappings
      });
      
      toast.success('✓ Mappings saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save mappings');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!selectedClientSheet || !selectedIcyteSheet) {
      toast.error('Please select both client and ICyte sheets first');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('client_columns', JSON.stringify(clientSheets[selectedClientSheet] || []));
    formData.append('icyte_columns', JSON.stringify(icyteSheets[selectedIcyteSheet] || []));

    try {
      const response = await axios.post(`${API}/upload-column-mappings`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Add matched mappings
      const matchedMappings = response.data.matched_mappings || [];
      setMappings([...mappings, ...matchedMappings.map((m, idx) => ({
        id: Date.now() + idx,
        ...m
      }))]);

      // Show unmatched columns
      setUnmatchedColumns(response.data.unmatched_columns || []);

      if (matchedMappings.length > 0) {
        toast.success(`✓ ${matchedMappings.length} mappings imported successfully`);
      }

      if (response.data.unmatched_columns?.length > 0) {
        toast.warning(`⚠ ${response.data.unmatched_columns.length} columns could not be matched`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload mappings file');
    }
  };

  const downloadTemplate = () => {
    const template = `ClientExpression,ICyteColumn,Label
ColumnA + ColumnB,ICyte_Total,Sum Example
ColumnC - ColumnD,ICyte_Difference,Subtraction Example
ColumnE * ColumnF,ICyte_Product,Multiplication Example
ColumnG / ColumnH,ICyte_Ratio,Division Example`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'column_mappings_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('✓ Template downloaded');
  };

  const clientColumns = selectedClientSheet ? (clientSheets[selectedClientSheet] || []) : [];
  const icyteColumns = selectedIcyteSheet ? (icyteSheets[selectedIcyteSheet] || []) : [];

  return (
    <div className="page-container column-mappings-page">
      <h1 className="page-title">Column Mappings</h1>
      <p className="page-subtitle">Create and manage mappings between Client and ICyte columns</p>

      {/* File Selection */}
      <Card className="file-selection-card">
        <h3>Select Data Sources</h3>
        <div className="file-selection-grid">
          <div>
            <label>Client File</label>
            <Select value={selectedClientFile} onValueChange={setSelectedClientFile}>
              <SelectTrigger>
                <SelectValue placeholder="Select client file" />
              </SelectTrigger>
              <SelectContent>
                {clientFiles.map((file) => (
                  <SelectItem key={file.id} value={file.id}>
                    {file.filename || `Conversion ${file.id.substring(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label>Client Sheet</label>
            <Select value={selectedClientSheet} onValueChange={setSelectedClientSheet}>
              <SelectTrigger>
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
          </div>

          <div>
            <label>ICyte File</label>
            <Select value={selectedIcyteFile} onValueChange={setSelectedIcyteFile}>
              <SelectTrigger>
                <SelectValue placeholder="Select ICyte file" />
              </SelectTrigger>
              <SelectContent>
                {icyteFiles.map((file) => (
                  <SelectItem key={file.id} value={file.id}>
                    {file.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label>ICyte Sheet</label>
            <Select value={selectedIcyteSheet} onValueChange={setSelectedIcyteSheet}>
              <SelectTrigger>
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
          </div>
        </div>
      </Card>

      {/* Upload Section */}
      {selectedClientSheet && selectedIcyteSheet && (
        <Card className="upload-section-card">
          <h3>Upload Mappings</h3>
          <div className="upload-controls">
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setUploadFile(e.target.files[0])}
              style={{ display: 'none' }}
              id="mapping-file-upload"
            />
            <label htmlFor="mapping-file-upload">
              <Button as="span">
                <Upload size={16} /> Choose File
              </Button>
            </label>
            {uploadFile && <span className="file-name">{uploadFile.name}</span>}
            <Button onClick={handleFileUpload} disabled={!uploadFile}>
              Upload Mapping
            </Button>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download size={16} /> Download Template
            </Button>
          </div>
        </Card>
      )}

      {/* Unmatched Columns */}
      {unmatchedColumns.length > 0 && (
        <Card className="unmatched-card">
          <div className="unmatched-header">
            <AlertCircle size={20} color="#F59E0B" />
            <h3>Unmatched Columns</h3>
          </div>
          <div className="unmatched-list">
            {unmatchedColumns.map((col, idx) => (
              <div key={idx} className="unmatched-item">
                <strong>{col.side}:</strong> {col.column}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mappings Section */}
      {selectedClientSheet && selectedIcyteSheet && (
        <>
          <div className="mappings-header">
            <h2>Column Mappings ({mappings.length})</h2>
            <div className="header-actions">
              <Button onClick={addMapping}>
                <Plus size={16} /> Add Mapping
              </Button>
              <Button onClick={handleSave} disabled={mappings.length === 0}>
                <Save size={16} /> Save Mappings
              </Button>
            </div>
          </div>

          {mappings.length === 0 ? (
            <Card className="empty-mappings">
              <p>No mappings created yet. Click "Add Mapping" to start.</p>
            </Card>
          ) : (
            <div className="mappings-list">
              {mappings.map((mapping, idx) => (
                <Card key={mapping.id} className="mapping-card-vertical">
                  <div className="mapping-card-header">
                    <h4>Mapping #{idx + 1}</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMapping(mapping.id)}
                      className="delete-btn"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  {/* Label */}
                  <div className="mapping-field">
                    <label>Mapping Label (Optional)</label>
                    <Input
                      value={mapping.label || ''}
                      onChange={(e) => updateMapping(mapping.id, 'label', e.target.value)}
                      placeholder="e.g., Total Amount, Net Price"
                    />
                  </div>

                  {/* Client Expression Builder */}
                  <div className="expression-section">
                    <h5>Client Expression</h5>
                    <div className="expression-preview">
                      {getExpressionPreview(mapping.clientExpression)}
                    </div>
                    
                    <div className="expression-builder-vertical">
                      {mapping.clientExpression.map((step, stepIdx) => (
                        <div key={stepIdx} className="expression-step-vertical">
                          {stepIdx > 0 && (
                            <div className="operation-field-vertical">
                              <label>Operation</label>
                              <Select
                                value={step.operation || ''}
                                onValueChange={(val) => updateExpressionStep(mapping.id, stepIdx, 'operation', val)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select operation" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="add">+ Addition</SelectItem>
                                  <SelectItem value="subtract">- Subtraction</SelectItem>
                                  <SelectItem value="multiply">× Multiplication</SelectItem>
                                  <SelectItem value="divide">÷ Division</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <div className="column-field-vertical">
                            <label>Client Column {stepIdx + 1}</label>
                            <Select
                              value={step.column || ''}
                              onValueChange={(val) => {
                                updateExpressionStep(mapping.id, stepIdx, 'column', val);
                                // Auto-add next step if this is the last one and has a column
                                if (stepIdx === mapping.clientExpression.length - 1 && val) {
                                  addExpressionStep(mapping.id);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {clientColumns.map((col) => (
                                  <SelectItem key={col} value={col}>
                                    {col}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ICyte Column */}
                  <div className="icyte-section">
                    <h5>Maps To</h5>
                    <div className="mapping-field">
                      <label>ICyte Column</label>
                      <Select
                        value={mapping.icyteColumn || ''}
                        onValueChange={(val) => updateMapping(mapping.id, 'icyteColumn', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select ICyte column" />
                        </SelectTrigger>
                        <SelectContent>
                          {icyteColumns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ColumnMappingsPage;
