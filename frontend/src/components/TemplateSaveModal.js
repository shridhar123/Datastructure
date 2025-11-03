import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

const TemplateSaveModal = ({ isOpen, onClose, onSave, mappings }) => {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    onSave(templateName, description);
    setTemplateName('');
    setDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" data-testid="template-save-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Save Mapping Template</h3>
          <button className="modal-close" onClick={onClose} data-testid="close-modal-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body">
          <div className="form-group">
            <label>Template Name *</label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Standard AMP Reconciliation"
              data-testid="template-name-input"
            />
          </div>
          
          <div className="form-group">
            <label>Description (Optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
          <Button variant="outline" onClick={onClose} data-testid="cancel-save-btn">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="save-template-btn">
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSaveModal;
