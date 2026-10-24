import React, { useState, useRef } from 'react';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { UploadCloud, File, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadDocumentModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setDocName('');
    setIsUploading(false);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!docName) {
        // Strip extension for default title
        const base = selected.name.substring(0, selected.name.lastIndexOf('.')) || selected.name;
        setDocName(base);
      }
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please choose a file to upload');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (docName.trim()) {
        formData.append('name', docName.trim());
      }

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      resetState();
      onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || 'File upload failed. Ensure the format and size are supported.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Confidential Document"
      description="Files are safely stored in private storage outside the web root with generated UUIDs."
      maxWidth="md"
    >
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            file
              ? 'border-emerald-300 bg-emerald-50/40'
              : 'border-beige-300 hover:border-vault-accent bg-beige-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.docx,.xlsx"
          />

          {file ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-2" />
              <p className="text-sm font-semibold text-vault-text truncate max-w-xs">{file.name}</p>
              <p className="text-xs text-vault-muted mt-0.5">
                {(file.size / 1024).toFixed(1)} KB — Click to choose different file
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="w-10 h-10 text-vault-accent mb-2" />
              <p className="text-sm font-semibold text-vault-text">
                Click to select or drag and drop a file
              </p>
              <p className="text-xs text-vault-muted mt-1">
                PDF, TXT, DOCX, XLSX, JSON, CSV, PNG, JPG (Max 20MB)
              </p>
            </div>
          )}
        </div>

        {/* Document Title */}
        <div>
          <label className="block text-xs font-semibold text-vault-text uppercase tracking-wider mb-1.5">
            Document Display Title
          </label>
          <input
            type="text"
            required
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="e.g. Q4 Executive Strategy Memo"
            className="w-full px-3.5 py-2.5 bg-beige-50/60 border border-beige-300 rounded-xl text-sm text-vault-text placeholder-vault-muted/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-vault-accent focus:border-transparent transition-all"
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-beige-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-vault-muted hover:text-vault-text rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || isUploading}
            className="px-5 py-2 bg-vault-accent hover:bg-vault-accentHover text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Encrypting & Storing...</span>
              </>
            ) : (
              <span>Upload Document</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
