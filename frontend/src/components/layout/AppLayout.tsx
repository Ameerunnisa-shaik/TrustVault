import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { UploadDocumentModal } from '../../pages/UploadDocumentModal';

export const AppLayout: React.FC = () => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar onOpenUpload={() => setIsUploadModalOpen(true)} />

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <Outlet context={{ openUploadModal: () => setIsUploadModalOpen(true) }} />
        </main>
      </div>

      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={() => {
          setIsUploadModalOpen(false);
          // Custom event or state reload
          window.dispatchEvent(new CustomEvent('trustvault_document_uploaded'));
        }}
      />
    </div>
  );
};
