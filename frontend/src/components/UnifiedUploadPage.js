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

const UnifiedUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [editingFileId, setEditingFileId] = useState(null);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get(`${API}/uploads`);
      setFiles(response.data.uploads || []);
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

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInput = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFiles(e.target.files);
    }
  };

  const uploadFiles = async (fileList) => {
    if (files.length + fileList.length > 25) {
      toast.error('Maximum 25 files allowed per session');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    
    // Show which files are being uploaded
    const fileNames = Array.from(fileList).map(f => f.name).join(', ');
    toast.info(`Uploading ${fileList.length} file(s)...`);
    
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    try {
      const response = await axios.post(`${API}/upload-files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Show success with details
      const uploadedFiles = response.data.uploaded_files || [];
      toast.success(`✓ Successfully uploaded ${response.data.count} file(s)!`, {
        duration: 3000
      });
      
      // Refresh file list
      await fetchFiles();
      
      // Clear file input
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRename = async (fileId) => {
    if (!newFileName.trim()) {
      toast.error('Please enter a valid filename');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('new_filename', newFileName);
      
      await axios.put(`${API}/file/${fileId}/rename`, formData);
      toast.success('File renamed successfully');
      setEditingFileId(null);
      setNewFileName('');
      fetchFiles();
    } catch (error) {
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
      fetchFiles();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileTypeIcon = (tag) => {
    const Icon = FILE_TYPE_ICONS[tag] || FileIcon;
    return Icon;
  };

  const pdfFiles = files.filter(f => f.file_type_tag === 'PDF' || f.file_type === 'pdf');
  const dataFiles = files.filter(f => ['Excel', 'CSV'].includes(f.file_type_tag) || ['excel', 'csv'].includes(f.file_type));

  return (
    <div className="page-container" data-testid="unified-upload-page">
      <h1 className="page-title">Upload Files</h1>

      {/* Upload Area */}
      <Card className="upload-zone-card">
        <div
          className={`upload-drop-zone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-testid="drop-zone"
        >
          <Upload size={48} className="upload-zone-icon" />
          <h3>Drag & drop files here</h3>
          <p>or</p>
          <Button onClick={() => document.getElementById('file-input').click()} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Browse Files'}
          </Button>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            data-testid="file-input"
          />
          <p className="upload-hint">Supported: PDF, Excel (.xlsx, .xls), CSV</p>
          <p className="upload-hint">Maximum 25 files per session</p>
        </div>
      </Card>

      {/* Info Banners */}
      {files.length > 0 && pdfFiles.length === 0 && (
        <div className="info-banner">
          <FileText size={20} />
          <span>You need at least one PDF to use the Convert feature.</span>
        </div>
      )}

      {files.length > 0 && dataFiles.length === 0 && (
        <div className="info-banner">
          <Table size={20} />
          <span>Upload Excel or CSV files to perform reconciliation.</span>
        </div>
      )}

      {/* Files List */}
      {files.length === 0 ? (
        <div className="empty-state">
          <FileIcon size={64} />
          <h3>No files uploaded yet</h3>
          <p>Upload PDF files for conversion or Excel/CSV files for reconciliation</p>
          <div className="sample-formats">
            <h4>Sample Format Guidance:</h4>
            <ul>
              <li><strong>PDF:</strong> Any document you want to convert to Excel</li>
              <li><strong>Excel:</strong> Data files with structured tables</li>
              <li><strong>CSV:</strong> Comma-separated values with headers</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="files-grid">
          <h3>Uploaded Files ({files.length}/25)</h3>
          {files.map((file) => {
            const Icon = getFileTypeIcon(file.file_type_tag || (file.file_type === 'pdf' ? 'PDF' : file.file_type === 'excel' ? 'Excel' : 'CSV'));
            const typeTag = file.file_type_tag || (file.file_type === 'pdf' ? 'PDF' : file.file_type === 'excel' ? 'Excel' : 'CSV');
            const scanStatus = file.scan_status || 'passed';

            return (
              <Card key={file.id} className="file-card" data-testid={`file-${file.id}`}>
                <div className="file-icon" style={{ color: FILE_TYPE_COLORS[typeTag] }}>
                  <Icon size={32} />
                </div>
                
                <div className="file-info">
                  {editingFileId === file.id ? (
                    <div className="file-rename">
                      <Input
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        placeholder="New filename"
                        data-testid="rename-input"
                      />
                      <div className="rename-actions">
                        <Button size="sm" onClick={() => handleRename(file.id)} data-testid="save-rename-btn">
                          <Check size={16} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingFileId(null); setNewFileName(''); }} data-testid="cancel-rename-btn">
                          <X size={16} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <h4 className="file-name">{file.filename}</h4>
                  )}
                  
                  <div className="file-meta">
                    <span className="file-tag" style={{ background: FILE_TYPE_COLORS[typeTag] + '20', color: FILE_TYPE_COLORS[typeTag] }}>
                      {typeTag}
                    </span>
                    <span className={`scan-badge ${scanStatus}`}>
                      {scanStatus === 'passed' ? '✓ Scanned' : '✗ Scan Failed'}
                    </span>
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>
                      <Clock size={14} />
                      {new Date(file.uploaded_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="file-actions">
                  <Button size="sm" variant="outline" onClick={() => { setEditingFileId(file.id); setNewFileName(file.filename); }} data-testid="rename-btn">
                    <Edit2 size={16} />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(file.id)} data-testid="delete-btn">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UnifiedUploadPage;
