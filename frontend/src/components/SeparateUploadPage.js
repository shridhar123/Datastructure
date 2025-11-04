import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Upload, FileText, Table, File as FileIcon, Trash2, Edit2, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FILE_TYPE_ICONS = {
  PDF: FileText,
  Excel: Table,
  CSV: FileIcon
};

const FILE_TYPE_COLORS = {
  PDF: '#FF6B6B',
  Excel: '#51CF66',
  CSV: '#339AF0'
};

const SeparateUploadPage = () => {
  const [activeTab, setActiveTab] = useState('Client');
  const [clientFiles, setClientFiles] = useState([]);
  const [icyteFiles, setIcyteFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingFileId, setEditingFileId] = useState(null);
  const [newFileName, setNewFileName] = useState('');
  const [recentlyUploadedIds, setRecentlyUploadedIds] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      // Fetch Client files
      const clientResponse = await axios.get(`${API}/uploads?file_source=Client`);
      setClientFiles(clientResponse.data.uploads || []);

      // Fetch ICyte files
      const icyteResponse = await axios.get(`${API}/uploads?file_source=ICyte`);
      setIcyteFiles(icyteResponse.data.uploads || []);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (fileList) => {
    const currentFiles = activeTab === 'Client' ? clientFiles : icyteFiles;
    
    if (currentFiles.length + fileList.length > 25) {
      toast.error('Maximum 25 files allowed per source');
      return;
    }

    // Validate file types for ICyte
    if (activeTab === 'ICyte') {
      const hasPdf = Array.from(fileList).some(f => f.name.toLowerCase().endsWith('.pdf'));
      if (hasPdf) {
        toast.error('ICyte uploads only support Excel and CSV files');
        return;
      }
    }

    setUploading(true);
    const formData = new FormData();
    
    toast.info(`Uploading ${fileList.length} file(s) to ${activeTab}...`);
    
    // Add file_source as form data
    formData.append('file_source', activeTab);
    
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    try {
      const response = await axios.post(`${API}/upload-files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const uploadedFiles = response.data.uploaded_files || [];
      const uploadedIds = uploadedFiles.map(f => f.id);
      
      toast.success(`✓ Successfully uploaded ${response.data.count} file(s) to ${activeTab}!`, {
        duration: 3000
      });
      
      // Mark newly uploaded files
      setRecentlyUploadedIds(uploadedIds);
      setTimeout(() => setRecentlyUploadedIds([]), 5000);
      
      await fetchFiles();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (fileId) => {
    if (!newFileName.trim()) {
      toast.error('Filename cannot be empty');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('new_filename', newFileName.trim());

      await axios.put(`${API}/file/${fileId}/rename`, formData);
      toast.success('File renamed successfully');
      setEditingFileId(null);
      setNewFileName('');
      await fetchFiles();
    } catch (error) {
      console.error('Rename error:', error);
      toast.error('Failed to rename file');
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await axios.delete(`${API}/file/${fileId}`);
      toast.success('File deleted successfully');
      await fetchFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentFiles = activeTab === 'Client' ? clientFiles : icyteFiles;
  const acceptedFormats = activeTab === 'Client' 
    ? '.pdf,.xlsx,.xls,.csv' 
    : '.xlsx,.xls,.csv';

  return (
    <div className="upload-page-container" data-testid="separate-upload-page">
      <div className="page-header">
        <h1 className="page-title">Upload Files</h1>
        <p className="page-subtitle">Upload files separately for Client and ICyte sources</p>
      </div>

      {/* Tab Navigation */}
      <div className="upload-tabs">
        <button
          className={`upload-tab ${activeTab === 'Client' ? 'active' : ''}`}
          onClick={() => setActiveTab('Client')}
          data-testid="client-tab"
        >
          <Upload size={18} />
          Client Files
          <span className="file-count">{clientFiles.length}</span>
        </button>
        <button
          className={`upload-tab ${activeTab === 'ICyte' ? 'active' : ''}`}
          onClick={() => setActiveTab('ICyte')}
          data-testid="icyte-tab"
        >
          <Table size={18} />
          ICyte Files
          <span className="file-count">{icyteFiles.length}</span>
        </button>
      </div>

      {/* Upload Area */}
      <Card className="upload-card">
        <div
          className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-testid="drop-zone"
        >
          <Upload className="drop-icon" size={48} />
          <h3>Drag & Drop {activeTab} Files</h3>
          <p className="drop-text">
            {activeTab === 'Client' 
              ? 'Supports PDF, Excel, and CSV files' 
              : 'Supports Excel and CSV files only'}
          </p>
          <p className="drop-subtext">or</p>
          <Button 
            className="browse-btn" 
            disabled={uploading}
            data-testid="browse-button"
            onClick={() => document.getElementById('file-input').click()}
          >
            {uploading ? 'Uploading...' : 'Browse Files'}
          </Button>
          <input
            id="file-input"
            type="file"
            multiple
            accept={acceptedFormats}
            onChange={handleFileInput}
            style={{ display: 'none' }}
            disabled={uploading}
            data-testid="file-input"
          />
          <p className="file-limit">Maximum 25 files per source</p>
        </div>
      </Card>

      {/* File List */}
      <div className="files-section">
        <div className="section-header">
          <h2>{activeTab} Files ({currentFiles.length})</h2>
        </div>

        {currentFiles.length === 0 ? (
          <Card className="empty-state">
            <FileIcon size={48} className="empty-icon" />
            <p>No {activeTab.toLowerCase()} files uploaded yet</p>
            <p className="empty-subtext">Upload files to get started</p>
          </Card>
        ) : (
          <div className="files-grid">
            {currentFiles.map((file) => {
              const Icon = FILE_TYPE_ICONS[file.file_type_tag] || FileIcon;
              const isNew = recentlyUploadedIds.includes(file.id);
              const isEditing = editingFileId === file.id;

              return (
                <Card key={file.id} className={`file-card ${isNew ? 'new-file' : ''}`}>
                  {isNew && <span className="new-badge">NEW</span>}
                  
                  <div className="file-header">
                    <div 
                      className="file-type-badge" 
                      style={{ backgroundColor: FILE_TYPE_COLORS[file.file_type_tag] }}
                    >
                      <Icon size={16} />
                      {file.file_type_tag}
                    </div>
                    <div className="scan-status">
                      {file.scan_status === 'passed' ? (
                        <span className="scan-passed">
                          <Check size={14} /> Scanned
                        </span>
                      ) : (
                        <span className="scan-failed">
                          <X size={14} /> Failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="file-info">
                    {isEditing ? (
                      <div className="edit-filename">
                        <Input
                          value={newFileName}
                          onChange={(e) => setNewFileName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRename(file.id)}
                          placeholder="Enter new filename"
                          autoFocus
                          data-testid="rename-input"
                        />
                        <div className="edit-actions">
                          <Button 
                            size="sm" 
                            onClick={() => handleRename(file.id)}
                            data-testid="save-rename-btn"
                          >
                            <Check size={14} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => {
                              setEditingFileId(null);
                              setNewFileName('');
                            }}
                            data-testid="cancel-rename-btn"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <h4 className="file-name">{file.filename}</h4>
                    )}
                    
                    <div className="file-meta">
                      <span className="file-size">{formatFileSize(file.file_size)}</span>
                      <span className="file-date">
                        <Clock size={12} /> {formatDate(file.uploaded_at)}
                      </span>
                    </div>
                  </div>

                  <div className="file-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingFileId(file.id);
                        setNewFileName(file.filename);
                      }}
                      data-testid={`rename-btn-${file.id}`}
                    >
                      <Edit2 size={14} /> Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="delete-btn"
                      onClick={() => handleDelete(file.id)}
                      data-testid={`delete-btn-${file.id}`}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SeparateUploadPage;
